import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";

export async function GET(request, { params }) {
    try {
        // ✅ Extract id from dynamic route
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Interview ID is required" },
                { status: 400 }
            );
        }

        // ✅ Fetch interview from Firestore
        const interviewRef = await adminDB.collection("interviews").doc(id).get();

        if (!interviewRef.exists) {
            return NextResponse.json(
                { error: "Interview not found" },
                { status: 404 }
            );
        }

        const interviewData = interviewRef.data();
        console.log("Interview Data:", interviewData);

        return NextResponse.json(
            { message: "Interview Details", interview: interviewData },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error starting interview:", error);
        return NextResponse.json(
            { message: "Error starting interview", details: error.message },
            { status: 500 }
        );
    }
}
