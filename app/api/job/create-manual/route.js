import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";


export async function POST(request) {

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

    try {
        const { title, key_skills, location, experience_required, ctc_range, companyName, good_to_have_skills, description } = await request.json();

        if (!title || !key_skills || !location || !experience_required || !ctc_range || !companyName || !good_to_have_skills || !description) {
            return NextResponse.json({ error: "All fields are required." }, { status: 400 });
        }

        // Validate required fields
        if (!title) {
            return NextResponse.json({ error: "Title is required." }, { status: 400 });
        }

        if (!key_skills || (Array.isArray(key_skills) && key_skills.length === 0)) {
            return NextResponse.json({ error: "Key skills are required." }, { status: 400 });
        }

        if (!location) {
            return NextResponse.json({ error: "Location is required." }, { status: 400 });
        }

        if (!experience_required) {
            return NextResponse.json({ error: "Experience requirement is required." }, { status: 400 });
        }

        if (!ctc_range) {
            return NextResponse.json({ error: "CTC range is required." }, { status: 400 });
        }

        if (!companyName) {
            return NextResponse.json({ error: "Company name is required." }, { status: 400 });
        }

        if (!good_to_have_skills || (Array.isArray(good_to_have_skills) && good_to_have_skills.length === 0)) {
            return NextResponse.json({ error: "Good to have skills are required." }, { status: 400 });
        }

        if (!description) {
            return NextResponse.json({ error: "Description is required." }, { status: 400 });
        }

        // Validate description structure if it's an object
        if (typeof description === 'object' && description !== null) {
            if (!description.about) {
                return NextResponse.json({ error: "Description 'about' field is required." }, { status: 400 });
            }

            if (!description.key_responsibilities || !Array.isArray(description.key_responsibilities) || description.key_responsibilities.length === 0) {
                return NextResponse.json({ error: "Key responsibilities are required." }, { status: 400 });
            }

            if (!description.qualifications || !Array.isArray(description.qualifications) || description.qualifications.length === 0) {
                return NextResponse.json({ error: "Qualifications are required." }, { status: 400 });
            }

            if (!description.what_we_offer || !Array.isArray(description.what_we_offer) || description.what_we_offer.length === 0) {
                return NextResponse.json({ error: "What we offer is required." }, { status: 400 });
            }
        }

        // Ensure arrays are properly formatted
        const normalizedKeySkills = Array.isArray(key_skills) ? key_skills : [key_skills];
        const normalizedGoodToHaveSkills = Array.isArray(good_to_have_skills) ? good_to_have_skills : [good_to_have_skills];

        const data = {
            title: title,
            key_skills: normalizedKeySkills.map(skill => skill.trim()),
            location: location,
            experience_required: experience_required,
            ctc_range: ctc_range,
            companyName,
            good_to_have_skills: normalizedGoodToHaveSkills.map(skill => skill.trim()),
            description: description,
            created_at: FieldValue.serverTimestamp(),
            status: "active",
            // created_by_id: decodedUser.uid,
            // company_id: decodedUser.company_id
            selected_candidates: []
        }

        const jobdata = await adminDB.collection("jobs").add(data);

        if (!jobdata) {
            return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
        }

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        console.error("Error creating job:", error);
        return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
    }

}


