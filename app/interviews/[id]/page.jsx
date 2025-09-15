"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Vapi from "@vapi-ai/web";
import { Card, CardContent } from "@/_components/card";
import { Mic, Video, Monitor, User, Phone } from "lucide-react";
import Webcam from "react-webcam";
import Sidebar from "@/_components/sidebar";
import { useParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";

// Environment variable for Vapi key
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPIAI_API_KEY;

function Avatar({ stream }) {
    const { scene } = useGLTF("/3d-interviewer.glb");
    const analyserRef = useRef(null);
    const meshRef = useRef(null);
    const smoothVolume = useRef(0);
    const blinkTimer = useRef(0);
    const headRef = useRef(null);
    const headTargetRotation = useRef({ x: 0, y: 0 });
    const headTimer = useRef(0);

    // Connect WebAudio to the live remote stream for lipsync
    useEffect(() => {
        if (!stream) return;

        const listener = new THREE.AudioListener();
        const audio = new THREE.Audio(listener);
        const audioContext = listener.context || new (window.AudioContext || window.webkitAudioContext)();

        const source = audioContext.createMediaStreamSource(stream);
        audio.setMediaStreamSource(stream);

        const analyser = new THREE.AudioAnalyser(audio, 64);
        analyserRef.current = analyser;

        return () => {
            analyserRef.current = null;
            try {
                source.disconnect();
                audio?.disconnect?.();
                if (audioContext.state === "running") {
                    audioContext.close();
                }
            } catch (e) {
                console.warn("Error cleaning up audio:", e);
            }
        };
    }, [stream]);

    // Find head mesh & bone
    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary && /Head/i.test(child.name)) {
                meshRef.current = child;
            }
            if (child.isBone && /Head/i.test(child.name)) {
                headRef.current = child;
            }
        });
    }, [scene]);

    useFrame((state, delta) => {
        const mesh = meshRef.current;
        if (!mesh) return;

        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;
        if (!dict || !influences) return;

        // Lipsync
        let volume = 0;
        if (analyserRef.current) {
            volume = analyserRef.current.getAverageFrequency() / 200;
            smoothVolume.current += (volume - smoothVolume.current) * 0.3;

            if (dict["jawOpen"] !== undefined) {
                influences[dict["jawOpen"]] = volume > 0.05 ? Math.min(smoothVolume.current, 1) : 0;
            }
        }

        // Blinking
        blinkTimer.current -= delta;
        if (blinkTimer.current <= 0 && dict) {
            if (dict["eyeBlinkLeft"] !== undefined && dict["eyeBlinkRight"] !== undefined) {
                influences[dict["eyeBlinkLeft"]] = 1;
                influences[dict["eyeBlinkRight"]] = 1;
                setTimeout(() => {
                    if (!meshRef.current) return;
                    influences[dict["eyeBlinkLeft"]] = 0;
                    influences[dict["eyeBlinkRight"]] = 0;
                }, 120);
            }
            blinkTimer.current = 3 + Math.random() * 3;
        }

        // Gentle head tilts
        headTimer.current -= delta;
        if (headTimer.current <= 0) {
            headTargetRotation.current = {
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.5) * 0.15,
            };
            headTimer.current = 4 + Math.random() * 4;
        }

        if (headRef.current) {
            headRef.current.rotation.x += (headTargetRotation.current.x - headRef.current.rotation.x) * 0.02;
            headRef.current.rotation.y += (headTargetRotation.current.y - headRef.current.rotation.y) * 0.02;

            const headPos = new THREE.Vector3();
            headRef.current.getWorldPosition(headPos);
            state.camera.lookAt(headPos);
        }
    });

    return <primitive object={scene} scale={14} position={[0, -18.5, 0]} rotation={[0, 0, 0]} />;
}

export default function Page() {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [interviewInfo, setInterviewInfo] = useState(null);
    const [log, setLog] = useState([]);
    const [vapiStatus, setVapiStatus] = useState("idle");
    const [remoteStream, setRemoteStream] = useState(null);
    const [user, setUser] = useState(null);
    const [conversationLog, setConversationLog] = useState([]);

    const { id: interviewId } = useParams();
    const vapiRef = useRef(null);
    const hasStarted = useRef(false);

    // Get current question
    const currentQuestion = questions[currentQuestionIndex] || null;


    console.log(conversationLog);

    // API helpers
    const apiStart = useCallback(async (id) => {
        try {
            const response = await axios.patch("/api/Interviews/start", { interviewId: id });
            if (response.status !== 200) throw new Error("Failed to start interview");
            return response.data;
        } catch (error) {
            console.error("Error starting interview:", error);
            throw error;
        }
    }, []);

    const apiGetQuestions = useCallback(async () => {
        try {
            const response = await axios.post("/api/Interviews/questions/get-questions", { interview_id: interviewId });
            const data = response.data.question;
            setQuestions(data || []);
        } catch (error) {
            console.error("Error fetching questions:", error);
            // Fallback to dummy data
            setQuestions([
                { id: 1, question_text: { question: "Tell me about yourself and your experience." } },
                { id: 2, question_text: { question: "What are your strengths and weaknesses?" } },
                { id: 3, question_text: { question: "Why do you want to work here?" } }
            ]);
        }
    }, [interviewId]);

    const apiGetInterview = useCallback(async () => {
        if (!interviewId) return;

        try {
            const response = await axios.get(`/api/Interviews/${interviewId}`);
            const data = response.data.interview;
            setInterviewInfo(data);
        } catch (error) {
            console.error("Error fetching interview info:", error);
            // Fallback to dummy data
            setInterviewInfo({ title: "Technical Interview", description: "General interview", duration_minutes: 30 });
        }
    }, [interviewId]);

    const endInterview = useCallback(async () => {
        try {
            if (vapiRef.current) {
                vapiRef.current.stop();
            }
            setVapiStatus("ended");
            // You can add a final API call here to save the complete interview state.
        } catch (error) {
            console.error("Error ending interview:", error);
        }
    }, []);

    // Authentication check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return unsubscribe;
    }, []);

    // Fetch interview info and questions
    useEffect(() => {
        if (interviewId) {
            apiGetInterview();
            apiGetQuestions();
        }
    }, [interviewId, apiGetQuestions, apiGetInterview]);

    // **Core Vapi initialization and interview start logic**
    useEffect(() => {
        // Wait for both questions and interviewInfo to be loaded
        if (!questions.length || !interviewInfo || hasStarted.current) {
            return;
        }

        if (!VAPI_PUBLIC_KEY) {
            console.error("Missing NEXT_PUBLIC_VAPIAI_API_KEY");
            return;
        }

        hasStarted.current = true;
        setVapiStatus("connecting");
        apiStart(interviewId);

        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        const assistantOptions = {
            name: "AI Recruiter",
            // The first message now includes the first question as part of the introduction
            firstMessage: `Hello ${user?.displayName || "there"}! Welcome to your interview for ${interviewInfo?.title || "this position"}. I'm excited to learn more about you. Our first question is: ${questions[0]?.question_text?.question}. Please take your time to think about your answer.`,
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: "en-US",
            },
            voice: {
                provider: "playht",
                voiceId: "jennifer",
            },
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a professional AI interviewer conducting a ${interviewInfo.duration_minutes} minute interview for ${interviewInfo.title || "this position"}. Your goal is to maintain a professional conversation flow, guide the candidate, and ask questions systematically.

**KEY RESPONSIBILITIES:**
1.  **Ask a single question at a time.** Wait for the candidate's complete answer before moving on.
2.  **After the candidate answers, analyze their response.** Provide a single sentence of constructive feedback that is both encouraging and specific.
3.  **After feedback, transition smoothly to the next question.** Announce the next question clearly.
4.  If the candidate says "I don't know," "pass," or gives a very short, non-committal answer, politely ask them to elaborate or rephrase the question to help them. Do not move to the next question until you have received a meaningful response or they explicitly ask to move on.
5.  If the candidate is silent for more than 15 seconds after you've asked a question, provide a gentle nudge like, "Take your time, I'm here to listen whenever you're ready," or "Feel free to share your thoughts."
6.  When you have asked all the questions in the provided list, thank the candidate for their time and conclude the interview gracefully.

**LIST OF QUESTIONS TO ASK IN ORDER:**
${questions.map((q, i) => `${i + 1}. ${q.question_text.question}`).join('\n')}

**EXAMPLE CONVERSATION FLOW:**
- Me (AI): "Hello! Let's start with our first question: [Question 1]?"
- Candidate: "[Their answer]"
- Me (AI): "Thank you for that. That was a great start; you provided a good overview. Now, let's move on to the next question: [Question 2]?"
- Candidate: "[Their answer]"
- Me (AI): "That's a very insightful point. To make it even stronger, consider adding an example. The next question is: [Question 3]?"

**CONCLUDING THE INTERVIEW:**
- When all questions are covered, say: "Thank you for completing the interview! We've covered all the questions. The interview will now conclude. You did great, and we'll be in touch with the results soon."`
                    },
                ],
            },
        };

        const handleCallStart = (call) => {
            setVapiStatus("connected");
            if (call?.remoteMediaStream) {
                setRemoteStream(call.remoteMediaStream);
            }
        };

        const handleCallEnd = () => {
            setVapiStatus("ended");
            setRemoteStream(null);
        };


        const handleTranscript = (transcript) => {
            if (transcript.role === "user") {
                setConversationLog(prev => [...prev, { role: "human", text: transcript.text }]);

            }
        };


        const handleMessage = (message) => {
            if (message?.message) {
                setConversationLog(prev => [...prev, { role: "AI", text: message.message }]);
                console.log(conversationLog);
            }
        };


        const handleError = (error) => {
            console.error("Vapi error:", error);
            setLog((prev) => [...prev, `Error: ${error.message || "Unknown error"}`]);
        };


        vapi.on("call-start", handleCallStart);
        vapi.on("call-end", handleCallEnd);
        vapi.on("transcript", handleTranscript);
        vapi.on("message", handleMessage);
        vapi.on("error", handleError);

        // Start the call after setting up listeners
        vapi.start(assistantOptions);

        return () => {
            try {
                vapi.stop();
            } catch (e) {
                console.warn("Error stopping Vapi:", e);
            }
            vapi.removeAllListeners();
            vapiRef.current = null;
        };
    }, [interviewId, user, interviewInfo, questions, apiStart]);

    const statusBadge = {
        connected: { text: "Interview in progress", className: "bg-green-50 text-green-700" },
        connecting: { text: "Connecting...", className: "bg-yellow-50 text-yellow-700" },
        ended: { text: "Interview ended", className: "bg-gray-100 text-gray-700" },
        idle: { text: "Preparing interview...", className: "bg-gray-100 text-gray-700" }
    }[vapiStatus];

    return (
        <div className="flex min-h-screen w-screen bg-gray-50">
            <Sidebar />
            <div className="w-full">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex justify-between w-full items-center gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-600">
                                    Welcome, <span className="text-blue-600 font-medium">{user?.displayName || "Candidate"}</span>
                                </span>
                                {vapiStatus === "connected" && (
                                    <span className="text-sm text-gray-500">
                                        Duration: {interviewInfo?.duration_minutes}m
                                    </span>
                                )}
                            </div>
                            <button className="w-8 h-8 hover:bg-gray-300 text-black rounded-full border border-black">
                                <User className="w-4 h-4 rounded-full text-black mx-auto" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main */}
                <main className="flex-1 p-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col items-center justify-center md:flex-row gap-4 mb-6">
                            {/* AI Interviewer */}
                            <Card className="relative overflow-hidden h-72 w-lg">
                                <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-600 to-purple-800" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                                        AI Interviewer
                                    </span>
                                </div>
                                <CardContent className="absolute bottom-0 h-96 left-0 right-0 p-0 m-0">
                                    <Canvas camera={{ position: [0, 8.5, 36], fov: 25 }} className="w-full h-full">
                                        <ambientLight intensity={0.8} />
                                        <directionalLight position={[2, 2, 2]} intensity={1.2} />
                                        <directionalLight position={[-2, 1, 1]} intensity={0.5} />
                                        <Avatar stream={remoteStream} />
                                    </Canvas>
                                </CardContent>
                            </Card>

                            {/* Candidate */}
                            <Card className="relative overflow-hidden h-72 w-lg">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black" />
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                                        Candidate
                                    </span>
                                </div>
                                <CardContent className="relative h-80 flex items-center justify-center p-0">
                                    <Webcam className="w-max h-max relative" audio={false} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-lg border">
                                <button className="rounded-full bg-black w-12 h-12 p-0" onClick={() => vapiRef.current?.start()}>
                                    <Mic className="w-5 h-5 text-white mx-auto" />
                                </button>
                                <button className="rounded-full bg-black w-12 h-12 p-0">
                                    <Video className="w-5 h-5 text-white mx-auto" />
                                </button>
                                <button className="rounded-full bg-red-500 w-12 h-12 p-0" onClick={endInterview}>
                                    <Phone className="w-5 h-5 text-white mx-auto" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}