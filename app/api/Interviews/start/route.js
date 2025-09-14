import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(request) {
    try {
        //check the user giving interview is valid or not

        const { interviewId } = await request.json();

        const payload = {
            started_at: FieldValue.serverTimestamp(),
            status: "in_progress",
        }

        const interviewRef = adminDB.collection("interviews").doc(interviewId);
        console.log(interviewRef);
        await interviewRef.update(payload);
        return NextResponse.json({ message: "Interview started successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error starting interview:", error);
        return NextResponse.json({ message: "Error starting interview" }, { status: 500 });
    }

}