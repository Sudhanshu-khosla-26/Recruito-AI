// app/api/interviews/slots/reschedule/[interviewId]/route.js
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GetCandlenderCLient } from "@/lib/googleCalendar";

export async function PUT(request, { params }) {
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

        const { interviewId } = params;
        const body = await request.json();
        const { startTime, endTime, reason } = body;

        if (!startTime || !endTime) {
            return NextResponse.json({
                error: "New start time and end time are required"
            }, { status: 400 });
        }

        // Get existing interview
        const interviewDoc = await adminDB.collection("interviews").doc(interviewId).get();

        if (!interviewDoc.exists) {
            return NextResponse.json({ error: "Interview not found" }, { status: 404 });
        }

        const interviewData = interviewDoc.data();

        // Update Google Calendar event if exists
        if (interviewData.google_event_id) {
            try {
                const calendar = await GetCandlenderCLient();
                const calendarId = "b572b11b331778a1264c46b2d1d5becd3f11352fa6742914aaffdaa2a4f85b56@group.calendar.google.com";

                // Get the existing event
                const existingEvent = await calendar.events.get({
                    calendarId: calendarId,
                    eventId: interviewData.google_event_id
                });

                // Update the event with new times
                const updatedEvent = {
                    ...existingEvent.data,
                    start: {
                        dateTime: startTime,
                        timeZone: "Asia/Kolkata",
                    },
                    end: {
                        dateTime: endTime,
                        timeZone: "Asia/Kolkata",
                    },
                    description: existingEvent.data.description + `\n\nRescheduled on: ${new Date().toLocaleString()}\nReason: ${reason || 'Not specified'}`
                };

                await calendar.events.update({
                    calendarId: calendarId,
                    eventId: interviewData.google_event_id,
                    requestBody: updatedEvent,
                    sendUpdates: 'all'
                });

                console.log("Calendar event rescheduled:", interviewData.google_event_id);
            } catch (calendarError) {
                console.error("Google Calendar update error:", calendarError);
                return NextResponse.json({
                    error: "Failed to update calendar event",
                    details: calendarError.message
                }, { status: 500 });
            }
        }

        // Update interview in Firebase
        await adminDB.collection("interviews").doc(interviewId).update({
            start_time: startTime,
            end_time: endTime,
            interview_date: startTime.split('T')[0],
            status: "rescheduled",
            rescheduled_at: FieldValue.serverTimestamp(),
            rescheduled_by: decodedUser.uid,
            rescheduled_by_email: decodedUser.email,
            reschedule_reason: reason || null,
            updated_at: FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: "Interview rescheduled successfully. Calendar invitations have been updated."
        }, { status: 200 });

    } catch (error) {
        console.error("[interviews.slots.reschedule] Error:", error);
        return NextResponse.json({
            error: "Failed to reschedule interview",
            details: error.message
        }, { status: 500 });
    }
}