import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { getAuth } from "firebase/auth";



export async function POST(request) {
    try {
        const { job_id, application_id, candidate_id, interview_type, scheduled_at, duration_minutes, overall_score } = await request.json()


    } catch (error) {

    }
}