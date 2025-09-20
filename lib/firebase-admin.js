import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "hirelog-9c804",
            clientEmail: process.env.NEXT_PUBLIC_ADMIN_ID,
            privateKey: process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: "hirelog-9c804.firebasestorage.app"
    });
}

export const adminAuth = admin.auth();
export const adminDB = admin.firestore();
export const bucket = admin.storage().bucket("hirelog-9c804.firebasestorage.app");
