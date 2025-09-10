// app/api/set-session/route.js
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request) {
    try {
        const { token } = await request.json();
        console.log("Received token:", token);
        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        // 🔑 Create a session cookie (valid for 5 days)
        const fiveDays = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(token, {
            expiresIn: fiveDays,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("session", sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: fiveDays / 1000,
            path: "/",
        });

        return response;
    } catch (err) {
        console.error("Set session error:", err);
        return NextResponse.json({ error: "Failed to set session" }, { status: 500 });
    }
}
