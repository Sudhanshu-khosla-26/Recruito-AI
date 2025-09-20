import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export async function POST(request) {
    try {
        const { name, email, profilePicture, token } = await request.json();
        const status = "active";
        const role = "jobseeker";
        const is_verified = false;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        // Verify token with Admin SDK
        const decoded = await getAuth().verifyIdToken(token);

        const userDoc = adminDB.collection("users").doc(decoded.uid);
        const snap = await userDoc.get();


        const newUser = {
            name,
            email,
            profilePicture,
            status,
            role,
            is_verified,
            createdAt: FieldValue.serverTimestamp(),
        };

        if (!snap.exists) {
            await userDoc.set(newUser);
        }

        return NextResponse.json({ message: "User created successfully", ok: true }, { status: 201 });

    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}