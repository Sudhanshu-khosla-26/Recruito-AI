import { NextResponse } from "next/server";
import { GetCandlenderCLient } from "@/lib/googleCalendar"


export async function POST(req) {
    try {
        const calendar = await GetCandlenderCLient();

        // 4. Extract event details from the request body
        const { summary, description, start, end } = await req.json();

        const event = {
            summary: summary,
            description: description,
            start: {
                dateTime: start,
                timeZone: "Asia/Kolkata",
            },
            end: {
                dateTime: end,
                timeZone: "Asia/Kolkata",
            },
        };

        // 5. Insert the event into the specified calendar
        const response = await calendar.events.insert({
            calendarId: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID,
            requestBody: event,
        });

        console.log("Event created: %s", response.data.htmlLink);

        return NextResponse.json({
            message: "Event created successfully",
            event: response.data
        });

    } catch (error) {
        console.error("Error creating event:", error);
        // Return a detailed error response
        return NextResponse.json({
            error: "Failed to create calendar event",
            details: error.message
        }, { status: 500 });
    }
}