// app/api/auth/remove-session/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
    const session = request.cookies.get("session");
    if (!session) {
        return NextResponse.json({ error: "No session found" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("session", "", { maxAge: 0, path: "/" });
    return response;
}
