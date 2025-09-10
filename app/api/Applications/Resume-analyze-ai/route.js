// app/api/analyze-resume/route.js
import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import * as mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FieldValue } from "firebase-admin/firestore";

// === Helper function to parse the resume file to text ===
async function parseResumeToText(file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";

    try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
            const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default
            const parsed = await pdf(buffer)
            resumeText = parsed.text;
        } else if (file.name.toLowerCase().endsWith(".docx")) {
            const { value } = await mammoth.extractRawText({ buffer });
            resumeText = value;
        } else {
            resumeText = buffer.toString("utf-8");
        }
    } catch (error) {
        console.error("File parsing error:", error);
        throw new Error(`Failed to parse ${file.name}: ${error.message}`);
    }

    // Ensure we return a string and clean it
    return (resumeText || "").replace(/\s\s+/g, ' ').trim();
}

// === The Main API Endpoint ===
export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("resume");
        // const jobDescription = formData.get("jobDescription");
        const jobId = formData.get("jobId");
        // const userId = formData.get("userId");

        // Validation
        if (!file || !jobId) {
            return NextResponse.json(
                { error: "Missing required form data: resume or jobId" },
                { status: 400 }
            );
        }

        // 1. Parse the resume file into clean text

        const jobDoc = await adminDB.collection("jobs").doc(jobId).get()

        if (!jobDoc.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 })
        }

        const jobData = jobDoc.data()

        console.log("Parsing resume file:", file.name);
        const resumeText = await parseResumeToText(file);

        if (!resumeText || resumeText.length < 50) {
            return NextResponse.json(
                { error: "Resume content is too short or could not be extracted" },
                { status: 400 }
            );
        }

        console.log("Resume text extracted, length:", resumeText.length);

        // 2. Initialize the Gemini AI Client
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1, // Low temperature for consistent analysis
            },
        });

        // 3. Enhanced prompt for more accurate analysis
        const prompt = `
You are an expert ATS (Applicant Tracking System) and HR recruitment analyst with 10+ years of experience. 

Analyze the provided resume against the job description with extreme precision. Focus on:
- EXACT skill matching (not just similar words)
- QUANTIFIABLE experience calculation
- EDUCATION relevance to role
- CONTEXT-AWARE analysis

### Job Description:
---
${jobData}
---

### Resume Content:
---
${resumeText}
---

### Analysis Requirements:

1. **Skills Analysis (Most Important)**:
   - Extract ONLY the technical skills explicitly mentioned in job description
   - Check if each skill appears in resume (exact matches or clear synonyms)
   - Consider skill context (e.g., "used React for 2 years" vs just mentioning "React")
   - Include both hard skills (technical) and soft skills if mentioned in job

2. **Experience Analysis**:
   - Extract required years from job description (look for "X+ years", "minimum X years", etc.)
   - Calculate candidate's total relevant experience from resume
   - Consider: full-time roles, internships (count as 0.5x), freelance work
   - Look for dates, duration mentions, or explicit "X years experience"

3. **Education Analysis**:
   - Identify minimum education requirement from job (if any)
   - Compare with candidate's highest education
   - Consider field relevance (CS degree for tech role = higher score)

4. **Scoring Logic**:
   - Skills: 50% weight (most critical)
   - Experience: 30% weight
   - Education: 15% weight
   - Overall fit: 5% weight
   - Total Score = weighted average

5. **Status Decision**:
   - Shortlisted: ≥75 (strong match)
   - Consider: 50-74 (partial match, interview might reveal more)
   - Rejected: <50 (significant gaps)

Return ONLY valid JSON with this exact structure:

{
  "totalScore": number,
  "Name": string,
    "Email": string,
    "Phone": string,
  "summary": "1-2 sentence analysis of candidate fit",
  "status": "shortlisted" | "consider" | "rejected",
  "breakdown": {
    "skillAnalysis": {
      "score": number,
      "requiredSkills": ["array of skills from job description"],
      "matchedSkills": ["skills found in resume"],
      "missingSkills": ["required skills not found"],
      "additionalSkills": ["relevant skills in resume not required"],
      "details": "brief explanation of skill match quality"
    },
    "experienceAnalysis": {
      "score": number,
      "requiredYears": number,
      "candidateYears": number,
      "experienceGap": number,
      "details": "explanation of experience assessment"
    },
    "educationAnalysis": {
      "score": number,
      "requiredEducation": "string or null",
      "candidateEducation": "string",
      "isRelevant": boolean,
      "details": "explanation of education fit"
    },
    "overallFit": {
      "strengths": ["key strengths"],
      "concerns": ["main concerns"],
      "recommendation": "hiring recommendation"
    }
  },
  "metadata": {
    "resumeFileName": "${file.name}",
    "analysisDate": "${new Date().toISOString()}"
  }
}`;

        // 4. Get AI analysis
        console.log("Sending to Gemini for analysis...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let analysisResult;

        try {
            const responseText = response.text();
            analysisResult = JSON.parse(responseText);
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            console.log("Raw response:", response.text());
            throw new Error("AI returned invalid JSON format");
        }

        // 5. Validate the response structure
        if (!analysisResult.totalScore || !analysisResult.status || !analysisResult.breakdown) {
            throw new Error("Invalid analysis result structure from AI");
        }

        // 6. Save to database with proper timestamp
        // try {
        //     await adminDB.collection("resume_analyses").add({
        //         userId,
        //         jobId,
        //         fileName: file.name,
        //         totalScore: analysisResult.totalScore,
        //         status: analysisResult.status,
        //         summary: analysisResult.summary,
        //         breakdown: analysisResult.breakdown,
        //         analyzedAt: FieldValue.serverTimestamp(),
        //         metadata: analysisResult.metadata
        //     });
        //     console.log("Analysis saved to database");
        // } catch (dbError) {
        //     console.error("Database save error:", dbError);
        //     // Continue even if DB save fails
        // }

        // 7. Return the analysis
        return NextResponse.json({
            success: true,
            analysis: analysisResult
        });

    } catch (error) {
        console.error("Resume analysis error:", error);
        return NextResponse.json(
            {
                error: "Resume analysis failed",
                details: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

