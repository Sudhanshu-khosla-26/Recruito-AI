"use client"
import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

const CandidatesTable = ({ onScheduleInterview, candidates, setSelectedCandidate, selectedOption, setSelectedOption }) => {

    const [selectedRow, setSelectedRow] = useState(null)





    const toggleRow = (index, e) => {
        setSelectedCandidate(candidates[index])
        setSelectedOption(e.target.value)
        setSelectedRow(index)
    }

    const options = [
        "Interview with AI",
        "Interview with HR",
        "Interview with HM",
        "Additional Round",
        "Hold",
        "Skip",
        "Not Suitable",
        "Completed",
    ]

    const shouldShowSchedule = (index) => {
        return index === selectedRow && selectedOption && selectedOption !== "Select" && selectedOption !== "Not Suitable" && selectedOption !== "Skip" && selectedOption !== "Hold" && selectedOption !== "Completed"
    }

    return (
        <div className="h-full rounded-xl animate-fadeIn">
            <div className="p-4 md:p-6 ">
                <h2 className="text-lg md:text-xl font-semibold text-orange-500">All candidates</h2>
            </div>

            <div className="overflow-x-hidden">
                <table className="w-full h-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 md:px-6 py-2 md:py-1 text-left text-xs md:text-sm font-medium text-gray-700">Name</th>
                            <th className="px-2 md:px-6 py-2 md:py-1 text-left text-xs md:text-sm font-medium text-gray-700 hidden sm:table-cell">
                                Position (JD)
                            </th>
                            <th className="px-2 md:px-6 py-2 md:py-1 text-left text-xs md:text-sm font-medium text-gray-700 hidden md:table-cell">
                                Location (JD)
                            </th>
                            <th className="px-2 md:px-6 py-2 md:py-1     text-left text-xs md:text-sm font-medium text-gray-700">
                                Resume Score
                            </th>
                            <th className="px-2 md:px-6 py-2 md:py-1 text-left text-xs md:text-sm font-medium text-gray-700">
                                Interview
                            </th>
                            <th className="px-2  md:px-6 py-2 md:py-1"></th>
                        </tr>
                    </thead>
                    <tbody className="">
                        {candidates.map((candidate, index) => (
                            <tr
                                key={index}
                                className="hover:bg-gray-50 transition-colors animate-slideInUp "
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <td className="px-2 md:px-6 py-2 md:py-1">
                                    <button
                                        onClick={() => toggleRow(index)}
                                        className="flex items-center space-x-2 text-gray-900 hover:text-orange-500 transition-colors"
                                    >
                                        <ChevronRight
                                            className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${selectedRow === index ? "rotate-90" : ""}`}
                                        />
                                        <span className="font-medium text-sm md:text-base">{candidate.candidate.applicant_name}</span>
                                    </button>
                                </td>
                                <td className="px-2 md:px-6 py-2 md:py-1 text-gray-700 text-sm md:text-base hidden sm:table-cell">
                                    {candidate.job_title}
                                </td>
                                <td className="px-2 md:px-6 py-2 md:py-1 text-gray-700 text-sm md:text-base hidden md:table-cell">
                                    {candidate.job_location}
                                </td>
                                <td className="px-2 md:px-6 py-2 md:py-1">
                                    <span
                                        className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-white text-xs md:text-sm font-medium bg-green-600`}
                                    >
                                        {candidate.candidate.match_percentage / 10}/10
                                    </span>
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3">
                                    <div className="relative">
                                        <select
                                            value={selectedRow === index ? selectedOption : "Select"}
                                            onChange={(e) => toggleRow(index, e)}
                                            className="flex items-center w-48 space-x-1 md:space-x-2 px-2 md:px-4 py-0.5 md:py-1 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-gray-800"
                                        >
                                            <option className="text-xs md:text-sm text-gray-700">Select</option>
                                            {options.map((option) => (
                                                <option key={option} className="text-xs md:text-sm text-gray-700">{option}</option>
                                            ))}


                                        </select>


                                    </div>
                                </td>
                                <td className="px-3 md:px-6 py-2 md:py-3">
                                    {shouldShowSchedule(index) && (
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
