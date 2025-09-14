"use client"
import { useState } from "react"
import { Check, Copy, Share, Calendar } from "lucide-react"

const InterviewSuccess = ({ onBackToCandidates, interviewID, sendMail }) => {
    const [copied, setCopied] = useState(false)
    const interviewLink = `http://localhost:3000/interviews/${interviewID}`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(interviewLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }



    return (
        <div className="w-full animate-fadeIn p-6 py-0">
            <div className="">
                <h2 className="text-lg font-bold text-orange-500 mb-2">Generate Interview Questions</h2>

                <div className="flex items-center justify-center space-x-4 w-54 bg-pink-100 rounded-lg p-2 mb-6 animate-slideInLeft">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg">
                        <div className="w-6 h-6 bg-gray-300 rounded"> <Calendar className="h-6 w-6 text-gray-600" /></div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">HR Manager</h3>
                        <p className="text-sm text-gray-600">Mumbai, India</p>
                    </div>
                </div>
            </div>

            <div className=" flex justify-center flex-col flex-1 mb-8 animate-slideInUp">
                <p className="text-orange-500 text-center font-medium mb-6">
                    {'Congratulations!... Interview Link Generated for the Position of "HR Manager"'}
                </p>

                <div className="flex justify-center mb-3">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                        <Check className="h-10 w-10 text-white" />
                    </div>
                </div>

                <p className="text-gray-600 text-center mb-2">Share the link with Candidate and proceed for interview with AI.</p>

                <div className="bg-red-500/60 w-[90%] mx-auto rounded-full p-6 animate-slideInUp" style={{ animationDelay: "300ms" }}>
                    <div className="flex items-center justify-between  rounded-lg ">
                        <span className="text-gray-700 font-mono px-4 bg-white w-5/6 rounded-full py-1 ">{interviewLink}</span>
                        <button
                            onClick={copyToClipboard}
                            className={`px-6 py-2 rounded-lg transition-all transform hover:scale-105 ${copied ? "bg-green-500 text-white" : "bg-orange-500 text-white hover:bg-orange-600"
                                }`}
                        >
                            {copied ? (
                                <div className="flex items-center space-x-2">
                                    <Check className="h-4 w-4" />
                                    <span>Copied!</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Copy className="h-4 w-4" />
                                    <span>Copy Link</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-6 space-x-4">
                <button
                    onClick={onBackToCandidates}
                    className="px-6 py-2 cursor-pointer border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Back to Candidates
                </button>
                <button onClick={sendMail} className="px-8 py-2 cursor-pointer bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all transform hover:scale-105 flex items-center space-x-2">
                    <Share className="h-4 w-4" />
                    <span>Share</span>
                </button>
            </div>
        </div>
    )
}

export default InterviewSuccess
