import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";


export async function GET(request, { params }) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    try {
        const jobDoc = await adminDB.collection("jobs").doc(id).get();

        if (!jobDoc.exists) {
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }

        return NextResponse.json({ id: jobDoc.id, ...jobDoc.data() }, { status: 200 });
    } catch (error) {
        console.error("Error fetching job:", error);
        return NextResponse.json({ error: "Failed to fetch job." }, { status: 500 });
    }
}