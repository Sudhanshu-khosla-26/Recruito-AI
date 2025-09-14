import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request) {
    try {
        // 1) Parse body
        let body;
        try {
            body = await request.json();
        } catch (err) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { to, subject, text, html } = body || {};
        if (!to || !subject || (!text && !html)) {
            return NextResponse.json(
                { error: "Missing required fields (to, subject, text/html)" },
                { status: 400 }
            );
        }

        // 2) Create transporter
        const transporter = nodemailer.createTransport({
            service: process.env.NEXT_PUBLIC_EMAIL_SERVICE, // "gmail"
            auth: {
                user: process.env.NEXT_PUBLIC_EMAIL_USER,
                pass: process.env.NEXT_PUBLIC_EMAIL_PASS,
            },
        });



        // 3) Send email
        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to,
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("[send-email] Message sent:", info.messageId);

        return NextResponse.json(
            { message: "Email sent successfully", messageId: info.messageId },
            { status: 200 }
        );
    } catch (error) {
        console.error("[send-email] Error:", error);
        return NextResponse.json(
            { error: "Failed to send email", details: error.message },
            { status: 500 }
        );
    }
}
