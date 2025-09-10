import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDB } from "@/lib/firebase-admin";


export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
        }

        const companyDoc = await adminDB.collection("companies").doc(id).get();

        if (!companyDoc.exists) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        const companyData = { id: companyDoc.id, ...companyDoc.data() };

        return NextResponse.json(companyData);

    } catch (error) {
        console.error("Error fetching company:", error);
        return NextResponse.json(
            { error: "Failed to fetch company", details: error.message },
            { status: 500 }
        );
    }
}

// export async function PATCH(request, { params }) {
//     try {
//         const { id } = await params;
//         const { address, description, website, company_size } = request.json();

//         if (!id) {
//             return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
//         }

//         const companyDoc = await adminDB.collection("companies").doc(id).get();

//         if (!companyDoc.exists) {
//             return NextResponse.json({ error: "Company not found" }, { status: 404 });
//         }



//         const companyData = { id: companyDoc.id, ...companyDoc.data() };

//         return NextResponse.json(companyData);

//     } catch (error) {
//         console.error("Error fetching company:", error);
//         return NextResponse.json(
//             { error: "Failed to fetch company", details: error.message },
//             { status: 500 }
//         );
//     }
// }