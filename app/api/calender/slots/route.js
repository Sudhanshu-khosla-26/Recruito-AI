// app/api/interviews/slots/available/route.js
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { GetCandlenderCLient } from "@/lib/googleCalendar";
import moment from 'moment-timezone';

// Helper function to generate time slots
function generateTimeSlots(date, startHour = 9, endHour = 17, duration = 30) {
    const slots = [];
    const currentDate = moment(date).startOf('day').tz('Asia/Kolkata');

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += duration) {
            const startTime = currentDate.clone().add(hour, 'hours').add(minute, 'minutes');
            const endTime = startTime.clone().add(duration, 'minutes');

            if (endTime.hour() > endHour || (endTime.hour() === endHour && endTime.minute() > 0)) {
                continue;
            }

            slots.push({
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                display: `${startTime.format('HH:mm')} to ${endTime.format('HH:mm')}`
            });
        }
    }

    return slots;
}

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
            date,
            duration_minutes = 30,
            type
        } = body;

        if (!interviewer_email || !date) {
            return NextResponse.json({
                error: "Missing required fields: interviewer_email and date"
            }, { status: 400 });
        }

        // Determine interviewer role based on type
        const expectedRole = type === "Whm" ? "HM" : "HR";

        // Get interviewer from Firebase
        const interviewerSnapshot = await adminDB.collection("users")
            .where("email", "==", interviewer_email)
            .where("role", "==", expectedRole)
            .limit(1)
            .get();

        if (interviewerSnapshot.empty) {
            return NextResponse.json({
                error: `${type === "Whm" ? "Hiring Manager" : "HR"} not found with email: ${interviewer_email}`
            }, { status: 404 });
        }

        const interviewerData = interviewerSnapshot.docs[0].data();
        const interviewerId = interviewerSnapshot.docs[0].id;

        // Get Google Calendar client
        const calendar = await GetCandlenderCLient();

        // Generate all possible slots for the day
        const allSlots = generateTimeSlots(date, 9, 17, duration_minutes);

        // Get busy times from Google Calendar
        const startTime = moment(date).startOf('day').tz('Asia/Kolkata').toISOString();
        const endTime = moment(date).endOf('day').tz('Asia/Kolkata').toISOString();

        try {
            // Use the shared calendar ID from your configuration
            const calendarId = "b572b11b331778a1264c46b2d1d5becd3f11352fa6742914aaffdaa2a4f85b56@group.calendar.google.com";

            // Get all events for the day
            const eventsResponse = await calendar.events.list({
                calendarId: calendarId,
                timeMin: startTime,
                timeMax: endTime,
                singleEvents: true,
                orderBy: 'startTime'
            });

            const busySlots = eventsResponse.data.items || [];

            // Get booked interviews from Firebase for this interviewer
            const interviewsQuery = adminDB.collection("interviews")
                .where("interview_date", "==", date)
                .where("status", "in", ["scheduled", "confirmed"]);

            // Add interviewer filter based on type
            const fieldName = type === "Whm" ? "hm_id" : "hr_id";
            const bookedInterviews = await interviewsQuery
                .where(fieldName, "==", interviewerId)
                .get();

            const firebaseBookedSlots = bookedInterviews.docs.map(doc => ({
                start: doc.data().start_time,
                end: doc.data().end_time
            }));

            // Filter available slots
            const availableSlots = allSlots.filter(slot => {
                const slotStart = moment(slot.start);
                const slotEnd = moment(slot.end);

                // Check against Google Calendar events
                const isGoogleBusy = busySlots.some(event => {
                    if (!event.start?.dateTime || !event.end?.dateTime) return false;

                    const eventStart = moment(event.start.dateTime);
                    const eventEnd = moment(event.end.dateTime);

                    return slotStart.isBetween(eventStart, eventEnd, null, '[)') ||
                        slotEnd.isBetween(eventStart, eventEnd, null, '(]') ||
                        (slotStart.isSameOrBefore(eventStart) && slotEnd.isSameOrAfter(eventEnd));
                });

                // Check against Firebase booked slots
                const isFirebaseBooked = firebaseBookedSlots.some(booked => {
                    const bookedStart = moment(booked.start);
                    const bookedEnd = moment(booked.end);

                    return slotStart.isBetween(bookedStart, bookedEnd, null, '[)') ||
                        slotEnd.isBetween(bookedStart, bookedEnd, null, '(]') ||
                        (slotStart.isSameOrBefore(bookedStart) && slotEnd.isSameOrAfter(bookedEnd));
                });

                return !isGoogleBusy && !isFirebaseBooked;
            });

            // Format response
            const formattedSlots = {};
            const dateKey = moment(date).format('DD-MM-YYYY');
            formattedSlots[dateKey] = availableSlots.map(slot => ({
                time: slot.display,
                startTime: slot.start,
                endTime: slot.end,
                available: true
            }));

            return NextResponse.json({
                success: true,
                interviewer_email,
                interviewer_id: interviewerId,
                interviewer_role: expectedRole,
                type,
                date,
                slots: formattedSlots,
                totalAvailable: availableSlots.length,
                requested_by: decodedUser.email
            }, { status: 200 });

        } catch (calendarError) {
            console.error("Google Calendar error:", calendarError);
            return NextResponse.json({
                error: "Failed to fetch calendar availability",
                details: calendarError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error("[interviews.slots.available] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch available slots",
            details: error.message
        }, { status: 500 });
    }
}
