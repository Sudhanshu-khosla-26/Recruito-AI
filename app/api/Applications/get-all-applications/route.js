import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";

export async function GET(req) {
    try {
        // Get jobid from query params
        const { searchParams } = new URL(req.url);
        const jobid = searchParams.get("jobid");

        if (!jobid) {
            return NextResponse.json({ error: "Missing jobid" }, { status: 400 });
        }

        const applicationsSnapshot = await adminDB
            .collection("applications")
            .where("job_id", "==", jobid)
            .orderBy("applied_at", "desc")
            .get();

        const applications = applicationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ applications }, { status: 200 });
    } catch (error) {
        console.error("Error fetching applications:", error);
        return NextResponse.json(
            { error: "Failed to fetch applications", details: error.message },
            { status: 500 }
        );
    }
}
