import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebase-admin";
import { getAuth } from "firebase/auth";


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

        // console.log(decodedUser);

        // const validRoles = ["HAdmin"];

        // if (!validRoles.includes(decodedUser.role)) {
        //     return NextResponse.json({ error: "User role is not valid" }, { status: 403 });
        // }

        const users = await adminDB.collection("users").where("role", "==", "Admin").get();


    } catch (error) {

    }
}

export async function GET(request) {
    try {

    } catch (error) {

    }
}
