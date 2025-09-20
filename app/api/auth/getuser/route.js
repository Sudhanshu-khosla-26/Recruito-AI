import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function POST(request) {
    try {

        const session = request.cookies.get("session")?.value;
        // console.log("Session:", session);
        if (!session) {
            return NextResponse.json({ error: "No session found" }, { status: 400 });
        }
        let decodedUser;
        try {
            decodedUser = await getAuth().verifySessionCookie(session, true);
            const user = await adminDB.collection("users").doc(decodedUser.uid).get();
            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            const data = await user.data();
            decodedUser = data
        } catch (err) {
            console.log(err);
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        return NextResponse.json({ message: "User retrieved successfully", ok: true, user: decodedUser }, { status: 200 });

    } catch (error) {
        console.error("Error retrieving user:", error);
        return NextResponse.json({ error: "Failed to retrieve user" }, { status: 500 });
    }
}