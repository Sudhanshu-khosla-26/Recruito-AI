import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";


export async function POST(request) {
    try {
        // const session = request.cookies.get("session")?.value;
        // if (!session) {
        //     return NextResponse.json({ error: "No session found" }, { status: 400 });
        // }
        // let decodedUser;
        // try {
        //     decodedUser = await getAuth().verifyIdToken(session);
        // } catch {
        //     return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        // }

        // console.log(decodedUser);

        // const validRoles = ["Admin", "HHR", "HR", "HM", "recruiter"];

        // if (!validRoles.includes(decodedUser.role)) {
        //     return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        // }

        const { job_id, resume_url, match_percentage, applicant_phone, } = request.json();
        if (!job_id || !resume_url || !match_percentage || !applicant_phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }


        const applicationData = {
            applicant_id: decodedUser.uid,
            job_id: job_id,
            resume_url: resume_url,
            match_percentage: match_percentage,
            applied_at: FieldValue.serverTimestamp(),
            applicant_name: decodedUser.name,
            applicant_email: decodedUser.email,
            applicant_phone: applicant_phone,
            status: "applied",
        };

        await adminDB.collection("applications").add(applicationData);

        return NextResponse.json({ message: "Application created successfully", ok: true }, { status: 201 });

    } catch (error) {
        console.error("Error creating application:", error);
        return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
    }
} 