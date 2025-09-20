import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

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

        const validRoles = ["Admin", "jobseeker"];
        if (!validRoles.includes(decodedUser.role)) {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }


        const applicationsSnapshot = await adminDB.collection("applications").where("applicant_email", "==", decodedUser.email).get();
        const applications = await applicationsSnapshot.docs.map(doc => ({
            id: doc.id, data: doc.data()
        }));
        console.log("[debug] applications found:", applications);

        let interviews = [];

        for (const application of applications) {
            const interviewsSnapshot = await adminDB.collection("interviews").where("application_id", "==", application.id).get();
            const applicationInterviews = interviewsSnapshot.docs.map(doc => ({
                id: doc.id, data: doc.data()
            }));
            interviews = [...interviews, ...applicationInterviews];
        }

        console.log("[debug] interviews found:", interviews);

        return NextResponse.json({ interviews }, { status: 200 });

    } catch (error) {
        console.error("Error retrieving interviews:", error);
        return NextResponse.json({ error: "Failed to retrieve interviews" }, { status: 500 });
    }
}

