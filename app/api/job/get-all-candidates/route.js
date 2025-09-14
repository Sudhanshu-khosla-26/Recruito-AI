import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";

export async function GET(request) {
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

        const companyid = decodedUser.company_id;

        console.log(companyid);
        if (!companyid) {
            return NextResponse.json({ error: "User has no company_id" }, { status: 400 });
        }

        const jobsSnapshot = await adminDB
            .collection("jobs")
            .where("company_id", "==", companyid)
            .get();

        console.log(jobsSnapshot);

        if (jobsSnapshot.empty) {
            return NextResponse.json({ error: "No jobs found for this company" }, { status: 404 });
        }

        const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const candidates = [];
        await Promise.all(
            jobs.map(async (job) => {
                const appsSnapshot = await adminDB
                    .collection("applications")
                    .where("job_id", "==", job.id)
                    .get();

                appsSnapshot.forEach(appDoc => {
                    candidates.push({
                        job_id: job.id,
                        job_title: job.title,
                        job_location: job.location,
                        candidate: appDoc.data(),
                        application_id: appDoc.id
                    });
                });
            })
        );

        return NextResponse.json({ candidates });
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
