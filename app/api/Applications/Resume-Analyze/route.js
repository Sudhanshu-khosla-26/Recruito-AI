import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminDB } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import * as mammoth from "mammoth"


const SKILL_SYNONYMS = {
    javascript: ["js", "javascript", "ecmascript"],
    typescript: ["ts", "typescript"],
    react: ["react", "reactjs", "react.js"],
    nextjs: ["next", "nextjs", "next.js"],
    angular: ["angular", "angularjs"],
    vue: ["vue", "vuejs", "vue.js"],
    node: ["node", "nodejs", "node.js"],
    express: ["express", "expressjs"],
    mongodb: ["mongodb", "mongo"],
    postgresql: ["postgresql", "postgres", "psql"],
    mysql: ["mysql"],
    python: ["python", "py"],
    java: ["java"],
    docker: ["docker", "containerization"],
    kubernetes: ["kubernetes", "k8s"],
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    django: ["django"],
    flask: ["flask"],
    graphql: ["graphql"],
    "machine learning": ["ml", "machine learning", "artificial intelligence", "ai"],
    "data science": ["data science", "data analytics", "analytics"],
    "full stack": ["full stack", "fullstack", "full-stack"],
    git: ["git", "github", "gitlab", "version control"],
    agile: ["agile", "scrum", "kanban"]
}

const EDUCATION_KEYWORDS = {
    bachelor: ["bachelor", "b.tech", "btech", "be", "bs", "ba"],
    master: ["master", "m.tech", "mtech", "ms", "ma", "mba"],
    phd: ["phd", "ph.d", "doctorate"]
}

const SOFT_SKILLS_KEYWORDS = {
    leadership: ["lead", "leader", "leadership", "manage", "manager", "supervisor"],
    communication: ["communication", "communicate", "present", "presentation"],
    teamwork: ["team", "collaborate", "collaboration", "teamwork"],
    "problem-solving": ["problem", "solve", "solution", "analytical", "analysis"],
    adaptability: ["adapt", "flexible", "agile", "versatile"],
    creativity: ["creative", "innovative", "innovation", "design"],
    "time-management": ["deadline", "schedule", "organize", "priority", "multitask"]
}

// ----------------- UTILITY FUNCTIONS -----------------
const cleanText = (text) => {
    if (!text || typeof text !== 'string') {
        return "" // Return empty string if text is undefined/null
    }

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

// NEW: Extract candidate's name
const extractName = (text) => {
    if (!text) return null

    const lines = text.split('\n').filter(line => line.trim().length > 0)

    // Look for name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim()

        // Skip lines with common resume headers/sections
        if (/^(resume|cv|curriculum|vitae|profile|summary|objective|contact|email|phone|address)/i.test(line)) {
            continue
        }

        // Skip lines with only special characters or numbers
        if (/^[^a-zA-Z]*$/.test(line)) {
            continue
        }

        // Look for patterns that suggest a name
        const namePattern = /^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})(?:\s|$)/
        const match = line.match(namePattern)

        if (match && match[1]) {
            const candidateName = match[1].trim()
            // Validate it's likely a real name (2-4 words, each capitalized)
            const nameParts = candidateName.split(' ')
            if (nameParts.length >= 2 && nameParts.length <= 4) {
                const isValidName = nameParts.every(part =>
                    part.length >= 2 &&
                    /^[A-Z][a-z]+$/.test(part) &&
                    !['Email', 'Phone', 'Mobile', 'Address', 'Contact'].includes(part)
                )
                if (isValidName) {
                    return candidateName
                }
            }
        }

        // Alternative: look for simple name pattern in first line
        if (i === 0 && line.length < 50) {
            const words = line.split(/\s+/)
            if (words.length >= 2 && words.length <= 4) {
                const potentialName = words.slice(0, 4).join(' ')
                if (/^[A-Za-z\s]{4,}$/.test(potentialName)) {
                    return potentialName.replace(/\b\w/g, l => l.toUpperCase())
                }
            }
        }
    }

    return null
}

// NEW: Extract email address
const extractEmail = (text) => {
    if (!text) return null

    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const matches = text.match(emailPattern)

    if (matches && matches.length > 0) {
        // Return the first email found, preferably not from common domains that might be examples
        const validEmails = matches.filter(email =>
            !email.includes('example.com') &&
            !email.includes('sample.com') &&
            !email.includes('test.com')
        )
        return validEmails.length > 0 ? validEmails[0].toLowerCase() : matches[0].toLowerCase()
    }

    return null
}

// NEW: Extract phone number
const extractPhoneNumber = (text) => {
    if (!text) return null

    // Various phone number patterns
    const phonePatterns = [
        // International format: +91 9876543210, +1-555-123-4567
        /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
        // Indian format: 9876543210, 98765-43210
        /(?:^|\s)([6-9]\d{9})(?:\s|$)/g,
        // US format: (555) 123-4567, 555-123-4567
        /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        // General: any 10+ digit number with possible separators
        /(?:^|\s)((?:\d[-.\s]?){10,})(?:\s|$)/g
    ]

    for (const pattern of phonePatterns) {
        const matches = text.match(pattern)
        if (matches && matches.length > 0) {
            // Clean up the number
            let phoneNumber = matches[0].trim()
            // Remove common prefixes and clean formatting
            phoneNumber = phoneNumber.replace(/^(tel:?|phone:?|mobile:?|ph:?)/i, '').trim()
            // Keep only digits, +, -, spaces, parentheses
            phoneNumber = phoneNumber.replace(/[^\d+\-\s()]/g, '')

            // Validate length (should be 10-15 digits)
            const digitCount = phoneNumber.replace(/\D/g, '').length
            if (digitCount >= 10 && digitCount <= 15) {
                return phoneNumber.trim()
            }
        }
    }

    return null
}

const extractSkills = (text, skillsList) => {
    const cleanedText = cleanText(text)
    const foundSkills = []

    skillsList.forEach(skill => {
        const skillKey = skill.toLowerCase()
        const synonyms = SKILL_SYNONYMS[skillKey] || [skillKey]

        const isFound = synonyms.some(synonym =>
            cleanedText.includes(synonym.toLowerCase())
        )

        if (isFound) {
            foundSkills.push(skill)
        }
    })

    return foundSkills
}

const extractEducation = (text) => {
    const cleanedText = cleanText(text)
    const foundEducation = []

    Object.entries(EDUCATION_KEYWORDS).forEach(([level, keywords]) => {
        const hasEducation = keywords.some(keyword =>
            cleanedText.includes(keyword)
        )
        if (hasEducation) {
            foundEducation.push(level)
        }
    })

    return foundEducation
}

const extractGPA = (text) => {
    const gpaPatterns = [
        /gpa[:\s]*(\d+\.?\d*)/i,
        /cgpa[:\s]*(\d+\.?\d*)/i,
        /(\d+\.?\d*)[\/\s]*10/,
        /(\d+\.?\d*)[\/\s]*4/
    ]

    for (const pattern of gpaPatterns) {
        const match = text.match(pattern)
        if (match) {
            let gpa = parseFloat(match[1])
            // Normalize to 10-point scale
            if (pattern.toString().includes('4')) {
                gpa = (gpa / 4) * 10
            }
            return gpa
        }
    }
    return null
}

const extractExperience = (text) => {
    const cleanedText = cleanText(text)

    // Look for explicit experience mentions
    const expPatterns = [
        /(\d+\.?\d*)\+?\s*years?\s*(?:of\s*)?experience/i,
        /experience[:\s]*(\d+\.?\d*)\+?\s*years?/i,
        /(\d+\.?\d*)\+?\s*yrs/i
    ]

    for (const pattern of expPatterns) {
        const match = cleanedText.match(pattern)
        if (match) {
            return parseFloat(match[1])
        }
    }

    // Calculate from work history dates
    const years = text.match(/20\d{2}/g)
    if (years && years.length >= 2) {
        const sortedYears = years.map(y => parseInt(y)).sort()
        const startYear = sortedYears[0]
        const endYear = sortedYears[sortedYears.length - 1]
        const currentYear = new Date().getFullYear()

        // If most recent year is current/recent, calculate experience
        if (endYear >= currentYear - 1) {
            return Math.max(0, endYear - startYear)
        }
    }

    // Check for internship/fresher indicators
    if (/intern|fresher|graduate|entry.?level/i.test(cleanedText)) {
        return 0
    }

    return null
}

const extractSoftSkills = (text, requiredSoftSkills = []) => {
    const cleanedText = cleanText(text)
    const foundSkills = []

    // If specific soft skills are required, check for those
    if (requiredSoftSkills.length > 0) {
        requiredSoftSkills.forEach(skill => {
            if (cleanedText.includes(skill.toLowerCase())) {
                foundSkills.push(skill)
            }
        })
    }

    // Also check for general soft skills
    Object.entries(SOFT_SKILLS_KEYWORDS).forEach(([skill, keywords]) => {
        const hasSkill = keywords.some(keyword =>
            cleanedText.includes(keyword)
        )
        if (hasSkill && !foundSkills.includes(skill)) {
            foundSkills.push(skill)
        }
    })

    return foundSkills
}

const extractProjects = (text) => {
    const cleanedText = cleanText(text)
    const projectIndicators = [
        "project", "developed", "built", "created", "implemented",
        "designed", "github", "portfolio", "application", "website"
    ]

    let projectScore = 0
    let projectCount = 0

    // Count project mentions
    const projectMatches = (cleanedText.match(/project/g) || []).length
    projectCount = Math.min(projectMatches, 5) // Cap at 5 for scoring

    // Check for technical project indicators
    projectIndicators.forEach(indicator => {
        if (cleanedText.includes(indicator)) {
            projectScore += 10
        }
    })

    // Bonus for links (github, portfolio, etc.)
    if (/github|gitlab|portfolio|demo|live/i.test(text)) {
        projectScore += 20
    }

    return {
        count: projectCount,
        score: Math.min(projectScore, 100),
        hasLinks: /github|gitlab|portfolio/i.test(text)
    }
}

const extractAchievements = (text) => {
    const achievementPatterns = [
        /(\d+)%/g, // Percentages
        /rank\s*#?(\d+)/i, // Rankings
        /award|recognition|achievement|honor|certificate/i,
        /lead|led|managed|mentored/i,
        /improved|increased|reduced|optimized/i
    ]

    let achievementScore = 0
    const foundAchievements = []

    achievementPatterns.forEach(pattern => {
        const matches = text.match(pattern)
        if (matches) {
            if (pattern.toString().includes('%')) {
                achievementScore += 20
                foundAchievements.push("Quantified results")
            } else if (pattern.toString().includes('rank')) {
                achievementScore += 15
                foundAchievements.push("Academic/Professional ranking")
            } else if (pattern.toString().includes('award')) {
                achievementScore += 25
                foundAchievements.push("Awards/Recognition")
            } else if (pattern.toString().includes('lead')) {
                achievementScore += 20
                foundAchievements.push("Leadership experience")
            } else if (pattern.toString().includes('improved')) {
                achievementScore += 15
                foundAchievements.push("Impact/Improvement metrics")
            }
        }
    })

    return {
        score: Math.min(achievementScore, 100),
        achievements: [...new Set(foundAchievements)]
    }
}

const computeSemanticSimilarity = (resumeText, jobDescription) => {
    // Simple TF-IDF based similarity
    const tokenize = (text) => {
        return cleanText(text)
            .split(/\s+/)
            .filter(token => token.length > 2) // Remove very short words
    }

    const resumeTokens = tokenize(resumeText)
    const jobTokens = tokenize(jobDescription)

    // Create term frequency maps
    const resumeTF = {}
    const jobTF = {}

    resumeTokens.forEach(token => {
        resumeTF[token] = (resumeTF[token] || 0) + 1
    })

    jobTokens.forEach(token => {
        jobTF[token] = (jobTF[token] || 0) + 1
    })

    // Calculate cosine similarity
    const allTokens = new Set([...resumeTokens, ...jobTokens])
    let dotProduct = 0
    let resumeMagnitude = 0
    let jobMagnitude = 0

    allTokens.forEach(token => {
        const resumeCount = resumeTF[token] || 0
        const jobCount = jobTF[token] || 0

        dotProduct += resumeCount * jobCount
        resumeMagnitude += resumeCount * resumeCount
        jobMagnitude += jobCount * jobCount
    })

    const magnitude = Math.sqrt(resumeMagnitude) * Math.sqrt(jobMagnitude)
    return magnitude > 0 ? (dotProduct / magnitude) * 100 : 0
}

const calculateLocationMatch = (resumeText, requiredLocation) => {
    if (!requiredLocation) return 75

    const cleanedResume = cleanText(resumeText)
    const cleanedLocation = cleanText(requiredLocation)


    const locationParts = cleanedLocation.split(/[,\s]+/).filter(part => part.length > 2)

    const hasLocationMatch = locationParts.some(part =>
        cleanedResume.includes(part)
    )


    const relocateKeywords = ["relocate", "relocation", "willing to relocate", "open to relocate"]
    const willingToRelocate = relocateKeywords.some(keyword =>
        cleanedResume.includes(keyword)
    )

    if (hasLocationMatch) return 100
    if (willingToRelocate) return 80
    return 30
}

const parseFileContent = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let text = ""

    try {
        if (file.name.toLowerCase().endsWith(".pdf")) {
            const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default
            const parsed = await pdf(buffer)
            text = parsed.text
        } else if (file.name.toLowerCase().endsWith(".docx")) {
            const { value } = await mammoth.extractRawText({ buffer })
            text = value
        } else {
            text = buffer.toString("utf-8")
        }
    } catch (error) {
        console.error("File parsing error:", error)
        throw new Error(`Failed to parse ${file.name}: ${error.message}`)
    }

    return text || ""
}

// ----------------- MAIN ANALYZER -----------------
export async function POST(request) {
    try {
        const formData = await request.formData()
        const resumeFile = formData.get("resume")
        const jobId = formData.get("jobId")
        // const userId = formData.get("userId")

        if (!resumeFile) {
            return NextResponse.json({ error: "Resume file is required" }, { status: 400 })
        }

        if (!jobId) {
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
        }

        // Fetch job details from database
        const jobDoc = await adminDB.collection("jobs").doc(jobId).get()

        if (!jobDoc.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 })
        }

        const jobData = jobDoc.data()
        const {
            title,
            key_skills,
            location,
            experience_required,
            ctc_range,
            companyName,
            good_to_have_skills,
            description
        } = jobData

        // Parse resume content
        console.log("Parsing file:", resumeFile.name)
        const resumeText = await parseFileContent(resumeFile)
        console.log("Extracted text length:", resumeText?.length)
        console.log("Text preview:", resumeText?.substring(0, 100))

        if (!resumeText || resumeText.trim().length < 100) {
            return NextResponse.json({
                error: "Resume content is too short or could not be extracted"
            }, { status: 400 })
        }

        // ----------------- CONTACT INFO EXTRACTION -----------------
        const candidateName = extractName(resumeText)
        const candidateEmail = extractEmail(resumeText)
        const candidatePhone = extractPhoneNumber(resumeText)

        // ----------------- ANALYSIS -----------------

        // 1. Key Skills Analysis (35% weight)
        const requiredSkills = Array.isArray(key_skills) ? key_skills : key_skills.split(',').map(s => s.trim())
        const matchedKeySkills = extractSkills(resumeText, requiredSkills)
        const keySkillsScore = requiredSkills.length > 0
            ? (matchedKeySkills.length / requiredSkills.length) * 100
            : 0

        // 2. Good-to-Have Skills Analysis (15% weight)
        const goodToHaveSkills = Array.isArray(good_to_have_skills)
            ? good_to_have_skills
            : good_to_have_skills.split(',').map(s => s.trim())
        const matchedGoodToHaveSkills = extractSkills(resumeText, goodToHaveSkills)
        const goodToHaveScore = goodToHaveSkills.length > 0
            ? (matchedGoodToHaveSkills.length / goodToHaveSkills.length) * 100
            : 0

        // 3. Experience Analysis (25% weight)
        const resumeExperience = extractExperience(resumeText)
        const requiredExperience = parseFloat(experience_required.toString().match(/\d+\.?\d*/)?.[0] || 0)

        let experienceScore = 0
        if (resumeExperience !== null) {
            if (resumeExperience >= requiredExperience) {
                experienceScore = 100
            } else if (resumeExperience >= requiredExperience * 0.8) {
                experienceScore = 85
            } else if (resumeExperience >= requiredExperience * 0.6) {
                experienceScore = 70
            } else if (resumeExperience >= requiredExperience * 0.4) {
                experienceScore = 50
            } else {
                experienceScore = 30
            }
        } else {
            // If we can't extract experience, give benefit of doubt for entry-level
            experienceScore = requiredExperience <= 1 ? 60 : 20
        }

        // 4. Education Analysis (10% weight)
        const resumeEducation = extractEducation(resumeText)
        const gpa = extractGPA(resumeText)

        let educationScore = 50 // Base score
        if (resumeEducation.includes('phd')) educationScore = 100
        else if (resumeEducation.includes('master')) educationScore = 90
        else if (resumeEducation.includes('bachelor')) educationScore = 80

        // GPA bonus
        if (gpa) {
            if (gpa >= 8.5) educationScore = Math.min(educationScore + 15, 100)
            else if (gpa >= 7.5) educationScore = Math.min(educationScore + 10, 100)
            else if (gpa >= 6.5) educationScore = Math.min(educationScore + 5, 100)
        }

        // 5. Location Match (5% weight)
        const locationScore = calculateLocationMatch(resumeText, location)

        // 6. Project Analysis (5% weight)
        const projectAnalysis = extractProjects(resumeText)

        // 7. Achievements Analysis (3% weight)
        const achievementAnalysis = extractAchievements(resumeText)

        // 8. Soft Skills Analysis (2% weight)
        const softSkills = extractSoftSkills(resumeText)
        const softSkillsScore = softSkills.length > 0 ? Math.min(softSkills.length * 20, 100) : 40

        // 9. Semantic Similarity with Job Description (5% weight)
        const semanticScore = computeSemanticSimilarity(resumeText, description)

        // ----------------- FINAL SCORE CALCULATION -----------------
        const weightedScore = Math.round(
            keySkillsScore * 0.35 +
            experienceScore * 0.25 +
            goodToHaveScore * 0.15 +
            educationScore * 0.10 +
            locationScore * 0.05 +
            projectAnalysis.score * 0.05 +
            achievementAnalysis.score * 0.03 +
            softSkillsScore * 0.02
        )

        // Calculate overall match category
        let matchCategory = ""
        let recommendation = ""

        if (weightedScore >= 85) {
            matchCategory = "Excellent Match"
            recommendation = "Highly recommended for interview"
        } else if (weightedScore >= 70) {
            matchCategory = "Good Match"
            recommendation = "Recommended for interview"
        } else if (weightedScore >= 55) {
            matchCategory = "Partial Match"
            recommendation = "Consider for interview based on other factors"
        } else {
            matchCategory = "Poor Match"
            recommendation = "Not recommended unless specific circumstances apply"
        }

        // Generate detailed feedback
        const feedback = []

        if (keySkillsScore < 60) {
            const missingSkills = requiredSkills.filter(skill => !matchedKeySkills.includes(skill))
            feedback.push(`Missing key skills: ${missingSkills.join(', ')}`)
        }

        if (experienceScore < 70 && requiredExperience > 0) {
            feedback.push(`Experience gap: Has ${resumeExperience || 0} years, requires ${requiredExperience} years`)
        }

        if (locationScore < 60) {
            feedback.push("Location mismatch - candidate may need relocation")
        }

        if (projectAnalysis.score < 50) {
            feedback.push("Limited project experience mentioned")
        }

        // Prepare response data
        const analysisResult = {
            // Contact Information

            name: candidateName,
            email: candidateEmail,
            phone: candidatePhone,
            // Overall Results  
            totalScore: weightedScore,
            matchCategory,
            recommendation,
            feedback,

            // Detailed Breakdown
            breakdown: {
                keySkills: {
                    score: Math.round(keySkillsScore),
                    matched: matchedKeySkills,
                    required: requiredSkills,
                    weight: "35%"
                },
                experience: {
                    score: Math.round(experienceScore),
                    candidateYears: resumeExperience,
                    requiredYears: requiredExperience,
                    weight: "25%"
                },
                goodToHaveSkills: {
                    score: Math.round(goodToHaveScore),
                    matched: matchedGoodToHaveSkills,
                    available: goodToHaveSkills,
                    weight: "15%"
                },
                education: {
                    score: Math.round(educationScore),
                    level: resumeEducation,
                    gpa: gpa,
                    weight: "10%"
                },
                location: {
                    score: Math.round(locationScore),
                    required: location,
                    weight: "5%"
                },
                projects: {
                    score: Math.round(projectAnalysis.score),
                    count: projectAnalysis.count,
                    hasLinks: projectAnalysis.hasLinks,
                    weight: "5%"
                },
                achievements: {
                    score: Math.round(achievementAnalysis.score),
                    found: achievementAnalysis.achievements,
                    weight: "3%"
                },
                softSkills: {
                    score: Math.round(softSkillsScore),
                    matched: softSkills,
                    weight: "2%"
                }
            },

            // Metadata
            analyzedAt: new Date().toISOString(),
            resumeFileName: resumeFile.name,
            jobTitle: title,
            companyName: companyName
        }

        // Save analysis to database
        // if (userId && jobId) {
        //     try {
        //         await adminDB.collection("resume_analyses").add({
        //             userId,
        //             jobId,
        //             fileName: resumeFile.name,
        //             candidateInfo: {
        //                 name: candidateName,
        //                 email: candidateEmail,
        //                 phone: candidatePhone
        //             },
        //             totalScore: weightedScore,
        //             matchCategory,
        //             breakdown: analysisResult.breakdown,
        //             analyzedAt: serverTimestamp(),
        //             jobTitle: title,
        //             companyName: companyName
        //         })
        //     } catch (dbError) {
        //         console.error("Database save error:", dbError)
        //         // Continue with response even if DB save fails
        //     }
        // }

        return NextResponse.json(analysisResult, { status: 200 })

    } catch (error) {
        console.error("Resume analysis error:", error)
        return NextResponse.json(
            {
                error: "Resume analysis failed",
                details: error.message
            },
            { status: 500 }
        )
    }
}