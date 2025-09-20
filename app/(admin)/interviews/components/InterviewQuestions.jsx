"use client"
import { useState } from "react"
import { Calendar, Edit3, Clock, User, Target } from "lucide-react"

const InterviewQuestions = ({ onGenerateSuccess, Questions, setQuestions }) => {
    const [editMode, setEditMode] = useState({
        behavioral: [false, false],
        technical: [false, false],
        experience: [false, false],
        problem_solving: [false, false],
        leadership: [false, false]
    })

    const questionCategories = [
        { key: "behavioral", label: "Behavioral", icon: User, color: "bg-blue-100 text-blue-600" },
        { key: "technical", label: "Technical", icon: Target, color: "bg-green-100 text-green-600" },
        { key: "experience", label: "Experience", icon: Calendar, color: "bg-purple-100 text-purple-600" },
        { key: "problem_solving", label: "Problem Solving", icon: Target, color: "bg-red-100 text-red-600" },
        { key: "leadership", label: "Leadership", icon: User, color: "bg-yellow-100 text-yellow-600" }
    ]

    const updateQuestion = (category, index, field, value) => {
        setQuestions(prev => ({
            ...prev,
            [category]: prev[category].map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            )
        }))
    }

    const toggleEditMode = (category, index) => {
        setEditMode(prev => ({
            ...prev,
            [category]: prev[category].map((edit, i) => i === index ? !edit : edit)
        }))
    }




    return (
        <div className="max-w-6xl animate-fadeIn px-6 pb-3">
            <div className="mb-2">
                <h2 className="text-xl font-bold text-orange-500 mb-2">Generate Interview Questions</h2>

                <div className="flex items-center space-x-4 bg-pink-100 rounded-lg p-3 w-80 animate-slideInLeft">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg">
                        <Calendar className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">MERN Stack Developer</h3>
                        <p className="text-sm text-gray-600">Mumbai, India</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <p className="text-orange-500 font-medium">Interview Questions are generated for the Position "MERN Stack Developer"</p>
            </div>

            <div className="space-y-6">
                {questionCategories.map((category, categoryIndex) => (
                    <div key={category.key} className="animate-slideInUp border border-gray-200 rounded-lg p-6 bg-white shadow-sm" style={{ animationDelay: `${categoryIndex * 200}ms` }}>
                        <div className="flex items-center mb-4">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-lg mr-3 ${category.color}`}>
                                <category.icon className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 capitalize">{category.label.replace('_', ' ')}</h3>
                        </div>

                        <div className="space-y-4">
                            {Questions[category.key].map((questionData, index) => {

                                const isEditing = editMode[category.key][index]

                                return (
                                    <div key={index} className="border border-gray-100 rounded-lg p-1 bg-gray-50">
                                        {/* Main Question */}
                                        <div className="flex items-start justify-between ">
                                            <div className="flex-1 mr-4">
                                                {isEditing ? (
                                                    <textarea
                                                        value={questionData.question}
                                                        onChange={(e) => updateQuestion(category.key, index, 'question', e.target.value)}
                                                        className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 resize-none"
                                                        rows={2}
                                                        autoFocus
                                                        onBlur={() => toggleEditMode(category.key, index)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                toggleEditMode(category.key, index)
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <p className="text-gray-800 font-medium cursor-pointer hover:text-orange-600 transition-colors"
                                                        onClick={() => toggleEditMode(category.key, index)}>
                                                        <span className="font-semibold text-orange-500">Q{categoryIndex * 2 + index + 1}:</span> {questionData.question}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => toggleEditMode(category.key, index)}
                                                    className="text-gray-400 hover:text-orange-500 transition-colors"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setQuestions(prev => ({
                                                            ...prev,
                                                            [category.key]: prev[category.key].filter((_, i) => i !== index)
                                                        }))
                                                        setEditMode(prev => ({
                                                            ...prev,
                                                            [category.key]: prev[category.key].filter((_, i) => i !== index)
                                                        }))

                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Remove Question"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                            </div>
                                        </div>



                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-8">
                <button
                    onClick={onGenerateSuccess}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all transform hover:scale-105 shadow-lg font-medium"
                >
                    Generate Link
                </button>
            </div>
        </div>
    )
}

export default InterviewQuestions