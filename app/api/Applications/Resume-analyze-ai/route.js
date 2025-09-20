// app/api/analyze-resume/route.js
import { NextResponse } from "next/server";
import { adminDB, bucket } from "@/lib/firebase-admin";
import * as mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from 'uuid';

// Cache for job data to avoid repeated Firestore queries
const jobCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// === Helper function to upload resume to Firebase Storage ===
async function uploadResumeToStorage(file) {
    try {
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        const filePath = `resumes/${uniqueFilename}`;

        const fileRef = bucket.file(filePath);
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload with optimized settings
        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
                metadata: {
                    originalName: file.name,
                    uploadedAt: new Date().toISOString(),
                    fileType: 'resume'
                }
            },
            resumable: false, // Faster for smaller files
            validation: false // Skip validation for speed
        });

        await fileRef.makePublic();
        const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        return {
            url: downloadURL,
            path: filePath,
            originalName: file.name,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error(`Error uploading resume ${file.name}:`, error);
        throw error;
    }
}

// === Enhanced PDF parsing with multiple strategies for tables/designs ===
async function parseResumeToText(file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = "";

    try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
            const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;

            // Strategy 1: Try basic parsing first
            try {
                const parsed = await pdf(buffer, {
                    max: 50 // Limit pages for speed
                });
                resumeText = parsed.text;
            } catch (basicError) {
                console.log("Basic PDF parsing failed, trying enhanced parsing...");

                // Strategy 2: Enhanced parsing with custom renderer for tables/complex layouts
                try {
                    const parsed = await pdf(buffer, {
                        max: 50,
                        render_page: (pageData) => {
                            return pageData.getTextContent({
                                normalizeWhitespace: false,
                                disableCombineTextItems: false
                            }).then(textContent => {
                                let lastY, text = '';
                                let items = textContent.items;

                                // Sort items by Y position (top to bottom), then X (left to right) for better table reading
                                items.sort((a, b) => {
                                    const yDiff = b.transform[5] - a.transform[5]; // Y coordinate (inverted)
                                    if (Math.abs(yDiff) < 8) { // Items on same line
                                        return a.transform[4] - b.transform[4]; // X coordinate
                                    }
                                    return yDiff;
                                });

                                for (let item of items) {
                                    const currentY = item.transform[5];
                                    const currentX = item.transform[4];

                                    // Add line break for new lines
                                    if (lastY !== null && Math.abs(lastY - currentY) > 8) {
                                        text += '\n';
                                    }
                                    // Add space between words on same line
                                    else if (text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')) {
                                        // Check for significant horizontal gap (likely new column/section)
                                        const gap = currentX - (items.find(i => i.transform[5] === currentY)?.transform[4] || 0);
                                        if (gap > 50) {
                                            text += ' | '; // Mark column separation
                                        } else {
                                            text += ' ';
                                        }
                                    }

                                    text += item.str;
                                    lastY = currentY;
                                }

                                return text;
                            });
                        }
                    });
                    resumeText = parsed.text;
                } catch (enhancedError) {
                    console.log("Enhanced parsing also failed:", enhancedError.message);
                    throw new Error("Complex PDF layout detected that prevents text extraction");
                }
            }

        } else if (file.name.toLowerCase().endsWith(".docx")) {
            const { value } = await mammoth.extractRawText({ buffer });
            resumeText = value;
        } else if (file.name.toLowerCase().endsWith(".doc")) {
            try {
                const { value } = await mammoth.extractRawText({ buffer });
                resumeText = value;
            } catch (docError) {
                throw new Error("Unable to parse .doc file. Please convert to .docx or .pdf format.");
            }
        } else {
            resumeText = buffer.toString("utf-8");
        }
    } catch (error) {
        console.error("File parsing error:", error);

        if (file.name.toLowerCase().endsWith(".pdf")) {
            throw new Error(`Unable to extract text from PDF "${file.name}". This could be due to:
• Image-based/scanned PDF (contains only images)
• Complex tables/formatting preventing text extraction
• Password protection or file corruption

Please try:
• Converting to .docx format (recommended)
• Using "Print to PDF" to create a simpler version
• Recreating the resume with standard formatting
• Ensuring the PDF has selectable text`);
        } else {
            throw new Error(`Failed to parse ${file.name}: ${error.message}`);
        }
    }

    // Enhanced text cleaning for table-based content
    const cleaned = (resumeText || "")
        .replace(/\s\s+/g, ' ')           // Multiple spaces to single
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
        .replace(/[^\x00-\x7F]/g, ' ')   // Remove problematic non-ASCII
        .replace(/\u00A0/g, ' ')         // Non-breaking spaces
        .replace(/\|+/g, '|')            // Clean up multiple pipes from table parsing
        .replace(/\|\s*\|/g, '|')        // Remove empty table cells
        .trim();

    if (!cleaned || cleaned.length < 50) {
        throw new Error(`Insufficient text extracted from ${file.name} (${cleaned.length} characters).

This usually means:
• The PDF contains only images/scans
• Complex formatting prevents text extraction  
• The file is corrupted or password protected

Solutions:
• Upload as .docx instead of PDF (highly recommended)
• Simplify the resume layout (avoid complex tables/graphics)
• Use "Save As" to create a new PDF with text layers
• Try copying text manually and pasting into a new document`);
    }

    console.log(`Successfully parsed ${file.name}: ${cleaned.length} characters`);
    return cleaned;
}

// === Get job data with caching ===
async function getJobData(jobId) {
    const cacheKey = jobId;
    const cached = jobCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }

    const jobDoc = await adminDB.collection("jobs").doc(jobId).get();
    if (!jobDoc.exists) {
        throw new Error("Job not found");
    }

    const jobData = jobDoc.data();
    jobCache.set(cacheKey, {
        data: jobData,
        timestamp: Date.now()
    });

    return jobData;
}

// === Check for duplicate applications ===
async function checkDuplicateApplication(email, jobId) {
    if (!email) return false;

    const existingApp = await adminDB
        .collection("applications")
        .where('applicant_email', '==', email)
        .where('job_id', '==', jobId)
        .limit(1)
        .get();

    return !existingApp.empty;
}

// === Input validation helper ===
function validateInputs(file, jobId) {
    if (!file || !jobId) {
        throw new Error("Missing required form data: resume or jobId");
    }

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.");
    }

    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
        throw new Error("File is too large. Maximum size allowed is 10MB.");
    }

    // Check for empty files
    if (file.size === 0) {
        throw new Error("Uploaded file is empty. Please select a valid resume file.");
    }
}

// === The Main API Endpoint ===
export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("resume");
        const jobId = formData.get("jobId");

        // Validate inputs
        try {
            validateInputs(file, jobId);
        } catch (validationError) {
            return NextResponse.json(
                { error: validationError.message },
                { status: 400 }
            );
        }

        // Start parallel operations for speed
        console.log(`Starting analysis for ${file.name} (${file.size} bytes)`);
        const [jobData, resumeText] = await Promise.all([
            getJobData(jobId),
            parseResumeToText(file)
        ]);

        if (!resumeText || resumeText.length < 50) {
            return NextResponse.json(
                { error: "Resume content is too short or could not be extracted" },
                { status: 400 }
            );
        }

        console.log(`Resume parsed: ${resumeText.length} characters from ${file.name}`);

        // Initialize Gemini AI with proper API key
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API key not configured");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                maxOutputTokens: 2048
            },
        });

        const prompt = `You are an expert ATS system. Analyze this resume against the job description and provide detailed scoring.

JOB DESCRIPTION:
${JSON.stringify(jobData, null, 2)}

RESUME CONTENT:
${resumeText.substring(0, 8000)}${resumeText.length > 8000 ? '...[truncated for length]' : ''}

ANALYSIS REQUIREMENTS:
1. Extract contact information accurately (name, email, phone)
2. Score each category out of 10 (can use decimals like 6.5, 7.2)
3. Provide specific matched and missing skills
4. Calculate experience gaps precisely
5. Consider education relevance to the role

Return this exact JSON structure:
{
  "totalScore": number (0-10, weighted average),
  "name": "extracted name or null",
  "email": "extracted email or null", 
  "phone": "extracted phone or null",
  "summary": "2-3 sentence analysis of candidate fit",
  "status": "shortlisted|consider|rejected",
  "breakdown": {
    "skillAnalysis": {
      "score": number (0-10),
      "requiredSkills": ["skill1", "skill2"],
      "matchedSkills": ["matched1", "matched2"],
      "missingSkills": ["missing1", "missing2"],
      "details": "explanation of skill match quality"
    },
    "experienceAnalysis": {
      "score": number (0-10),
      "requiredYears": number,
      "candidateYears": number,
      "details": "experience assessment explanation"
    },
    "educationAnalysis": {
      "score": number (0-10),
      "candidateEducation": "highest education found",
      "details": "education relevance explanation"
    },
    "certifications": {
      "score": number (0-10)
    },
    "industry": {
      "score": number (0-10)
    },
    "relevance": {
      "score": number (0-10)
    },
    "stability": {
      "score": number (0-10)
    },

  }
}

SCORING WEIGHTS: Skills 45%, Experience 30%, Education 10%, Certifications 5%, Industry 5%, Relevance 3%, Stability 2%.
STATUS RULES: ≥7.5=shortlisted, 5.0-7.4=consider, <5.0=rejected.`;

        // Get AI analysis with timeout
        console.log("Sending to Gemini for analysis...");
        const analysisPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI analysis timeout')), 45000)
        );

        const result = await Promise.race([analysisPromise, timeoutPromise]);
        const response = await result.response;
        let analysisResult;

        try {
            const responseText = response.text();
            console.log("Raw AI response:", responseText.substring(0, 200) + "...");
            analysisResult = JSON.parse(responseText);
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            console.log("Full response:", response.text());
            throw new Error("AI returned invalid JSON format. Please try again.");
        }

        // Enhanced validation
        if (!analysisResult || typeof analysisResult.totalScore !== 'number' || !analysisResult.status) {
            console.error("Invalid analysis result:", analysisResult);
            throw new Error("Invalid analysis result structure from AI");
        }

        // Normalize totalScore to be out of 10
        if (analysisResult.totalScore > 10) {
            analysisResult.totalScore = analysisResult.totalScore / 10;
        }

        // Check for duplicate application if email exists
        if (analysisResult.email) {
            const isDuplicate = await checkDuplicateApplication(analysisResult.email, jobId);
            if (isDuplicate) {
                return NextResponse.json({
                    error: "This email address has already applied for this job position",
                    code: "DUPLICATE_APPLICATION"
                }, { status: 409 });
            }
        }

        // Upload resume
        console.log("Uploading resume to Firebase Storage...");
        const uploadResult = await uploadResumeToStorage(file);

        // Prepare application data with safer property access
        const applicationData = {
            job_id: jobId,
            resume_url: uploadResult.url,
            match_percentage: Math.round(analysisResult.totalScore * 10), // Convert to percentage
            applied_at: FieldValue.serverTimestamp(),
            applicant_name: analysisResult.name || "Unknown",
            applicant_email: analysisResult.email || null,
            applicant_phone: analysisResult.phone || null,
            status: "applied",
            file_name: uploadResult.originalName,
            file_size: uploadResult.size,
            analyze_parameter: {
                skillAnalysis: analysisResult.breakdown?.skillAnalysis?.score || 0,
                experienceAnalysis: analysisResult.breakdown?.experienceAnalysis?.score || 0,
                educationAnalysis: analysisResult.breakdown?.educationAnalysis?.score || 0,
                certifications: analysisResult.breakdown?.certifications?.score || 0,
                industry: analysisResult.breakdown?.industry?.score || 0,
                relevance: analysisResult.breakdown?.relevance?.score || 0,
                stability: analysisResult.breakdown?.stability?.score || 0
            }
        };

        // Save to database (fire and forget for speed)
        // adminDB.collection("applications").add(applicationData)
        //     .then(() => console.log("Application saved successfully"))
        //     .catch(console.error);

        // Return successful response
        return NextResponse.json({
            success: true,
            applicationData
        });

    } catch (error) {
        console.error("Resume analysis error:", error);

        // Return appropriate error messages
        let errorMessage = "Resume analysis failed";
        let statusCode = 500;

        if (error.message.includes("Job not found")) {
            errorMessage = "Job not found";
            statusCode = 404;
        } else if (error.message.includes("PDF") || error.message.includes("parse")) {
            errorMessage = error.message;
            statusCode = 400;
        } else if (error.message.includes("timeout")) {
            errorMessage = "Analysis timeout. Please try again.";
            statusCode = 408;
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            },
            { status: statusCode }
        );
    }
}           