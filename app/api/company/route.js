import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB, bucket } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from 'uuid';

// Helper function to upload file to Firebase Storage
async function uploadFileToStorage(file, folder, company_name) {
    try {
        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        const filePath = `${folder}/${company_name}/${uniqueFilename}`;

        // Get bucket reference
        const fileRef = bucket.file(filePath);

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload file with metadata
        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
                metadata: {
                    originalName: file.name,
                    uploadedAt: new Date().toISOString(),
                    company_name: company_name
                }
            }
        });

        // Make file publicly accessible
        await fileRef.makePublic();

        // Get download URL
        const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        return {
            url: downloadURL,
            path: filePath,
            originalName: file.name,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        throw error;
    }
}

// Validate file type and size
function validateFile(file, allowedTypes, maxSizeInMB = 5) {
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type for ${file.name}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
        throw new Error(`File ${file.name} is too large. Maximum size: ${maxSizeInMB}MB`);
    }
}

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

    // const validRoles = ["Admin", "HHR", "HR", "HM", "recruiter"];
    // if (!validRoles.includes(decodedUser.role)) {
    //     return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
    // }

    try {
        // Parse FormData instead of JSON
        const formData = await request.formData();
        const company_name = formData.get('company_name');
        // const valid = formData.get('valid');
        const industry = formData.get('industry');
        const company_size = formData.get('company_size');
        const website = formData.get('website');
        const description = formData.get('description');
        const address = formData.get('address');

        // Extract files
        const logoFile = formData.get('logofile');
        const documentFiles = formData.getAll('documents'); // Support multiple documents

        // Validate required text fields
        if (!company_name || !industry || !company_size || !website || !description || !address) {
            return NextResponse.json({ error: "All text fields are required." }, { status: 400 });
        }

        // Validate required files
        if (!logoFile) {
            return NextResponse.json({ error: "Company logo is required." }, { status: 400 });
        }

        if (!documentFiles || documentFiles.length === 0) {
            return NextResponse.json({ error: "At least one document is required." }, { status: 400 });
        }

        // Generate company ID for file organization


        // Define allowed file types
        const logoAllowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const documentAllowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png'
        ];

        // Validate logo file
        validateFile(logoFile, logoAllowedTypes, 2); // 2MB limit for logo

        // Validate document files
        documentFiles.forEach(file => {
            if (file.size > 0) { // Check if file is not empty
                validateFile(file, documentAllowedTypes, 10); // 10MB limit for documents
            }
        });

        console.log('Starting file uploads...');



        const duplicateCheck = await adminDB.collection("companies").where("company_name", "==", company_name.trim()).get();

        if (!duplicateCheck.empty) {
            return NextResponse.json({ error: "Company with this name already exists." }, { status: 400 });
        }


        // Upload logo file
        const logoUploadResult = await uploadFileToStorage(logoFile, 'company-logos', company_name);
        console.log('Logo uploaded:', logoUploadResult.url);

        // Upload document files
        const documentUploadPromises = documentFiles.map(async (file, index) => {
            if (file.size > 0) {
                return await uploadFileToStorage(file, 'company-documents', company_name);
            }
            return null;
        });

        const documentUploadResults = await Promise.all(documentUploadPromises);
        const uploadedDocuments = documentUploadResults.filter(result => result !== null);

        console.log(`Uploaded ${uploadedDocuments.length} documents`);

        // Prepare data for Firestore
        const companyData = {
            company_name: company_name.trim(),
            valid: false, // Set to false initially, can be updated after verification
            industry: industry.trim(),
            company_size: company_size.trim(),
            website: website.trim(),
            description: description.trim(),
            address: address.trim(),

            // File information
            logo: {
                url: logoUploadResult.url,
                type: logoUploadResult.type
            },

            documents: uploadedDocuments.map(doc => ({
                url: doc.url,
                type: doc.type
            })),
            // total_storage_used: logoUploadResult.size + uploadedDocuments.reduce((total, doc) => total + doc.size, 0),
            created_at: FieldValue.serverTimestamp(),
            status: 'pending'
        };

        console.log('Saving company data to Firestore...');

        // Save to Firestore
        const docRef = await adminDB.collection("companies").add(companyData);

        if (!docRef) {
            return NextResponse.json({ error: "Failed to create company record." }, { status: 500 });
        }

        console.log('Company created successfully with ID:', docRef);

        return NextResponse.json({
            ok: true,
            // companyId: docRef.id,
            // message: "Company created successfully with files uploaded",
            // data: {
            //     id: docRef.id,
            //     company_name: companyData.company_name,
            //     logo_url: logoUploadResult.url,
            //     documents_count: uploadedDocuments.length,
            //     created_at: new Date().toISOString()
            // }
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating company:", error);

        // Return detailed error for development
        return NextResponse.json({
            error: "Failed to create company.",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

