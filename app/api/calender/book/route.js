import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GetCandlenderCLient } from "@/lib/googleCalendar";

export async function POST(request) {
    try {
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

        const validRoles = ["Admin", "HHR", "recruiter"];
        if (!validRoles.includes(decodedUser.role)) {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }

        const body = await request.json();
        const {
            interviewer_email,
            interviewer_id,
            application_id,
            job_id,
            candidate_email,
            candidate_name,
            candidate_id,
            startTime,
            endTime,
            mode,
            send_to = "both",
        } = body;

        if (!interviewer_email || !interviewer_id || !application_id || !job_id || !candidate_email || !startTime || !endTime) {
            return NextResponse.json({
                error: "Missing required fields: interviewer_email, interviewer_id, application_id, job_id, candidate_email, startTime, and endTime"
            }, { status: 400 });
        }

        const applicationDoc = await adminDB.collection("applications").doc(application_id).get();
        if (!applicationDoc.exists) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const jobDoc = await adminDB.collection("jobs").doc(job_id).get();
        if (!jobDoc.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const jobData = jobDoc.data();
        const fieldName = mode === "Whm" ? "hm_id" : "hr_id";
        const startTimestamp = new Date(startTime);
        const existingInterview = await adminDB.collection("interviews")
            .where(fieldName, "==", interviewer_id)
            .where("start_time", "==", startTimestamp)
            .where("status", "in", ["scheduled", "confirmed"])
            .limit(1)
            .get();

        if (!existingInterview.empty) {
            return NextResponse.json({
                error: "This slot is no longer available"
            }, { status: 409 });
        }

        const calendar = await GetCandlenderCLient();
        let googleEventId = null;
        let finalMeetingLink = null;
        let calendarSuccess = false;

        try {
            const interviewerType = mode === "Whm" ? "Hiring Manager" : "HR";
            const event = {
                summary: `Interview: ${candidate_name || candidate_email} - ${jobData.title || 'Position'}`,
                description: `
Interview With: ${interviewerType} (${interviewer_email})
Job Position: ${jobData.title}
Company: ${jobData.company || 'N/A'}
Candidate: ${candidate_name || candidate_email} (${candidate_email})
Application ID: ${application_id}

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
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'email', minutes: 60 },
                        { method: 'popup', minutes: 15 },
                    ],
                },
            };

            const calendarId = "b572b11b331778a1264c46b2d1d5becd3f11352fa6742914aaffdaa2a4f85b56@group.calendar.google.com";

            const calendarResponse = await calendar.events.insert({
                calendarId: calendarId,
                requestBody: event,
                sendUpdates: "none",
            });

            googleEventId = calendarResponse.data.id;
            console.log("Event created:", calendarResponse.data.htmlLink);
            calendarSuccess = true;

        } catch (calendarError) {
            console.error("Google Calendar error:", calendarError);
        }

        const interviewData = {
            job_id,
            application_id,
            candidate_id: candidate_id || null,
            candidate_email,
            candidate_name: candidate_name || candidate_email.split('@')[0],
            started_at: startTimestamp,
            ended_at: new Date(endTime),
            scheduled_at: startTimestamp,
            mode: mode,
            meeting_link: finalMeetingLink,
            google_event_id: googleEventId,
            status: "scheduled",
            send_notification_to: send_to,
            created_by: decodedUser.uid,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
            [fieldName]: interviewer_id,
            [`${mode === 'Whm' ? 'hm' : 'hr'}_email`]: interviewer_email
        };

        const docRef = await adminDB.collection("interviews").add(interviewData);

        const applicationData = applicationDoc.data();
        await adminDB.collection("applications").doc(application_id).update({
            status: "interview_scheduled",
            interviews_list: [...(applicationData.interviews_list || []), docRef.id],
            updated_at: FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: `Interview scheduled successfully. ${calendarSuccess ? "A Google Calendar event was created without a meeting link." : "Failed to create a Google Calendar event, but the interview is booked in the database."}`,
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