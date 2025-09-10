import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
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

        let buffer;
        let fileName = "";
        let fileType = "";

        const contentType = request.headers.get("content-type");

        if (contentType?.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file");
            if (!file) {
                return NextResponse.json({ error: "No file provided" }, { status: 400 });
            }
            buffer = Buffer.from(await file.arrayBuffer());
            fileName = file.name;
            fileType = file.type;
        } else {
            // Direct buffer upload
            buffer = Buffer.from(await request.arrayBuffer());
            fileName = request.headers.get("x-filename") || "uploaded-file";
            fileType = request.headers.get("x-filetype") || "application/octet-stream";
        }

        // Determine file extension
        const fileExt = path.extname(fileName).toLowerCase();
        const supportedFormats = ['.docx', '.doc', '.pdf', '.txt'];

        if (!supportedFormats.includes(fileExt)) {
            return NextResponse.json({
                error: `Unsupported file format. Supported: ${supportedFormats.join(', ')}`
            }, { status: 400 });
        }

        // Create temporary file
        const tmpPath = path.join("/tmp", `upload-${Date.now()}${fileExt}`);
        fs.writeFileSync(tmpPath, buffer);

        let extractedText = "";

        try {
            if (fileExt === '.docx' || fileExt === '.doc') {
                const result = await mammoth.extractRawText({ path: tmpPath });
                extractedText = result.value || "";
            } else if (fileExt === '.txt') {
                extractedText = fs.readFileSync(tmpPath, 'utf-8');
            } else if (fileExt === '.pdf') {
                // For PDF parsing, you'd need to add pdf-parse or similar
                // For now, return error for PDF
                fs.unlinkSync(tmpPath);
                return NextResponse.json({
                    error: "PDF parsing not implemented yet. Please use DOCX or TXT files."
                }, { status: 400 });
            }
        } catch (err) {
            console.error("Text extraction failed:", err);
            fs.unlinkSync(tmpPath);
            return NextResponse.json({ error: "Failed to extract text from file" }, { status: 500 });
        }

        // Clean up temp file
        fs.unlinkSync(tmpPath);

        if (!extractedText.trim()) {
            return NextResponse.json({ error: "No text content found in file" }, { status: 400 });
        }

        // Parse the job description to match your required structure
        const parsedData = parseJobDescriptionToStructure(extractedText);

        return NextResponse.json({
            success: true,
            fileName,
            fileType,
            fileSize: buffer.length,
            extractedLength: extractedText.length,
            ...parsedData
        }, { status: 200 });

    } catch (error) {
        console.error("File parsing error:", error);
        return NextResponse.json({
            error: "Failed to process file",
            details: error.message
        }, { status: 500 });
    }
}

function parseJobDescriptionToStructure(text) {
    const lines = text.split("\n").filter(line => line.trim());

    // Initialize the structure matching your JD generation format
    const jobData = {
        title: "",
        companyName: "",
        location: "",
        experience_required: "",
        ctc_range: "",
        key_skills: [],
        good_to_have_skills: [],
        description: {
            about: "",
            key_responsibilities: [],
            qualifications: [],
            what_we_offer: []
        }
    };

    // Extract basic information
    jobData.title = extractTitle(lines);
    jobData.companyName = extractCompany(lines);
    jobData.location = extractLocation(lines);
    jobData.experience_required = extractExperience(lines);
    jobData.ctc_range = extractSalary(lines);

    // Extract skills
    jobData.key_skills = extractSkills(lines, [
        'required skills', 'key skills', 'technical skills', 'must have skills',
        'essential skills', 'core skills'
    ]);

    jobData.good_to_have_skills = extractSkills(lines, [
        'good to have', 'nice to have', 'preferred skills', 'additional skills',
        'bonus skills', 'optional skills'
    ]);

    // Extract description sections
    jobData.description.about = extractSection(lines, [
        'about', 'job summary', 'overview', 'role description', 'position summary'
    ]);

    jobData.description.key_responsibilities = extractListSection(lines, [
        'responsibilities', 'duties', 'key responsibilities', 'job responsibilities',
        'what you will do', 'role responsibilities'
    ]);

    jobData.description.qualifications = extractListSection(lines, [
        'qualifications', 'requirements', 'education', 'minimum qualifications',
        'required qualifications', 'eligibility'
    ]);

    jobData.description.what_we_offer = extractListSection(lines, [
        'benefits', 'what we offer', 'perks', 'compensation', 'package',
        'employee benefits', 'why join us'
    ]);

    return jobData;
}

function extractTitle(lines) {
    // Look for job title in first few lines
    const titlePatterns = [
        /^(job title|position|role):\s*(.+)/i,
        /^(.+?)\s*-\s*(job|position|role)/i,
        /^([A-Z][^.!?]*(?:engineer|developer|intern|manager|analyst|specialist|coordinator|assistant|director|lead|senior|junior))/i,
    ];

    for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i].trim();
        for (const pattern of titlePatterns) {
            const match = line.match(pattern);
            if (match && match[2]) return match[2].trim();
            if (match && match[1]) return match[1].trim();
        }
    }
    return "Position";
}

function extractCompany(lines) {
    const companyPatterns = [
        /^(company|organization|employer):\s*(.+)/i,
        /at\s+([A-Z][a-zA-Z\s&.,]+(?:Inc|LLC|Corp|Ltd|Company|Technologies|Solutions|Systems|Pvt\.?\s*Ltd\.?))/i,
        /([A-Z][a-zA-Z\s&.,]+(?:Inc|LLC|Corp|Ltd|Company|Technologies|Solutions|Systems|Pvt\.?\s*Ltd\.?))/i,
    ];

    for (let i = 0; i < Math.min(15, lines.length); i++) {
        const line = lines[i].trim();
        for (const pattern of companyPatterns) {
            const match = line.match(pattern);
            if (match && match[2]) return match[2].trim();
            if (match && match[1]) return match[1].trim();
        }
    }
    return "";
}

function extractLocation(lines) {
    const locationPatterns = [
        /(?:location|based|office):\s*([^,\n]+)/i,
        /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*(?:India|USA|UK|Canada|Remote)/i,
        /(Remote|Hybrid|On-site)/i
    ];

    for (const line of lines) {
        for (const pattern of locationPatterns) {
            const match = line.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
    }
    return "";
}

function extractExperience(lines) {
    const expPatterns = [
        /(?:experience|exp):\s*(\d+[-\s]*\d*\s*(?:years?|yrs?))/i,
        /(\d+[-\s]*\d*)\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i,
        /(fresher|entry\s*level|senior|junior)/i
    ];

    for (const line of lines) {
        for (const pattern of expPatterns) {
            const match = line.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
    }
    return "";
}

function extractSalary(lines) {
    const salaryPatterns = [
        /(?:salary|ctc|package|compensation):\s*([^,\n]+)/i,
        /(₹?\s*\d+[-\s]*\d*\s*(?:lpa|lakhs?|k|thousand))/i,
        /(\$\s*\d+[-\s]*\d*\s*(?:k|thousand))/i
    ];

    for (const line of lines) {
        for (const pattern of salaryPatterns) {
            const match = line.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
    }
    return "";
}

function extractSkills(lines, keywords) {
    const skills = [];
    let inSkillsSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase().trim();

        // Check if we're entering a skills section
        if (keywords.some(keyword => line.includes(keyword.toLowerCase()))) {
            inSkillsSection = true;
            continue;
        }

        // Stop if we hit another major section
        if (inSkillsSection && /^(responsibilities|qualifications|benefits|about)/i.test(line)) {
            break;
        }

        if (inSkillsSection) {
            // Extract skills from bullet points or comma-separated lists
            const skillLine = lines[i].replace(/^[-•○*]\s*/, '').trim();
            if (skillLine) {
                // Split by commas and clean
                const lineSkills = skillLine.split(/[,;]/).map(s => s.trim()).filter(s => s);
                skills.push(...lineSkills);
            }
        }
    }

    return skills.slice(0, 10); // Limit to 10 skills
}

function extractSection(lines, keywords) {
    let inSection = false;
    const content = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase().trim();

        if (keywords.some(keyword => line.includes(keyword.toLowerCase()))) {
            inSection = true;
            continue;
        }

        if (inSection && /^(responsibilities|qualifications|benefits|skills)/i.test(line)) {
            break;
        }

        if (inSection && lines[i].trim()) {
            content.push(lines[i].trim());
        }
    }

    return content.join(' ').substring(0, 300); // Limit length
}

function extractListSection(lines, keywords) {
    const items = [];
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase().trim();

        if (keywords.some(keyword => line.includes(keyword.toLowerCase()))) {
            inSection = true;
            continue;
        }

        if (inSection && /^(about|skills|benefits|qualifications|responsibilities)/i.test(line) &&
            !keywords.some(keyword => line.includes(keyword.toLowerCase()))) {
            break;
        }

        if (inSection) {
            const item = lines[i].replace(/^[-•○*]\s*/, '').trim();
            if (item && item.length > 10) { // Filter out very short items
                items.push(item);
            }
        }
    }

    return items.slice(0, 8);
}