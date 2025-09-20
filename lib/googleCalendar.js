import { google } from "googleapis";

export const GetCandlenderCLient = async () => {
    const auth = new google.auth.JWT({
        email: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL,
        key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ["https://www.googleapis.com/auth/calendar.events"], // Make sure the scope is correct
    });

    await auth.authorize();
    const calendar = await google.calendar({ version: "v3", auth });
    return calendar;
}
// 3. Create a Google Calendar client instance