import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";


export async function POST(request) {
    try {
        const session = request.cookies.get("session")?.value;
        if (!session) {
            return NextResponse.json({ error: "No session found" }, { status: 400 });
        }
        let decodedUser;
        try {
            decodedUser = await getAuth().verifySessionCookie(session, true);
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        console.log(decodedUser);

        const user = await adminDB.collection("users").doc(decodedUser.uid).get();
        if (!user.exists) {
            return NextResponse.json({ error: "User does not exist" }, { status: 404 });
        }
        const decodedUserData = user.data();
        if (decodedUserData.role != "jobseeker") {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }

        const { job_id, resume_url, match_percentage, applicant_phone, analyzed_paramters, applicant_email, applicant_name } = await request.json();
        if (!job_id || !resume_url || !match_percentage || !applicant_phone || !applicant_email || !applicant_name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }


        const applicationData = {
            applicant_id: decodedUser.uid,
            job_id: job_id,
            resume_url: resume_url,
            match_percentage: match_percentage,
            applied_at: FieldValue.serverTimestamp(),
            applicant_name: applicant_name,
            applicant_email: applicant_email,
            applicant_phone: applicant_phone,
            status: "applied",
            type: "manual-apply",
            analyzed_paramters: analyzed_paramters,
        };

        await adminDB.collection("applications").add(applicationData);

        return NextResponse.json({ message: "Application created successfully", ok: true }, { status: 201 });

    } catch (error) {
        console.error("Error creating application:", error);
        return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
    }
} 