import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "firebase-admin/auth";

export async function POST(request) {
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


        const { interview_type, duration_minutes, job_id } = await request.json();

        const jobDoc = await adminDB.collection("jobs").doc(job_id).get();
        const jobdata = jobDoc.data();

        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3, // Slightly higher for more varied questions
            },
        });

        // Calculate questions per type based on duration
        const questionsPerType = 2 // ~2.5 min per question
        const totalQuestions = questionsPerType * interview_type.length;

        const prompt = `You are an expert HR interviewer tasked with generating professional interview questions. 

**Job Details:**
- Position: ${jobdata.title}
- Company: ${jobdata.company_name}
- Department: ${jobdata.department || 'Not specified'}
- Industry: ${jobdata.industry || 'Not specified'}
- Experience Required: ${jobdata.experience_required || 'Not specified'}
- Location: ${jobdata.location || 'Not specified'}
- Key Skills: ${JSON.stringify(jobdata.key_skills || [])}
- Good to Have Skills: ${JSON.stringify(jobdata.good_to_have_skills || [])}
- Job Description: ${JSON.stringify(jobdata.description || [])}
- Education Qualification: ${jobdata.education_qualification || 'Not specified'}

**Interview Parameters:**
- Duration: ${duration_minutes} minutes
- Interview Types: ${JSON.stringify(interview_type)}
- Questions per type: ${questionsPerType}
- Total questions needed: ${totalQuestions}

**Instructions:**
Generate exactly ${questionsPerType} high-quality interview questions for each of the following types: ${interview_type.join(', ')}.

**Question Guidelines by Type:**

1. **Behavioral Questions:**
   - Use STAR method framework (Situation, Task, Action, Result)
   - Focus on past experiences and how they handled specific situations
   - Questions should reveal character traits, decision-making, and problem-solving approach
   - Examples: "Tell me about a time when...", "Describe a situation where..."

2. **Technical Questions:**
   - Must be directly related to the job requirements and key skills mentioned
   - Include both theoretical knowledge and practical application
   - Difficulty should match the required experience level
   - Can include scenario-based technical problems
   - Focus on skills: ${JSON.stringify(jobdata.key_skills || [])}

3. **Experience Questions:**
   - Explore the candidate's professional background and achievements
   - Relate to the required experience level: ${jobdata.experience_required}
   - Ask about specific projects, responsibilities, and career progression
   - Validate claims made in resume/application

4. **Problem Solving Questions:**
   - Present hypothetical workplace scenarios relevant to the role
   - Test analytical thinking and decision-making process
   - Should be industry/role-specific when possible
   - Focus on approach rather than just the final answer

5. **Leadership Questions:**
   - Assess leadership potential, team management, and influence skills
   - Include questions about conflict resolution, team motivation, and change management
   - Adapt complexity based on the seniority of the position
   - Even for non-management roles, assess leadership qualities

**Question Quality Requirements:**
- Each question should be clear, specific, and professionally worded
- Avoid yes/no questions - use open-ended questions that encourage detailed responses
- Questions should be appropriate for the experience level required
- Include follow-up question suggestions where relevant
- Ensure questions can be answered within the time constraints (consider ${Math.floor(duration_minutes / totalQuestions)} minutes per question)

**Response Format:**
Return a JSON object with the following structure:
{
  "interview_summary": {
    "position": "${jobdata.title}",
    "duration_minutes": ${duration_minutes},
    "total_questions": ${totalQuestions},
  },
  "questions": {
    "behavioral": [
      {
        "question": "Question text here",
      }
    ],
    "technical": [
      {
        "question": "Question text here",
      }
    ],
    "experience": [
      {
        "question": "Question text here",
   
      }
    ],
    "problem_solving": [
      {
        "question": "Question text here",
      
      }
    ],
    "leadership": [
      {
        "question": "Question text here",
    
      }
    ]
  }
}

Generate questions that are:
- Relevant to ${jobdata.title} position
- Appropriate for ${jobdata.experience_required} experience level  
- Focused on skills: ${JSON.stringify(jobdata.key_skills || [])}
- Industry-appropriate for ${jobdata.industry}
- Suitable for ${duration_minutes} minute interview duration

Only generate questions for the types specified: ${interview_type.join(', ')}.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const questionsData = JSON.parse(response.text());



        return NextResponse.json({
            success: true,
            // interview_id: docRef.id,
            data: questionsData,
            message: "Interview questions generated successfully"
        });

    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json({
            error: "Failed to generate interview questions",
            details: error.message
        }, { status: 500 });
    }
}