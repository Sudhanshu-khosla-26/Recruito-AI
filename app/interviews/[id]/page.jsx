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
        const temp = new THREE.Camera();
        temp.add(listener);

        const audio = new THREE.Audio(listener);
        const ctx = (listener.context || listener).audioContext || listener.context;
        const audioContext = ctx || new (window.AudioContext || window.webkitAudioContext)();

        const source = audioContext.createMediaStreamSource(stream);
        audio.setNodeSource?.(source);
        if (!audio.getOutput && audio.setMediaStreamSource) {
            audio.setMediaStreamSource(stream);
        }

        const analyser = new THREE.AudioAnalyser(audio, 64);
        analyserRef.current = analyser;

        return () => {
            analyserRef.current = null;
            try {
                source.disconnect();
            } catch (e) {
                console.warn("Error disconnecting source:", e);
            }
            try {
                audio?.disconnect?.();
            } catch (e) {
                console.warn("Error disconnecting audio:", e);
            }
            try {
                if (audioContext.state === "running") {
                    audioContext.close();
                }
            } catch (e) {
                console.warn("Error closing audio context:", e);
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

        // Lipsync from analyser
        let volume = 0;
        if (analyserRef.current) {
            volume = analyserRef.current.getAverageFrequency() / 200;
            smoothVolume.current += (volume - smoothVolume.current) * 0.3;

            // Reset morphs
            if (dict["jawOpen"] !== undefined) influences[dict["jawOpen"]] = 0;
            if (dict["eyeBlinkLeft"] !== undefined) influences[dict["eyeBlinkLeft"]] = 0;
            if (dict["eyeBlinkRight"] !== undefined) influences[dict["eyeBlinkRight"]] = 0;

            if (dict["jawOpen"] !== undefined) {
                influences[dict["jawOpen"]] = volume > 0.05 ? Math.min(smoothVolume.current, 1) : 0;
            }
        }

        // Natural blinking
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
    const [answer, setAnswer] = useState("");
    const [log, setLog] = useState([]);
    const [score, setScore] = useState(null);
    const [vapiStatus, setVapiStatus] = useState("idle");
    const [remoteStream, setRemoteStream] = useState(null);
    const [user, setUser] = useState(null);
    const [isInterviewStarted, setIsInterviewStarted] = useState(false);

    // Enhanced state for conversation tracking
    const [conversationHistory, setConversationHistory] = useState([]);
    const [currentScore, setCurrentScore] = useState(null);
    const [currentFeedback, setCurrentFeedback] = useState("");
    const [silenceTimer, setSilenceTimer] = useState(null);
    const [interviewStartTime, setInterviewStartTime] = useState(null);
    const [interviewDuration, setInterviewDuration] = useState(null);

    const { id: interviewId } = useParams();
    const vapiRef = useRef(null);
    const startedRef = useRef(false);
    const lastUserSpeechTime = useRef(null);
    const questionAskedTime = useRef(null);
    const isWaitingForAnswer = useRef(false);

    // Get current question
    const currentQuestion = questions[currentQuestionIndex] || null;

    // Enhanced scoring system
    const calculateScore = (answer, question) => {
        // Basic scoring logic - you can enhance this
        const answerLength = answer.trim().length;
        const hasKeywords = question.toLowerCase().includes('experience') ||
            question.toLowerCase().includes('strength') ||
            question.toLowerCase().includes('weakness');

        let baseScore = 0;

        if (answerLength < 50) baseScore = 30; // Too short
        else if (answerLength < 100) baseScore = 50; // Minimal
        else if (answerLength < 200) baseScore = 70; // Good
        else if (answerLength < 400) baseScore = 85; // Very good
        else baseScore = 90; // Excellent

        // Adjust based on relevance (simplified)
        if (hasKeywords && answerLength > 100) baseScore += 10;

        return Math.min(100, Math.max(0, baseScore + Math.random() * 10 - 5));
    };

    // Enhanced feedback generation
    const generateFeedback = (answer, question, score) => {
        const answerLength = answer.trim().length;
        let feedback = "";

        if (score >= 80) {
            feedback = "Excellent response! You provided comprehensive details and showed good understanding.";
        } else if (score >= 60) {
            feedback = "Good answer. Consider adding more specific examples or details to strengthen your response.";
        } else if (score >= 40) {
            feedback = "Your answer covers the basics. Try to elaborate more and provide concrete examples.";
        } else {
            feedback = "Your response needs more depth. Consider providing specific examples and more detailed explanations.";
        }

        return feedback;
    };

    // Save conversation to database
    const saveConversationToDB = useCallback(async (conversationData) => {
        try {
            // await axios.post('/api/interviews/conversation', {
            //     interviewId,
            //     conversation: conversationData,
            //     timestamp: new Date().toISOString()
            // });

            console.log("Conversation saved:", conversationData);
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }, [interviewId]);

    // Auto-advance to next question
    const moveToNextQuestion = useCallback(async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setAnswer("");
            isWaitingForAnswer.current = false;

            // Small delay before asking next question
            setTimeout(() => {
                if (vapiRef.current) {
                    const nextQuestion = questions[currentQuestionIndex + 1];
                    vapiRef.current.send({
                        type: "response.create",
                        response: {
                            instructions: `Now let's move to the next question: ${nextQuestion.question_text.question}. Please take your time to think about your answer.`
                        },
                    });
                    questionAskedTime.current = Date.now();
                    isWaitingForAnswer.current = true;
                }
            }, 2000);
        } else {
            // End interview
            if (vapiRef.current) {
                vapiRef.current.send({
                    type: "response.create",
                    response: {
                        instructions: "Thank you for completing the interview! We've covered all the questions. The interview will now conclude. You did great, and we'll be in touch with the results soon."
                    },
                });
            }
            setTimeout(() => endInterview(), 5000);
        }
    }, [currentQuestionIndex, questions]);

    // Handle answer submission and auto-advance
    const processAnswer = useCallback(async (answerText) => {
        if (!currentQuestion || !answerText.trim()) return;

        const score = calculateScore(answerText, currentQuestion.question_text.question);
        const feedback = generateFeedback(answerText, currentQuestion.question_text.question, score);

        console.log("Answer processed:", { answerText, score, feedback });

        setCurrentScore(score);
        setCurrentFeedback(feedback);

        // Update conversation history
        const newConversationEntry = {
            questionIndex: currentQuestionIndex,
            question: currentQuestion.question_text.question,
            answer: answerText,
            score: score,
            feedback: feedback,
            timestamp: new Date().toISOString()
        };

        setConversationHistory(prev => [...prev, newConversationEntry]);

        // Save to database
        // try {
        //     await apiAnswer(currentQuestion.id, currentQuestion.question_text.question, answerText);
        // } catch (error) {
        //     console.error('Error saving answer:', error);
        // }

        // Provide feedback through Vapi
        if (vapiRef.current) {
            vapiRef.current.send({
                type: "response.create",
                response: {
                    instructions: `Thank you for your answer. ${feedback} Your score for this question is ${Math.round(score)} out of 100.`
                },
            });
        }

        // Auto-advance after feedback
        setTimeout(() => {
            moveToNextQuestion();
        }, 2000);

    }, [currentQuestion, currentQuestionIndex, moveToNextQuestion]);

    // Handle silence and encourage response
    useEffect(() => {
        let silenceTimeout;

        if (isWaitingForAnswer.current && questionAskedTime.current) {
            const checkSilence = () => {
                const timeSinceQuestion = Date.now() - questionAskedTime.current;
                const timeSinceLastSpeech = lastUserSpeechTime.current ?
                    Date.now() - lastUserSpeechTime.current : timeSinceQuestion;

                // If 30 seconds of silence after question
                if (timeSinceLastSpeech > 30000 && vapiRef.current) {
                    vapiRef.current.send({
                        type: "response.create",
                        response: {
                            instructions: "I notice you're taking some time to think. That's perfectly fine! Feel free to share your thoughts when you're ready. If you need clarification on the question, just let me know."
                        },
                    });
                }

                // If 60 seconds, provide hints
                if (timeSinceLastSpeech > 60000 && vapiRef.current) {
                    vapiRef.current.send({
                        type: "response.create",
                        response: {
                            instructions: "Would you like me to rephrase the question or provide some guidance on how to approach your answer? Remember, there's no perfect answer - I'm interested in hearing your perspective."
                        },
                    });
                }

                // If 2 minutes, gently move forward
                if (timeSinceLastSpeech > 120000) {
                    moveToNextQuestion();
                }
            };

            silenceTimeout = setInterval(checkSilence, 10000); // Check every 10 seconds
        }

        return () => {
            if (silenceTimeout) {
                clearInterval(silenceTimeout);
            }
        };
    }, [isWaitingForAnswer.current, moveToNextQuestion]);

    // API helpers
    const apiStart = useCallback(async (id) => {
        try {
            const response = await axios.patch("/api/Interviews/start", {
                interviewId: id
            });
            if (response.status !== 200) throw new Error("Failed to start interview");
            return response.data;
        } catch (error) {
            console.error("Error starting interview:", error);
            throw error;
        }
    }, []);

    const apiGetQuestions = useCallback(async () => {
        try {
            const response = await axios.post("/api/Interviews/questions/get-questions", {
                interview_id: interviewId
            });
            const data = response.data.question;
            setQuestions(data || []);
            return data;
        } catch (error) {
            console.error("Error fetching questions:", error);
            setQuestions([
                { id: 1, question: "Tell me about yourself and your experience." },
                { id: 2, question: "What are your strengths and weaknesses?" },
                { id: 3, question: "Why do you want to work here?" }
            ]);
        }
    }, [interviewId]);

    const apiAnswer = useCallback(async (questionId, questionText, answerText) => {
        try {
            console.log("check");
            //     const response = await fetch("/api/interviews/answer", {
            //         method: "POST",
            //         headers: { "Content-Type": "application/json" },
            //         body: JSON.stringify({
            //             qnaId: questionId,
            //             question: questionText,
            //             answer: answerText,
            //             score: currentScore,
            //             feedback: currentFeedback
            //         }),
            //     });
            //     if (!response.ok) throw new Error("Failed to submit answer");
            //     return await response.json();
        } catch (error) {
            console.error("Error submitting answer:", error);
            setLog((prev) => [...prev, "Error submitting answer. Please try again."]);
        }
    }, [currentScore, currentFeedback]);

    const apiGetInterview = useCallback(async () => {
        if (!interviewId) return;

        try {
            const response = await axios.get(`/api/Interviews/${interviewId}`);
            const data = response.data.interview;
            setInterviewInfo(data);

            setInterviewDuration(data.duration_minutes)
        } catch (error) {
            console.error("Error fetching interview info:", error);
            setInterviewInfo({ title: "Technical Interview", description: "General interview" });
        }
    }, [interviewId]);

    const endInterview = useCallback(async () => {
        try {
            // Save final conversation history
            await saveConversationToDB(conversationHistory);

            // // End interview in database
            // await axios.patch(`/api/Interviews/end-interview`, {
            //     interviewId,
            //     conversationHistory,
            //     finalScore: conversationHistory.reduce((acc, item) => acc + item.score, 0) / conversationHistory.length
            // });

            // Stop Vapi
            if (vapiRef.current) {
                vapiRef.current.stop();
            }

            setVapiStatus("ended");
        } catch (error) {
            console.error("Error ending interview:", error);
        }
    }, [interviewId, conversationHistory, saveConversationToDB]);

    // Auth state
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

    // Initialize Vapi with enhanced system prompt
    useEffect(() => {
        if (!VAPI_PUBLIC_KEY) {
            console.error("Missing NEXT_PUBLIC_VAPIAI_API_KEY");
            return;
        }

        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        const handleCallStart = (call) => {
            setVapiStatus("connected");
            setInterviewStartTime(Date.now());
            if (call?.remoteMediaStream) {
                setRemoteStream(call.remoteMediaStream);
            }
        };

        const handleCallEnd = () => {
            setVapiStatus("ended");
            setRemoteStream(null);
        };

        const handleTranscript = (transcript) => {
            const entry = `${transcript.role}: ${transcript.text}`;
            setLog((prev) => [...prev, entry]);

            // Update conversation history
            setConversationHistory(prev => {
                const updated = [...prev];
                const lastEntry = updated[updated.length - 1] || {};

                if (transcript.role === "user") {
                    lastUserSpeechTime.current = Date.now();
                    setAnswer(transcript.text);

                    // Check if this is a complete answer
                    if (isWaitingForAnswer.current && transcript.text.length > 20) {
                        processAnswer(transcript.text);
                    }
                }

                return updated;
            });
        };

        const handleMessage = (message) => {
            if (message?.message) {
                setLog((prev) => [...prev, `Assistant: ${message.message}`]);
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

        return () => {
            try {
                vapi.stop();
            } catch (e) {
                console.warn("Error stopping Vapi:", e);
            }
            vapi.removeAllListeners();
            vapiRef.current = null;
        };
    }, [processAnswer]);

    // Start interview with enhanced system prompt
    useEffect(() => {
        const startInterview = async () => {
            if (!interviewId || !vapiRef.current || startedRef.current || questions.length === 0) {
                return;
            }

            startedRef.current = true;
            setIsInterviewStarted(true);
            setVapiStatus("connecting");

            try {
                await apiStart(interviewId);

                const assistantOptions = {
                    name: "AI Recruiter",
                    firstMessage: `Hello ${user?.displayName || "there"}! Welcome to your interview for ${interviewInfo?.title || "this position"}. I'm excited to learn more about you today. We have ${questions.length} questions to cover, and this should take about 30 minutes. Are you ready to begin?`,
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
                                content: `You are a professional AI interviewer conducting a ${interviewDuration} interview for ${interviewInfo?.title || "this position"}. Your goal is to maintain professional conversation flow and gather comprehensive responses.

CORE RESPONSIBILITIES:
1. Ask questions systematically and wait for complete responses
2. Provide encouraging, constructive feedback after each answer based on content quality, relevance, and depth
3. Handle difficult situations professionally
4. Keep the candidate engaged throughout the entire interview duration
5. Ensure every question gets a meaningful response
6. Evaluate answers contextually and provide specific, actionable feedback

QUESTIONS TO ASK IN ORDER:
${questions.map((q, i) => `${i + 1}. ${q.question_text.question}`).join('\n')}

PROFESSIONAL COMMUNICATION GUIDELINES:

FOR ANSWER EVALUATION AND FEEDBACK:
- Assess answers based on: relevance to question, depth of response, specific examples provided, clarity of communication
- Provide constructive feedback that highlights strengths and suggests improvements
- Be specific in feedback: "I appreciate how you provided a concrete example of..." rather than generic praise
- Connect their responses to professional requirements when possible
- Acknowledge effort and thoughtfulness in responses

FOR NON-RESPONSIVE CANDIDATES:
- If candidate says "I don't know" or "Nothing": "I understand this might be challenging. Let me help you think through this. For example, [provide a gentle prompt or reframe the question]. What comes to mind when you think about [specific aspect]?"
- If candidate seems hesitant: "Take your time. There's no rush. Sometimes the best insights come when we reflect a moment. What's the first thing that comes to mind?"
- If candidate gives very short answers: "That's a good start! Could you tell me more about that? I'm particularly interested in [specific follow-up based on their brief response]."

FOR INTELLIGENT FEEDBACK DELIVERY:
- Analyze the content quality, not just length
- Recognize when candidates provide valuable insights even in brief answers
- Identify missing elements: "Your example was great. It would be even stronger if you could tell me about the outcome or what you learned."
- Provide forward-looking suggestions: "For similar situations in the future, you might consider..."
- Balance encouragement with constructive criticism

CONVERSATION FLOW MANAGEMENT:
- After providing feedback, smoothly transition to next question
- Use natural bridges: "Building on what you shared..." or "That gives me great insight into your background. Now let's explore..."
- Maintain interview momentum while ensuring thoroughness
- Reference previous answers when relevant: "Earlier you mentioned X, how does that relate to..."

SCORING CONSIDERATIONS (for backend evaluation):
- Content relevance and depth (40%)
- Use of specific examples and details (30%) 
- Communication clarity and structure (20%)
- Professional insight and self-awareness (10%)

ENGAGEMENT AND PROFESSIONALISM:
- Use the candidate's name occasionally
- Show genuine interest: "That's really insightful," "I hadn't thought about it that way"
- Ask thoughtful follow-ups when appropriate
- Maintain warmth while being professional
- Create a safe space for honest responses

HANDLING VARIOUS RESPONSE TYPES:
- Excellent responses: Provide specific praise and probe for additional insights
- Good responses: Acknowledge strengths and suggest areas for expansion  
- Weak responses: Offer gentle redirection and second chances
- Off-topic responses: Acknowledge value then guide back to question focus

Remember: Your role is to conduct a thorough, fair evaluation while making the candidate feel heard and respected. Every response deserves thoughtful consideration and constructive feedback.

Current question: ${currentQuestion?.question_text.question || "Starting introduction"}`,
                            },
                        ],
                    },
                };

                await vapiRef.current.start(assistantOptions);

                // Start with first question after brief introduction
                if (currentQuestion) {
                    setTimeout(() => {
                        vapiRef.current?.send({
                            type: "response.create",
                            response: {
                                instructions: `Perfect! Let's start with our first question: ${currentQuestion.question_text.question}. Please take your time and share as much detail as you'd like.`
                            },
                        });
                        questionAskedTime.current = Date.now();
                        isWaitingForAnswer.current = true;
                    }, 3000);
                }

            } catch (error) {
                console.error("Error starting interview:", error);
                setVapiStatus("idle");
                startedRef.current = false;
                setIsInterviewStarted(false);
            }
        };

        startInterview();
    }, [interviewId, user, interviewInfo, questions, currentQuestion, apiStart, interviewDuration]);

    // Auto-end interview after duration
    useEffect(() => {
        if (interviewStartTime) {
            const timer = setTimeout(() => {
                if (vapiRef.current && vapiStatus === "connected") {
                    vapiRef.current.send({
                        type: "response.create",
                        response: {
                            instructions: "We've reached the end of our scheduled interview time. Thank you so much for your thoughtful responses today. It's been a pleasure speaking with you, and we'll be in touch soon with next steps."
                        },
                    });
                    setTimeout(() => endInterview(), 5000);
                }
            }, interviewDuration);

            return () => clearTimeout(timer);
        }
    }, [interviewStartTime, interviewDuration, vapiStatus, endInterview]);

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
                                {interviewStartTime && (
                                    <span className="text-sm text-gray-500">
                                        Duration: {Math.floor((Date.now() - interviewStartTime) / 60000)}m
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
                                <button className="rounded-full bg-black w-12 h-12 p-0">
                                    <Mic className="w-5 h-5 text-white mx-auto" />
                                </button>
                                <button className="rounded-full bg-black w-12 h-12 p-0">
                                    <Video className="w-5 h-5 text-white mx-auto" />
                                </button>
                                <button className="rounded-full bg-black w-12 h-12 p-0">
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