
// app/api/interviews/slots/book/route.js
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GetCandlenderCLient } from "@/lib/googleCalendar";

export async function POST(request) {
    try {
        // Authentication check
        const session = await request.cookies.get("session")?.value;
        if (!session) {
            return NextResponse.json({ error: "No session found" }, { status: 400 });
        }

        let decodedUser;
        try {
            const decodedToken = await getAuth().verifySessionCookie(session, true);
            const userDoc = await adminDB.collection("users").doc(decodedToken.uid).get();

            if (!userDoc.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            decodedUser = { uid: decodedToken.uid, ...userDoc.data() };
        } catch (err) {
            console.error("Auth error:", err);
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        const validRoles = ["Admin", "HHR", "HR", "HM", "recruiter"];
        if (!validRoles.includes(decodedUser.role)) {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }

        const body = await request.json();
        const {
            interviewer_email,
            interviewer_id,
            type,
            application_id,
            job_id,
            candidate_email,
            candidate_name,
            candidate_id,
            startTime,
            endTime,
            interview_type,
            mode,
            meeting_link,
            notes,
            send_to = "both" // "hr", "candidate", or "both"
        } = body;

        // Validate required fields
        if (!interviewer_email || !application_id || !job_id || !candidate_email || !startTime || !endTime) {
            return NextResponse.json({
                error: "Missing required fields"
            }, { status: 400 });
        }

        // Check if application exists
        const applicationDoc = await adminDB.collection("applications").doc(application_id).get();
        if (!applicationDoc.exists) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Check if job exists
        const jobDoc = await adminDB.collection("jobs").doc(job_id).get();
        if (!jobDoc.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const jobData = jobDoc.data();

        // Check if slot is still available
        const fieldName = type === "Whm" ? "hm_id" : "hr_id";
        const existingInterview = await adminDB.collection("interviews")
            .where(fieldName, "==", interviewer_id)
            .where("start_time", "==", startTime)
            .where("status", "in", ["scheduled", "confirmed"])
            .limit(1)
            .get();

        if (!existingInterview.empty) {
            return NextResponse.json({
                error: "This slot is no longer available"
            }, { status: 409 });
        }

        // Get Google Calendar client
        const calendar = await GetCandlenderCLient();

        // Create Google Calendar event
        let googleEventId = null;
        let finalMeetingLink = meeting_link;

        try {
            const interviewerType = type === "Whm" ? "Hiring Manager" : "HR";
            const event = {
                summary: `${interview_type || 'Interview'}: ${candidate_name || candidate_email} - ${jobData.title || 'Position'}`,
                description: `
Interview Type: ${interview_type || 'General'}
Interview With: ${interviewerType} (${interviewer_email})
Mode: ${mode || 'Online'}
Job Position: ${jobData.title}
Company: ${jobData.company || 'N/A'}
Candidate: ${candidate_name} (${candidate_email})
Application ID: ${application_id}
${notes ? `\nNotes: ${notes}` : ''}

This interview is scheduled as part of the recruitment process.
        `.trim(),
                start: {
                    dateTime: startTime,
                    timeZone: "Asia/Kolkata",
                },
                end: {
                    dateTime: endTime,
                    timeZone: "Asia/Kolkata",
                },
                attendees: [
                    {
                        email: candidate_email,
                        displayName: candidate_name || candidate_email.split('@')[0],
                        responseStatus: 'needsAction'
                    },
                    {
                        email: interviewer_email,
                        displayName: `${interviewerType}`,
                        responseStatus: 'accepted',
                        organizer: true
                    }
                ],
                conferenceData: !meeting_link ? {
                    createRequest: {
                        requestId: `interview-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                } : undefined,
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 1 day before
                        { method: 'email', minutes: 60 },      // 1 hour before
                        { method: 'popup', minutes: 15 },      // 15 minutes before
                    ],
                },
            };

            // Add meeting link to description if provided
            if (meeting_link) {
                event.description += `\n\nMeeting Link: ${meeting_link}`;
                event.location = meeting_link;
            }

            const calendarId = "b572b11b331778a1264c46b2d1d5becd3f11352fa6742914aaffdaa2a4f85b56@group.calendar.google.com";

            const calendarResponse = await calendar.events.insert({
                calendarId: calendarId,
                requestBody: event,
                conferenceDataVersion: meeting_link ? 0 : 1,
                sendUpdates: send_to === "both" ? "all" : (send_to === "candidate" ? "externalOnly" : "none")
            });

            googleEventId = calendarResponse.data.id;

            // Use Google Meet link if no custom meeting link provided
            if (!meeting_link && calendarResponse.data.hangoutLink) {
                finalMeetingLink = calendarResponse.data.hangoutLink;
            }

            console.log("Event created:", calendarResponse.data.htmlLink);

        } catch (calendarError) {
            console.error("Google Calendar error:", calendarError);
            // Continue without Google Calendar if it fails
        }

        // Create interview document in Firebase
        const interviewData = {
            job_id,
            application_id,
            candidate_id: candidate_id || null,
            candidate_email,
            candidate_name: candidate_name || candidate_email.split('@')[0],
            start_time: startTime,
            end_time: endTime,
            interview_date: startTime.split('T')[0],
            mode: mode || "Online",
            interview_type: interview_type || ["General"],
            meeting_link: finalMeetingLink,
            google_event_id: googleEventId,
            status: "scheduled",
            notes: notes || null,
            type: type, // WHR or WHM
            send_notification_to: send_to,
            created_by: decodedUser.uid,
            created_by_email: decodedUser.email,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        };

        // Add interviewer details based on type
        if (type === "Whm") {
            interviewData.hm_id = interviewer_id;
            interviewData.hm_email = interviewer_email;
        } else {
            interviewData.hr_id = interviewer_id;
            interviewData.hr_email = interviewer_email;
        }

        const docRef = await adminDB.collection("interviews").add(interviewData);

        // Update application status and add interview to list
        const applicationData = applicationDoc.data();
        await adminDB.collection("applications").doc(application_id).update({
            status: "interview_scheduled",
            interviews_list: [...(applicationData.interviews_list || []), docRef.id],
            updated_at: FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: `Interview scheduled successfully. ${send_to === "both" ? "Invitations sent to HR and candidate" : send_to === "candidate" ? "Invitation sent to candidate" : "Invitation sent to HR"}`,
            interview_id: docRef.id,
            google_event_id: googleEventId,
            meeting_link: finalMeetingLink,
            details: {
                ...interviewData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        }, { status: 201 });

    } catch (error) {
        console.error("[interviews.slots.book] Error:", error);
        return NextResponse.json({
            error: "Failed to book interview slot",
            details: error.message
        }, { status: 500 });
    }
}

