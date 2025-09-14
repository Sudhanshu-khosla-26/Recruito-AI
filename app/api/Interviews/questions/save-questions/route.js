import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request) {
    try {
        const { interviewId, question, question_type } = await request.json();

        const payload = {
            interviewId: interviewId,
            created_at: FieldValue.serverTimestamp(),
            question_type: question_type,
            question_text: question
        };

        const questionDoc = await adminDB.collection("interview_qna").add(payload)

        return NextResponse.json({ message: "Question saved successfully", id: questionDoc.id }, { status: 200 });


    } catch (error) {
        console.error("Error saving question:", error);
        return NextResponse.json({ error: "Failed to save question" }, { status: 500 });
    }
}

