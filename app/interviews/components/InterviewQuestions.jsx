"use client"
import { useState } from "react"
import { Calendar, Edit3 } from "lucide-react"

const InterviewQuestions = ({ onGenerateSuccess }) => {
    const [questions, setQuestions] = useState({
        experience: [
            "Tell me about your previous work experience and how it relates to this HR Manager position?",
            "What specific achievements in your HR career are you most proud of?",
            "How many years of experience do you have in human resources management?",
            "Describe a challenging HR situation you've handled and the outcome."
        ],
        behavioral: [
            "Describe a time when you had to handle a difficult employee situation. How did you approach it?",
            "Tell me about a time when you had to implement a new HR policy. How did you ensure employee buy-in?"
        ],
        technical: [
            "What HR software and tools are you proficient in, and how have you used them effectively?",
            "How do you stay updated with changing employment laws and HR regulations?"
        ],
        leadership: [
            "How do you motivate and develop your HR team members?",
            "Describe your approach to leading organizational change initiatives."
        ],
    })

    const [editMode, setEditMode] = useState({
        experience: [false, false, false, false],
        behavioral: [false, false],
        technical: [false, false],
        leadership: [false, false],
    })

    const questionCategories = [
        { key: "experience", label: "Experience", questions: ["Q1", "Q2", "Q3", "Q4"] },
        { key: "behavioral", label: "Behavioral", questions: ["Q5", "Q6"] },
        { key: "technical", label: "Technical", questions: ["Q7", "Q8"] },
        { key: "leadership", label: "Leadership", questions: ["Q9", "Q10"] },
    ]

    const updateQuestion = (category, index, value) => {
        setQuestions((prev) => ({
            ...prev,
            [category]: prev[category].map((q, i) => (i === index ? value : q)),
        }))
    }

    const toggleEditMode = (category, index) => {
        setEditMode((prev) => ({
            ...prev,
            [category]: prev[category].map((edit, i) => (i === index ? !edit : edit)),
        }))
    }

    return (
        <div className="max-w-4xl animate-fadeIn">
            <div className="mb-2">
                <h2 className="text-lg font-bold text-orange-500 mb-2">Generate Interview Questions</h2>

                <div className="flex items-center space-x-4 bg-pink-100 rounded-lg p-2 w-64 animate-slideInLeft">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg">
                        <Calendar className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">HR Manager</h3>
                        <p className="text-sm text-gray-600">Mumbai, India</p>
                    </div>
                </div>
            </div>

            <div className="mb-2">
                <p className="text-orange-500 font-medium">Interview Questions are generated for the Position "HR Manager"</p>
            </div>

            <div className="space-y-1">
                {questionCategories.map((category, categoryIndex) => (
                    <div key={category.key} className="animate-slideInUp" style={{ animationDelay: `${categoryIndex * 200}ms` }}>
                        <h3 className="text-lg font-semibold text-gray-800  mb-1 capitalize">{category.label}</h3>
                        <div className="space-y-2">
                            {category.questions.map((qLabel, index) => (
                                <div key={qLabel} className="relative">
                                    {editMode[category.key][index] ? (
                                        <input
                                            type="text"
                                            placeholder={`Enter ${qLabel} here...`}
                                            value={questions[category.key][index]}
                                            onChange={(e) => updateQuestion(category.key, index, e.target.value)}
                                            className="w-full px-4 py-3 pr-12 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            autoFocus
                                            onBlur={() => toggleEditMode(category.key, index)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    toggleEditMode(category.key, index)
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-pointer hover:bg-gray-100 transition-all">
                                            {questions[category.key][index] || `Enter ${qLabel} here...`}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => toggleEditMode(category.key, index)}
                                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${editMode[category.key][index]
                                            ? 'text-orange-500 hover:text-orange-600'
                                            : 'text-gray-400 hover:text-orange-500'
                                            }`}
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-8">
                <button
                    onClick={onGenerateSuccess}
                    className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all transform hover:scale-105 shadow-lg"
                >
                    Generate Link
                </button>
            </div>
        </div>
    )
}

export default InterviewQuestions