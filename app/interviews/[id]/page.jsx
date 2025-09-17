"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Vapi from "@vapi-ai/web";
import { Card, CardContent } from "@/_components/card";
import { Mic, Video, Phone, User, Clock, Play } from "lucide-react";
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

        let volume = 0;
        if (analyserRef.current) {
            volume = analyserRef.current.getAverageFrequency() / 200;
            smoothVolume.current += (volume - smoothVolume.current) * 0.3;
            if (dict["jawOpen"] !== undefined) {
                influences[dict["jawOpen"]] = volume > 0.05 ? Math.min(smoothVolume.current, 1) : 0;
            }
        }

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
    const [interviewInfo, setInterviewInfo] = useState(null);
    const [vapiStatus, setVapiStatus] = useState("idle");
    const [remoteStream, setRemoteStream] = useState(null);
    const [user, setUser] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);

    const [conversationLog, setConversationLog] = useState([]);
    console.log("Conversation Log:", conversationLog);

    const { id: interviewId } = useParams();
    const vapiRef = useRef(null);
    const intervalRef = useRef(null);
    const muteTimeoutRef = useRef(null);

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
            setInterviewInfo({ title: "Technical Interview", description: "General interview", duration_minutes: 30 });
        }
    }, [interviewId]);

    const endInterview = useCallback(async () => {
        try {
            if (vapiRef.current) {
                vapiRef.current.stop();
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (muteTimeoutRef.current) {
                clearTimeout(muteTimeoutRef.current);
            }
            setVapiStatus("ended");
            console.log("--- Interview Ended ---");
            console.log("Final Conversation Log:", conversationLog);
            console.log("---");
        } catch (error) {
            console.error("Error ending interview:", error);
        }
    }, [conversationLog]);

    const handleStartInterview = useCallback(async () => {
        if (vapiStatus === "connected" || vapiStatus === "connecting") {
            console.warn("Interview is already in progress or connecting. Aborting start.");
            return;
        }

        if (!questions.length || !interviewInfo) {
            console.error("Interview data (questions or info) is not loaded. Cannot start interview.");
            setVapiStatus("idle");
            return;
        }

        if (!VAPI_PUBLIC_KEY) {
            console.error("Missing NEXT_PUBLIC_VAPIAI_API_KEY. Please check your environment variables.");
            return;
        }

        setVapiStatus("connecting");

        try {
            await apiStart(interviewId);
            console.log("Backend interview start acknowledged.");

            const vapi = new Vapi(VAPI_PUBLIC_KEY);
            vapiRef.current = vapi;

            const displayName = user?.displayName ?? "Candidate";
            const interviewTitle = interviewInfo?.title ?? "a technical interview";
            const durationMinutes = interviewInfo?.duration_minutes ?? "30";
            const firstQuestion = questions[0]?.question_text?.question ?? "Tell me about yourself.";
            const assistantOptions = {
                name: "AI Recruiter",
                firstMessage: `Hello ${displayName}! Welcome to your ${interviewTitle} interview. The duration is ${durationMinutes} minutes. I'm excited to learn more about you. Let's start with our first question: ${firstQuestion}. Feel free to take a moment to collect your thoughts.`,
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    numerals: true,
                    language: "en-US",
                    endpointing: 100, // A low value for responsiveness.
                },
                voice: {
                    voiceId: "Neha",
                    provider: "vapi",
                },
                model: {
                    provider: "openai",
                    model: "gpt-4o",
                    temperature: 0.7,
                    messages: [
                        {
                            role: "system",
                            content: `You are a professional and friendly AI interviewer. Your primary goal is to conduct a professional and engaging conversation with the candidate. Your tone should always remain warm, personable, and encouraging.

**KEY BEHAVIORS:**
1. **Maintain Professionalism:** If the candidate uses offensive or inappropriate language (e.g., swearing, insults), politely but firmly say: "Please remain professional and maintain the decorum of this interview." Do not argue or escalate.
2. **Handle 'I Don't Know':** If the candidate says "I don't know" or seems unsure, ask: "Would you like to switch to the next question, or would you like me to give you a small hint?" If they still cannot answer after the hint, acknowledge it positively and move on.
3. **First Interaction:** After your opening message, do not rush into the first question. Wait for the candidate to say "hello" or give any response. If no response is received for a while, gently say: "Let's start with our first question" and continue.
4. **Prioritize Fluidity and Connection:** Keep your responses quick and natural. Use short affirmations like "I see," "Got it," or "Makes sense" to maintain flow.
5. **Dynamic Responses:** Praise strong answers specifically. If answers are brief, offer encouragement or gently rephrase.
6. **Handle Silence Gracefully:** If the candidate is silent for over 10 seconds, say: "Take your time," or "I'm ready when you are."
7. **Follow the Question List:** Go through the provided questions in order, but in a conversational way.
8. **Concluding with Warmth:** End the interview with thanks and a clear closing message.

**LIST OF QUESTIONS TO ASK IN ORDER:**
${questions.map((q, i) => `${i + 1}. ${q.question_text.question}`).join("\n")}

**EXAMPLE FLOW:**
- Me (AI): "Hello! Let's start with our first question: [Question 1]?"
- Candidate: "[Short answer]"
- Me (AI): "Got it. Thanks for sharing. Let's move to [Question 2]?"
- Candidate: "I don't know."
- Me (AI): "No problem. Would you like me to give a hint, or should we switch to the next one?"
- Candidate: "[Still no answer]"
- Me (AI): "Totally fine, let's move forward. So, [Question 3]?"

**CONCLUSION:**
At the end say: "Thank you so much for your time today! We've covered all the questions, and the interview will now conclude. It was great talking with you, and we'll be in touch with the next steps soon."`
                        }
                    ],
                },
                silenceTimeoutSeconds: 60,
                maxDurationSeconds: durationMinutes * 60,
                backgroundDenoisingEnabled: true,
            };


            vapi.on("call-start", (call) => {
                setVapiStatus("connected");
                if (call?.remoteMediaStream) {
                    setRemoteStream(call.remoteMediaStream);
                }
            });
            vapi.on("call-end", () => {
                setVapiStatus("ended");
                setRemoteStream(null);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            });

            // Use the combined 'message' event for a more robust log
            vapi.on('message', (message) => {
                // Log both AI and human transcripts
                if (message.type === 'transcript') {
                    setConversationLog(prev => [...prev, {
                        role: message.role,
                        text: message.transcript
                    }]);
                    console.log(`[${message.role.toUpperCase()}]: ${message.transcript}`);
                }
                // Also log complete AI messages
                if (message.type === 'assistant-response' && message.message) {
                    const newLogEntry = { role: "AI", text: message.message, timestamp: Date.now() };
                    setConversationLog(prev => [...prev, newLogEntry]);
                    console.log(`[AI]: ${message.message}`);
                }
            });

            vapi.on("error", (error) => {
                console.error("Vapi error:", error);
                setVapiStatus("idle");
            });

            vapi.start(assistantOptions);

        } catch (err) {
            console.error("Failed to start Vapi interview:", err);
            setVapiStatus("idle");
        }
    }, [interviewId, user, interviewInfo, questions, apiStart, vapiStatus]);

    // Button Handlers
    const toggleMute = () => {
        if (!vapiRef.current || vapiStatus !== "connected") return;
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);

        if (newMuteState) {
            vapiRef.current.setMuted(true);
            console.log("Muted. The timer will continue.");
            // Clear any existing timer
            if (muteTimeoutRef.current) {
                clearTimeout(muteTimeoutRef.current);
            }
            // Set new 20-second timer
            muteTimeoutRef.current = setTimeout(() => {
                if (vapiRef.current && isMuted) { // Check if still muted
                    vapiRef.current.send({
                        type: "send-message",
                        message: {
                            text: "Hey, are you there?",
                            type: "custom"
                        }
                    });
                }
            }, 20000);
        } else {
            // Clear the timer when unmuting
            if (muteTimeoutRef.current) {
                clearTimeout(muteTimeoutRef.current);
                muteTimeoutRef.current = null;
            }
            vapiRef.current.setMuted(false);
            console.log("Unmuted. Ready to continue.");
        }
    };

    const toggleCamera = () => {
        setIsCameraOn(!isCameraOn);
    };

    // Authentication and data fetching
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (interviewId) {
            apiGetInterview();
            apiGetQuestions();
        }
    }, [interviewId, apiGetQuestions, apiGetInterview]);

    // Timer logic and automatic end
    useEffect(() => {
        if (vapiStatus === "connected") {
            intervalRef.current = setInterval(() => {
                setElapsedTime(prevTime => prevTime + 1);
            }, 1000);
        } else if (vapiStatus === "ended" && intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [vapiStatus]);

    // Automatic interview end based on duration
    useEffect(() => {
        if (vapiStatus === "connected" && interviewInfo?.duration_minutes) {
            const maxDurationSeconds = interviewInfo.duration_minutes * 60;
            if (elapsedTime >= maxDurationSeconds) {
                console.log("Interview duration exceeded. Ending interview.");
                endInterview();
            }
        }
    }, [elapsedTime, interviewInfo, vapiStatus, endInterview]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const statusBadge = {
        connected: { text: "Interview in progress", className: "bg-green-50 text-green-700" },
        connecting: { text: "Connecting...", className: "bg-yellow-50 text-yellow-700" },
        ended: { text: "Interview ended", className: "bg-gray-100 text-gray-700" },
        idle: { text: "Preparing interview...", className: "bg-gray-100 text-gray-700" }
    }[vapiStatus];

    return (
        <div className="flex min-h-screen w-screen bg-gray-50">
            <Sidebar />
            <div className="w-full flex flex-col">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex justify-between w-full items-center gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-600">
                                    Welcome, <span className="text-blue-600 font-medium">{user?.displayName || "Candidate"}</span>
                                </span>
                                {vapiStatus === "connected" && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatTime(elapsedTime)} / {interviewInfo?.duration_minutes} mins</span>
                                    </div>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                                    {statusBadge.text}
                                </span>
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
                            <Card className="relative overflow-hidden h-72 w-full md:w-1/2">
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
                            <Card className="relative overflow-hidden h-72 w-full md:w-1/2">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black" />
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                                        Candidate
                                    </span>
                                </div>
                                <CardContent className="relative h-80 flex items-center justify-center p-0">
                                    {isCameraOn ? (
                                        <Webcam className="w-max h-max relative" audio={false} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-white/50 h-full w-full">
                                            <Video className="w-12 h-12" />
                                            <span className="mt-2 text-sm">Camera Off</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-lg border">
                                {vapiStatus === "idle" && (
                                    <button
                                        className="rounded-full bg-blue-500 w-12 h-12 p-0 flex items-center justify-center text-white"
                                        onClick={handleStartInterview}
                                    >
                                        <Play className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    className={`rounded-full w-12 h-12 p-0 flex items-center justify-center ${isMuted ? 'bg-gray-400' : 'bg-black'}`}
                                    onClick={toggleMute}
                                    disabled={vapiStatus !== "connected"}
                                >
                                    <Mic className={`w-5 h-5 ${isMuted ? 'text-white' : 'text-white'}`} />
                                </button>
                                <button
                                    className={`rounded-full w-12 h-12 p-0 flex items-center justify-center ${isCameraOn ? 'bg-black' : 'bg-gray-400'}`}
                                    onClick={toggleCamera}
                                >
                                    <Video className={`w-5 h-5 ${isCameraOn ? 'text-white' : 'text-white'}`} />
                                </button>
                                <button
                                    className="rounded-full bg-red-500 w-12 h-12 p-0 flex items-center justify-center"
                                    onClick={endInterview}
                                >
                                    <Phone className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Conversation Log Display */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold mb-4">Conversation Log</h2>
                            <div className="bg-white p-4 rounded-lg shadow-inner max-h-80 overflow-y-auto">
                                {conversationLog.length > 0 ? (
                                    conversationLog.map((entry, index) => (
                                        <div key={index} className={`mb-2 p-2 rounded-md ${entry.role === 'human' ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                            <span className="font-semibold">{entry.role === 'human' ? 'You' : 'AI'}:</span> {entry.text}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500">
                                        No conversation yet. Click 'Start Interview' to begin.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}