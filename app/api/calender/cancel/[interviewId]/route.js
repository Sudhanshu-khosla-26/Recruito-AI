// app/api/interviews/slots/cancel/[interviewId]/route.js
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
        const { reason } = body;

        // Get interview from Firebase
        const interviewDoc = await adminDB.collection("interviews").doc(interviewId).get();

        if (!interviewDoc.exists) {
            return NextResponse.json({ error: "Interview not found" }, { status: 404 });
        }

        const interviewData = interviewDoc.data();

        // Cancel Google Calendar event if exists
        if (interviewData.google_event_id) {
            try {
                const calendar = await GetCandlenderCLient();
                const calendarId = "b572b11b331778a1264c46b2d1d5becd3f11352fa6742914aaffdaa2a4f85b56@group.calendar.google.com";

                await calendar.events.delete({
                    calendarId: calendarId,
                    eventId: interviewData.google_event_id,
                    sendUpdates: 'all'
                });

                console.log("Calendar event cancelled:", interviewData.google_event_id);
            } catch (calendarError) {
                console.error("Google Calendar deletion error (non-blocking):", calendarError);
            }
        }

        // Update interview status in Firebase
        await adminDB.collection("interviews").doc(interviewId).update({
            status: "cancelled",
            cancelled_at: FieldValue.serverTimestamp(),
            cancelled_by: decodedUser.uid,
            cancelled_by_email: decodedUser.email,
            cancel_reason: reason || null,
            updated_at: FieldValue.serverTimestamp()
        });

        // Update application status if needed
        if (interviewData.application_id) {
            const applicationDoc = await adminDB.collection("applications").doc(interviewData.application_id).get();
            if (applicationDoc.exists) {
                const appData = applicationDoc.data();
                // Remove cancelled interview from list
                const updatedInterviewsList = (appData.interviews_list || []).filter(id => id !== interviewId);

                await adminDB.collection("applications").doc(interviewData.application_id).update({
                    status: updatedInterviewsList.length > 0 ? "interview_scheduled" : "in_review",
                    interviews_list: updatedInterviewsList,
                    updated_at: FieldValue.serverTimestamp()
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Interview cancelled successfully. Calendar invitations have been cancelled."
        }, { status: 200 });

    } catch (error) {
        console.error("[interviews.slots.cancel] Error:", error);
        return NextResponse.json({
            error: "Failed to cancel interview",
            details: error.message
        }, { status: 500 });
    }
}

