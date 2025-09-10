"use client"

import Image from "next/image"
import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

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
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            console.log(userSnap);

            if (!userSnap.exists()) {
                // If new user, assign default or chosen role
                await setDoc(userRef, {
                    name: user.displayName,
                    email: user.email,
                    status: "active",
                    role: "jobseeker",
                    createdAt: serverTimestamp(),
                    profilePicture: user.photoURL,
                    is_verified: false,
                    phoneNo: "",
                });
            }

            const idToken = await user.getIdToken();



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
                        className="w-full max-w-md  rounded-xl bg-blue-600 p-6 shadow-lg ring-1 ring-blue-700/40 md:p-8"
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
                                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        fill="#EA4335"
                                        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.7-2.6-5.7-5.7S8.9 6 12 6c1.8 0 3 .7 3.7 1.3l2.5-2.5C16.7 3.5 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c6.9 0 9.3-4.8 9.3-7.3 0-.5 0-.8-.1-1.2H12z"
                                    />
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
                                className="mt-2 mb-6 w-full rounded-md bg-orange-500 px-4 py-2.5 text-center text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
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







