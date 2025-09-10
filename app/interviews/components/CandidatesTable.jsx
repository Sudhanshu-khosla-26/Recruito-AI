"use client"
import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

const CandidatesTable = ({ onScheduleInterview }) => {
    const [expandedRows, setExpandedRows] = useState({})

    const candidates = [
        {
            id: 1,
            name: "Sana Shaikh",
            position: "HR Manager",
            location: "Mumbai",
            resumeScore: { score: 9.5, color: "bg-green-600" }, // Changed from bg-green-500 to bg-green-600 for better contrast
            status: "Interview with AI",
        },
        {
            id: 2,
            name: "Ratikant Mishra",
            position: "HR Manager",
            location: "Delhi",
            resumeScore: { score: 8.5, color: "bg-green-600" }, // Changed from bg-green-400 to bg-green-600 for better contrast
            status: "Interview with HR",
        },
        {
            id: 3,
            name: "Rohan Singh",
            position: "HR Manager",
            location: "Bangalore",
            resumeScore: { score: 7, color: "bg-red-600" }, // Changed from bg-red-300 to bg-red-600 for better contrast
            status: "Additional Round",
        },
        {
            id: 4,
            name: "John Nderitu",
            position: "HR Manager",
            location: "Delhi",
            resumeScore: { score: 7, color: "bg-red-600" }, // Changed from bg-red-300 to bg-red-600 for better contrast
            status: "Hold",
        },
        {
            id: 5,
            name: "Yashashwi Andhre",
            position: "HR Manager",
            location: "Andhra Pradesh",
            resumeScore: { score: 6, color: "bg-red-700" }, // Changed from bg-red-500 to bg-red-700 for better contrast
            status: "Skip",
        },
    ]

    const toggleRow = (id) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    const getStatusOptions = (currentStatus) => {
        const options = [
            "Interview with HR",
            "Interview with HM",
            "Additional Round",
            "Hold",
            "Skip",
            "Not Suitable",
            "Completed",
        ]
        return options.filter((option) => option !== currentStatus)
    }

    const shouldShowSchedule = (status) => {
        return status === "Interview with AI"
    }

    return (
        <div className=" rounded-xl animate-fadeIn">
            <div className="p-4 md:p-6 ">
                <h2 className="text-lg md:text-xl font-semibold text-orange-500">All candidates</h2>
            </div>

            <div className="overflow-x-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">Name</th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700 hidden sm:table-cell">
                                Position (JD)
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700 hidden md:table-cell">
                                Location (JD)
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                                Resume Score
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-700">
                                Interview
                            </th>
                            <th className="px-3 md:px-6 py-2 md:py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="">
                        {candidates.map((candidate, index) => (
                            <tr
                                key={candidate.id}
                                className="hover:bg-gray-50 transition-colors animate-slideInUp"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <td className="px-3 md:px-6 py-2 md:py-3">
                                    <button
                                        onClick={() => toggleRow(candidate.id)}
                                        className="flex items-center space-x-2 text-gray-900 hover:text-orange-500 transition-colors"
                                    >
                                        <ChevronRight
                                            className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${expandedRows[candidate.id] ? "rotate-90" : ""}`}
                                        />
                                        <span className="font-medium text-sm md:text-base">{candidate.name}</span>
                                    </button>
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3 text-gray-700 text-sm md:text-base hidden sm:table-cell">
                                    {candidate.position}
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3 text-gray-700 text-sm md:text-base hidden md:table-cell">
                                    {candidate.location}
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3">
                                    <span
                                        className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-white text-xs md:text-sm font-medium ${candidate.resumeScore.color}`}
                                    >
                                        {candidate.resumeScore.score}/10
                                    </span>
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3">
                                    <div className="relative">
                                        <button
                                            onClick={() => toggleRow(candidate.id)}
                                            className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-0.5 md:py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-xs md:text-sm text-gray-700">{candidate.status}</span>
                                            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
                                        </button>

                                        {expandedRows[candidate.id] && (
                                            <div className="absolute top-full left-0 mt-1 w-40 md:w-48 bg-white border border-gray-200 rounded-FULL shadow-lg z-10 animate-slideDown">
                                                {getStatusOptions(candidate.status).map((option) => (
                                                    <button
                                                        key={option}
                                                        className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                                                        onClick={() => {
                                                            toggleRow(candidate.id)
                                                            // Handle status change
                                                        }}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3">
                                    {shouldShowSchedule(candidate.status) && (
                                        <button
                                            onClick={onScheduleInterview}
                                            className="px-3 md:px-4 py-1 md:py-2 bg-blue-500 text-white text-xs md:text-sm rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            Schedule
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default CandidatesTable
