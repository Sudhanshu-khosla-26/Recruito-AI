import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { GetCandlenderCLient } from "@/lib/googleCalendar";
import moment from 'moment-timezone';

// Helper function to generate time slots for a single day
function generateTimeSlots(date, startHour = 9, endHour = 17, duration) {
    const slots = [];
    const currentDate = moment(date).startOf('day').tz('Asia/Kolkata');

    if (currentDate.day() === 0 || currentDate.day() === 6) {
        return slots;
    }

    const now = moment().tz('Asia/Kolkata');
    const isToday = currentDate.isSame(now, 'day');

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += duration) {
            const startTime = currentDate.clone().add(hour, 'hours').add(minute, 'minutes');
            const endTime = startTime.clone().add(duration, 'minutes');

            if (endTime.hour() > endHour || (endTime.hour() === endHour && endTime.minute() > 0)) {
                continue;
            }

            if (isToday && startTime.isBefore(now)) {
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

// Helper function to get all dates between start and end date
function getDateRange(startDate, endDate) {
    const dates = [];
    const current = moment(startDate).startOf('day');
    const end = moment(endDate).startOf('day');

    while (current.isSameOrBefore(end)) {
        dates.push(current.clone());
        current.add(1, 'day');
    }

    return dates;
}

// Helper function to check if slot conflicts with existing bookings
function isSlotAvailable(slot, busySlots, bookedSlots) {
    const slotStart = moment(slot.start);
    const slotEnd = moment(slot.end);

    const googleBusyEvents = busySlots || [];
    const firebaseBookedInterviews = bookedSlots || [];

    const isGoogleBusy = googleBusyEvents.some(event => {
        if (!event.start?.dateTime || !event.end?.dateTime) return false;

        const eventStart = moment(event.start.dateTime);
        const eventEnd = moment(event.end.dateTime);

        return slotStart.isBetween(eventStart, eventEnd, null, '[)') ||
            slotEnd.isBetween(eventStart, eventEnd, null, '(]') ||
            (slotStart.isSameOrBefore(eventStart) && slotEnd.isSameOrAfter(eventEnd));
    });

    const isFirebaseBooked = firebaseBookedInterviews.some(booked => {
        // Correctly handle Firestore Timestamps by converting them to moment objects
        const bookedStart = moment(booked.started_at.toDate());
        const bookedEnd = moment(booked.ended_at.toDate());
        const bookedDate = moment(booked.scheduled_at.toDate());

        // Check for time overlap
        const hasTimeOverlap =
            slotStart.isBetween(bookedStart, bookedEnd, null, '[)') ||
            slotEnd.isBetween(bookedStart, bookedEnd, null, '(]') ||
            (slotStart.isSameOrBefore(bookedStart) && slotEnd.isSameOrAfter(bookedEnd));

        // Check if the slot and the booked interview are on the same day
        const isSameDay = slotStart.isSame(bookedDate, 'day');

        return isSameDay && hasTimeOverlap;
    });

    return !isGoogleBusy && !isFirebaseBooked;
}

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
            startDate,
            endDate,
            duration,
            selectedOption
        } = body;

        if (!interviewer_email || !startDate || !endDate) {
            return NextResponse.json({
                error: "Missing required fields: interviewer_email, startDate, and endDate"
            }, { status: 400 });
        }

        const start = moment(startDate);
        const end = moment(endDate);

        if (!start.isValid() || !end.isValid()) {
            return NextResponse.json({
                error: "Invalid date format. Please use ISO date format."
            }, { status: 400 });
        }

        if (end.isBefore(start)) {
            return NextResponse.json({
                error: "End date cannot be before start date"
            }, { status: 400 });
        }

        if (end.diff(start, 'days') > 30) {
            return NextResponse.json({
                error: "Date range cannot exceed 30 days"
            }, { status: 400 });
        }

        const expectedRole = selectedOption === "Whm" ? "HM" : "HR";
        const interviewerSnapshot = await adminDB.collection("users")
            .where("email", "==", interviewer_email)
            .where("role", "==", expectedRole)
            .limit(1)
            .get();

        if (interviewerSnapshot.empty) {
            return NextResponse.json({
                error: `${selectedOption === "Whm" ? "Hiring Manager" : "HR"} not found with email: ${interviewer_email}`
            }, { status: 404 });
        }

        const interviewerData = interviewerSnapshot.docs[0].data();
        const interviewerId = interviewerSnapshot.docs[0].id;
        const calendar = await GetCandlenderCLient();
        const dateRange = getDateRange(startDate, endDate);
        const availableSlotsByDate = {};
        let totalAvailableSlots = 0;

        try {
            const calendarId = "b572b11b331778a1264c46b2d1d5becd3f11352fa6742914aaffdaa2a4f85b56@group.calendar.google.com";
            const fieldName = selectedOption === "Whm" ? "hm_id" : "hr_id";

            const interviewsQuerySnapshot = await adminDB.collection("interviews")
                // Use a query filter that Firebase can index and understand
                .where(fieldName, "==", interviewerId)
                .where("status", "in", ["scheduled", "confirmed"])
                .get();

            const firebaseBookedSlots = interviewsQuerySnapshot.empty ? [] : interviewsQuerySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    started_at: data.started_at,
                    ended_at: data.ended_at,
                    scheduled_at: data.scheduled_at
                };
            });

            for (const currentDate of dateRange) {
                const dateString = currentDate.format('YYYY-MM-DD');
                const displayDateString = currentDate.format('DD-MM-YYYY');
                const allSlots = generateTimeSlots(dateString, 9, 17, duration);

                if (allSlots.length === 0) {
                    continue;
                }

                const dayStart = currentDate.startOf('day').tz('Asia/Kolkata').toISOString();
                const dayEnd = currentDate.endOf('day').tz('Asia/Kolkata').toISOString();

                const eventsResponse = await calendar.events.list({
                    calendarId: calendarId,
                    timeMin: dayStart,
                    timeMax: dayEnd,
                    singleEvents: true,
                    orderBy: 'startTime'
                });

                const busySlots = eventsResponse.data.items || [];

                const dayBookedSlots = firebaseBookedSlots.filter(slot =>
                    // Correctly handle the timestamp object
                    moment(slot.scheduled_at.toDate()).isSame(currentDate, 'day')
                );

                const availableSlots = allSlots.filter(slot =>
                    isSlotAvailable(slot, busySlots, dayBookedSlots)
                );

                if (availableSlots.length > 0) {
                    availableSlotsByDate[displayDateString] = availableSlots.map(slot => ({
                        time: slot.display,
                        startTime: slot.start,
                        endTime: slot.end,
                        available: true
                    }));
                    totalAvailableSlots += availableSlots.length;
                }
            }

            const formattedResponse = {
                success: true,
                interviewer: {
                    email: interviewer_email,
                    id: interviewerId,
                    name: interviewerData.name || interviewerData.displayName,
                    role: expectedRole
                },
                availableSlots: availableSlotsByDate,
            };



            return NextResponse.json(formattedResponse, { status: 200 });

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