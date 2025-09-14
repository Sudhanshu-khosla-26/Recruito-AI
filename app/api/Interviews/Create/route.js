import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request) {
    try {
        const session = await request.cookies.get("session")?.value;
        if (!session) {
            return NextResponse.json({ error: "No session found" }, { status: 400 });
        }
        console.log(session);

        let decodedUser;
        try {
            decodedUser = await getAuth().verifySessionCookie(session, true);
            const userDoc = await adminDB.collection("users").doc(decodedUser.uid).get();

            if (!userDoc.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            decodedUser = userDoc.data();
        } catch (err) {
            console.error("Auth error:", err);
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        const validRoles = ["Admin", "HHR", "HR", "HM", "recruiter"];
        if (!validRoles.includes(decodedUser.role)) {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }

        const body = await request.json();
        console.log("[debug] request body:", body);

        const { job_id, application_id, mode, interview_type, duration_minutes } = body || {};
        if (!job_id || !application_id) {
            console.warn("[interviews.create] missing required fields:", { job_id, application_id });
            return NextResponse.json({ error: "Missing required fields 'job_id' or 'application_id'", bodyReceived: body }, { status: 400 });
        }

        // Optional: check job exists (helps avoid 'job not found' surprises)
        const jobDoc = await adminDB.collection("jobs").doc(job_id).get();
        if (!jobDoc.exists) {
            console.warn("[interviews.create] job not found:", job_id);
            return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }

        const duplicateCheck = await adminDB.collection("interviews")
            .where("application_id", "==", application_id)
            .where("job_id", "==", job_id)
            .get();

        if (!duplicateCheck.empty) {
            console.warn("[interviews.create] duplicate interview detected for application:", application_id);
            return NextResponse.json({ error: "An interview for this application and job already exists." }, { status: 409 });
        }

        // --- 5) Create interview document & return id ---
        const interviewPayload = {
            job_id,
            application_id,
            candidate_id: body.candidate_id || null,
            mode: mode || "HR",
            interview_type: interview_type || [],
            created_at: FieldValue.serverTimestamp(),
            duration_minutes: duration_minutes || null,
            status: "scheduled",
        };

        console.log("[debug] interview payload:", interviewPayload);

        const docRef = await adminDB.collection("interviews").add(interviewPayload);

        const applicationRed = await adminDB.collection("applications").doc(application_id).get();
        if (applicationRed.exists) {
            await adminDB.collection("applications").doc(application_id).update({
                status: "interview_scheduled",
            });
        }

        console.log("[interviews.create] created interview id:", docRef.id);

        return NextResponse.json({ message: "Interview created successfully", id: docRef.id }, { status: 201 });
    } catch (error) {
        console.error("[interviews.create] Unexpected server error:", error);
        return NextResponse.json({ error: "Failed to create interview", details: error.message }, { status: 500 });
    }
}
