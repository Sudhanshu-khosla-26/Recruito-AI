import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function GET(request) {
    try {
        const session = request.cookies.get("session")?.value;
        if (!session) {
            return NextResponse.json({ error: "No session found" }, { status: 400 });
        }

        let decodedUser;
        try {
            decodedUser = await getAuth().verifySessionCookie(session, true);
            const user = await adminDB.collection("users").doc(decodedUser.uid).get();
            if (!user.exists) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            const data = user.data();
            decodedUser = data;
        } catch (err) {
            console.log(err);
            return NextResponse.json({ error: "Invalid token" }, { status: 403 });
        }

        const validRoles = ["Admin", "jobseeker"];
        if (!validRoles.includes(decodedUser.role)) {
            return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        }

        // Get pagination parameters from URL
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 16;
        const skip = (page - 1) * limit;

        // Get total count for pagination info
        const totalJobsSnapshot = await adminDB.collection("jobs").get();
        const totalJobs = totalJobsSnapshot.size;
        const totalPages = Math.ceil(totalJobs / limit);

        // Get all jobs and apply pagination manually (since Firestore doesn't have skip)
        const allJobs = totalJobsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Apply pagination
        const paginatedJobs = allJobs.slice(skip, skip + limit);

        return NextResponse.json({
            jobs: paginatedJobs,
            pagination: {
                currentPage: page,
                totalPages,
                totalJobs,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                limit
            }
        });

    } catch (error) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}