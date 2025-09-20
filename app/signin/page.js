"use client"

import Image from "next/image"
import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import axios from "axios"

export default function Page() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSignin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {

            const userCred = await signInWithEmailAndPassword(auth, email, password);

            const idToken = await userCred.user.getIdToken();



            await fetch("/api/auth/set-session", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: idToken
                }),
            });


            window.location.href = "/dashboard";
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            setError(
                "Please enter your email address first"
            );
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);


            alert("Password reset email sent! Check your inbox.");
        } catch (err) {
            setError("Failed to send reset email");

        }
    }

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        // setMessage("");

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log(user);

            // Firestore reference
            const idToken = await user.getIdToken();

            const res = await axios.post('/api/auth/create', {
                name: user.displayName,
                email: user.email,
                profilePicture: user.photoURL,
                token: idToken,
            });
            console.log(res.data);

            console.log(idToken, " ID TOKEN");


            await fetch("/api/auth/set-session", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: idToken
                }),
            });

            // alert("Signed up successfully with Google!");
            window.location.href = "/job-descriptions"; // ✅ redirect directly 
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to sign up with Google");
        } finally {
            setLoading(false);
        }
    };


    return (
        <main className="min-h-screen bg-white text-gray-900">
            <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-2 md:items-center">
                {/* Left: Brand + Illustration */}
                <div className="flex flex-col items-center  md:items-center">
                    <h1 className="mb-8 text-2xl font-semibold tracking-wide text-blue-700">RecruitoAI</h1>
                    <Image
                        src="/images/signin_illustration.png"
                        alt="Person near a large monitor illustration"
                        className="w-full max-w-xl"
                        width={500}
                        height={500}
                    />
                </div>

                {/* Right: Sign In Card */}
                <div className="flex justify-center md:justify-end">
                    <div
                        role="region"
                        aria-label="Sign in form"
                        className="w-full max-w-md  rounded-xl bg-[#EA7125] p-6 shadow-lg ring-1 ring-blue-700/40 md:p-8"
                    >
                        <header className="mb-6 text-center">
                            <h2 className="text-2xl pt-6 font-semibold text-white">Sign In</h2>
                            <div className="mx-auto mt-2 h-1 w-14 rounded bg-white/85" aria-hidden="true" />
                        </header>
                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="Sign in with Google"
                                onClick={() => handleGoogleSignIn()}
                            >
                                <svg className="w-5 h-5" width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.3882 7.1375C3.77811 6.10283 4.53059 5.2026 5.5383 4.56522C6.54601 3.92784 7.75748 3.58588 8.99987 3.58812C10.4082 3.58812 11.6815 4.02668 12.6815 4.74445L15.5915 2.19278C13.8182 0.836911 11.5457 0 8.99987 0C5.0582 0 1.66487 1.97204 0.0332031 4.86066L3.3882 7.1375Z" fill="#EA4335" />
                                    <path d="M12.3671 14.6266C11.4587 15.1402 10.3054 15.4142 9.00042 15.4142C7.76297 15.4164 6.55608 15.0774 5.55061 14.445C4.54514 13.8126 3.79203 12.919 3.39792 11.8906L0.03125 14.1313C0.857288 15.5971 2.13564 16.8304 3.7211 17.6911C5.30656 18.5518 7.13559 19.0055 9.00042 19.0006C11.4446 19.0006 13.7796 18.2386 15.5287 16.8089L12.3679 14.6266H12.3671Z" fill="#34A853" />
                                    <path d="M15.5283 16.5C17.3575 14.9765 18.545 12.709 18.545 9.80484C18.545 9.27667 18.4542 8.70907 18.3183 8.18164H9V11.6311H14.3633C14.0992 12.7909 13.3883 13.6888 12.3675 14.2779L15.5283 16.5Z" fill="#4A90E2" />
                                </svg>

                                Sign in with Google
                            </button>
                            <div className="my-4 flex items-center gap-3" role="separator" aria-label="divider">
                                <span className="h-px flex-1 bg-white/40" aria-hidden="true" />
                                <span className="text-sm text-white/90">Or</span>
                                <span className="h-px flex-1 bg-white/40" aria-hidden="true" />
                            </div>

                            <div>
                                <label htmlFor="email" className="mb-1 block text-sm font-medium text-white">
                                    Sendy Email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-1 ring-inset ring-white/30 placeholder:text-gray-500 focus:ring-2 focus:ring-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-1 block text-sm font-medium text-white">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full rounded-md border-0 bg-white px-3 py-2 text-gray-900 shadow-sm outline-none ring-1 ring-inset ring-white/30 placeholder:text-gray-500 focus:ring-2 focus:ring-white"
                                />
                            </div>

                            <button
                                type="submit"
                                onClick={handleSignin}
                                className="mt-2 mb-6 w-full rounded-md bg-[#2C2C2C] px-4 py-2.5 text-center text-white transition hover:bg-[#272727] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                            >
                                Sign In
                            </button>

                        </form>
                        <p className="mt-6 text-center text-sm text-white/90">
                            <a href="#" className="underline underline-offset-4 hover:text-white">
                                Sign Up
                            </a>
                            <span className="mx-2 text-white/60">|</span>
                            <a href="#" className="underline underline-offset-4 hover:text-white">
                                Forgot Password
                            </a>
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}







