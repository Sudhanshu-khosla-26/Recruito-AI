"use client"

import { useState } from "react"
import { ChevronRight, X, Search, Bell, Menu } from "lucide-react"

const ResumeResults = ({ analyzedResumes = [] }) => {
    const [selectedCandidate, setSelectedCandidate] = useState(null)
    const [showScoreModal, setShowScoreModal] = useState(false)




    const getScoreColor = (score) => {
        if (score >= 9) return "bg-green-500"
        if (score >= 8) return "bg-green-400"
        if (score >= 7) return "bg-red-300"
        if (score >= 6) return "bg-red-400"
        return "bg-red-500"
    }

    const getScoreTextColor = (score) => {
        return "text-white"
    }

    const handleRowClick = (candidate) => {
        setSelectedCandidate(candidate)
        setShowScoreModal(true)
    }

    console.log(analyzedResumes[0], "analyzedResumes")

    const resultsToShow = analyzedResumes[0].length > 0 ? analyzedResumes[0] : []

    return (

        <>
            {/* Main Content */}
            < div className="flex-1 flex flex-col overflow-hidden" >
                {/* Results Table */}
                <div className="flex-1 px-6  overflow-auto " >
                    <div className="bg-white rounded-lg  ">
                        {/* Table Header */}
                        <div className="grid grid-cols-4 gap-4 px-6 py-4  border-gray-200 text-sm font-medium text-gray-700">
                            <div>Name</div>
                            <div>Position (JD)</div>
                            <div>Candidate Phone No.</div>
                            <div>Resume Score</div>
                        </div>

                        {/* Table Rows */}
                        <div className="">
                            {resultsToShow.map((candidate) => (
                                <div
                                    key={candidate?.id}
                                    onClick={() => handleRowClick(candidate)}
                                    className="grid grid-cols-4 gap-4 px-6 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900">{candidate?.applicationData?.applicant_name}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">Full Stack Developer</div>
                                    <div className="text-sm text-gray-600">{candidate?.applicationData?.applicant_phone}</div>
                                    <div>
                                        <span
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(candidate?.applicationData?.match_percentage / 10)} ${getScoreTextColor(candidate?.applicationData?.match_percentage / 10)}`}
                                        >
                                            {candidate?.applicationData?.match_percentage / 10}/10
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div >


            </div >
        </>
    )
}

export default ResumeResults
