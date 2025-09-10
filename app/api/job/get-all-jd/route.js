import { NextResponse } from "next/server";
import { adminDB, adminAuth } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";


export async function GET(request) {
    try {
        const session = request.cookies.get("session")?.value;
        // console.log("Session:", session);
        if (!session) {
            return NextResponse.json({ error: "No session found" }, { status: 400 });
        }
        let decodedUser;
        try {
            decodedUser = await getAuth().verifySessionCookie(session, true);
            const user = await adminDB.collection("users").doc(decodedUser.uid).get();
            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            const data = await user.data();
            decodedUser = data
        } catch (err) {
            console.log(err);
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }


        const validRoles = ["Admin", "HHR", "HR", "HM", "recruiter"];

        if (!validRoles.includes(decodedUser.role)) {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }

        const companyid = await decodedUser.company_id;

        const jobsSnapshot = await adminDB.collection("jobs").where("company_id", "==", companyid).get();
        const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({ jobs });

    } catch (error) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}