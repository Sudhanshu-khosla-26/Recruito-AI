import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
    try {

        const { jobRole, keySkills, location, yearsOfExperience, ctcRange, company_name, goodtohaveskills, others } = await request.json();


        if (!jobRole || !keySkills || !location || !yearsOfExperience || !ctcRange || !company_name || !goodtohaveskills) {
            return NextResponse.json({ error: "All fields are required." }, { status: 400 });
        }

        const prompt = `
Generate a professional job description in JSON format.
Follow this exact schema:

{
  "title": "<Job Title>",
  "companyName": "<Company>",
  "location": "<Location>",
   "experience_required": "<Years of experience>",
    "ctc_range": "<CTC Range>",
    "key_skills": ["...", "..."],
    "good_to_have_skills": ["...", "..."],
    "description": {
    "about": "<Short about role>",
    "key_responsibilities": ["...", "..."],
    "qualifications": ["...", "..."],
    "what_we_offer": ["...", "..."]
  }
}

Job Title: ${jobRole}
Company: ${company_name}
Location: ${location}
Years of Experience: ${yearsOfExperience || "0+"}
CTC Range: ${ctcRange || "As per industry standards"}
Key Skills: ${Array.isArray(keySkills) ? keySkills.join(", ") : keySkills}
Good to Have Skills: ${Array.isArray(goodtohaveskills) ? goodtohaveskills.join(", ") : goodtohaveskills}
Others: ${others || "N/A"}

IMPORTANT: Return ONLY valid JSON. Do not include extra text, markdown, or explanation.
`;


        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jdText = await response.text();
        console.log(jdText);

        if (!jdText) {
            return NextResponse.json({ error: "The AI model returned an empty response." }, { status: 500 });
        }


        let jdJson;
        try {
            jdJson = JSON.parse(jdText);
        } catch (err) {
            console.warn("⚠️ AI response was not pure JSON, wrapping raw text instead.");
            jdJson = { raw_text: jdText };
        }


        return NextResponse.json({ job_description: jdJson });

    } catch (error) {
        console.error("❌ Error in /api/generatejd-ai:", error);
        return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
    }
}
