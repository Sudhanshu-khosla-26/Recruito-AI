import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";

export async function POST(request) {
    try {
        const { interview_id } = await request.json();

        const questionDoc = await adminDB.collection("interview_qna").where("interviewId", "==", interview_id).get();

        if (questionDoc.empty) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        return NextResponse.json({ question: questionDoc.docs.map(doc => doc.data()) }, { status: 200 });


    } catch (error) {
        console.error("Error fetching question:", error);
        return NextResponse.json({ error: "Failed to fetch question" }, { status: 500 });
    }
}

