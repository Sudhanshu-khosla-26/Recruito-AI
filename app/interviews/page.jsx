"use client"
import { useState } from "react"
import Sidebar from "@/_components/sidebar"
import Navbar from "@/_components/navbar"
import CandidatesTable from "./components/CandidatesTable"
import InterviewQuestions from "./components/InterviewQuestions"
import InterviewSuccess from "./components/InterviewSuccess"
import { ChevronUp, X, ArrowRight } from "lucide-react"

const Dashboard = () => {
    const [currentView, setCurrentView] = useState("candidates")
    const [showModal, setShowModal] = useState(false)

    const renderContent = () => {
        switch (currentView) {
            case "candidates":
                return <CandidatesTable onScheduleInterview={() => setShowModal(true)} />
            case "questions":
                return <InterviewQuestions onGenerateSuccess={() => setCurrentView("success")} />
            case "success":
                return <InterviewSuccess onBackToCandidates={() => setCurrentView("candidates")} />
            default:
                return <CandidatesTable onScheduleInterview={() => setShowModal(true)} />
        }
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
            </div>

            {showModal && (
                <ScheduleModal
                    onClose={() => setShowModal(false)}
                    onSchedule={() => {
                        setShowModal(false)
                        setCurrentView("questions")
                    }}
                />
            )}
        </div>
    )
}

const ScheduleModal = ({ onClose, onSchedule }) => {
    const [selectedDuration, setSelectedDuration] = useState("10 Min")
    const [selectedTypes, setSelectedTypes] = useState(["Behavioural"])
    const [customType, setCustomType] = useState("")

    const durations = ["5 Min", "10 Min", "15 Min", "20 Min", "30 Min"]
    const [types, setTypes] = useState(["Behavioural", "Leadership", "Technical", "Analytical", "Experience"])

    const toggleType = (type) => {
        setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
    }

    const addCustomType = () => {
        if (customType.trim() && !types.includes(customType.trim())) {
            const newType = customType.trim()
            setTypes((prev) => [...prev, newType])
            setSelectedTypes((prev) => [...prev, newType])
            setCustomType("")
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            addCustomType()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white relative rounded-2xl p-6 max-w-3xl  w-full mx-4 animate-slideUp">
                <div className="flex flex-col items-center ">
                    <h2 className="text-lg font-bold text-orange-500 ">Schedule Interview With AI</h2>
                    <p className="text-gray-600 text-sm ml-20">Generate Interview Link</p>
                </div>
                <div className="absolute right-4 top-4 text-gray-500 cursor-pointer " onClick={onClose}><X className="w-4 h-4" /></div>

                <div className="mt-2 shadow-md p-6 rounded-2xl border border-gray-200 space-y-6">
                    <p className="text-center font-semibold text-gray-700 ">Please specify the below Information</p>

                    <div className="flex items-start justify-center pt-4  gap-4">

                        <div>
                            <h3 className="font-semibold text-gray-800 text-center w-28 ">Duration</h3>
                            <div className="space-y-1">
                                {durations.map((duration) => (
                                    <button
                                        key={duration}
                                        onClick={() => setSelectedDuration(duration)}
                                        className={`w-28 text-left text-sm px-4 border-2 rounded-xl transition-all ${selectedDuration === duration
                                            ? "text-blue-500 flex items-center   font-bold  border-gray-500"
                                            : " hover:bg-gray-200 border-transparent text-gray-700"
                                            }`}
                                    >
                                        {duration}
                                        {selectedDuration === duration && (
                                            <ChevronUp className="w-4 h-4 text-gray-500 ml-2" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-1">Select the Type</h3>
                            <div className="flex flex-1  gap-2 mb-4">
                                {types.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => toggleType(type)}
                                        className={`px-4 py-0.5 font-bold  rounded-full border-2 text-sm transition-all ${selectedTypes.includes(type)
                                            ? " text-blue-500  border-gray-500"
                                            : "bg-gray-100 hover:bg-gray-200 border-transparent text-gray-400"
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Others, Specify"
                                    value={customType}
                                    onChange={(e) => setCustomType(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-64 px-4 py-0.5 pr-10 border border-gray-500 text-sm rounded-full text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={addCustomType}
                                    disabled={!customType.trim()}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center space-x-4">

                        <button
                            onClick={onSchedule}
                            className="px-4 py-1 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
                        >
                            Generate Link
                        </button>
                    </div>
                </div>


            </div>
        </div>
    )
}

export default Dashboard
