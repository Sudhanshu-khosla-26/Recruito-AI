import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";


export async function PATCH(request) {
    try {
        const { question_id, answer_text, score, feedback } = await request.json();

        const questionRef = adminDB.collection("interview_qna").doc(question_id);
        await questionRef.update({
            answer_text: answer_text,
            score: score,
            feedback: feedback,
        });

        return NextResponse.json({ message: "Question updated successfully" }, { status: 200 });


    } catch (error) {
        console.error("Error updating question:", error);
        return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }
}