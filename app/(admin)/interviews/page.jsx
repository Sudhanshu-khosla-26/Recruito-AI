"use client"
import { useEffect, useState, useRef } from "react"
import Sidebar from "@/_components/sidebar"
import Navbar from "@/_components/navbar"
import CandidatesTable from "./components/CandidatesTable"
import InterviewQuestions from "./components/InterviewQuestions"
import InterviewSuccess from "./components/InterviewSuccess"
import { ChevronUp, X, ArrowRight } from "lucide-react"
import axios from "axios"
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Dashboard = () => {
    const [currentView, setCurrentView] = useState("candidates")
    const [showModal, setShowModal] = useState(false)
    const [selectedCandidate, setSelectedCandidate] = useState(null)
    const [candidates, setCandidates] = useState([])
    const [selectedDuration, setSelectedDuration] = useState("10 Min")
    const [selectedTypes, setSelectedTypes] = useState(["Behavioural"])
    const [customType, setCustomType] = useState("")
    const [Questions, setQuestions] = useState([])
    const [interviewID, setInterviewID] = useState("")
    const [selectedOption, setSelectedOption] = useState("")

    console.log(selectedCandidate, "selected ");

    const renderContent = () => {
        switch (currentView) {
            case "candidates":
                return <CandidatesTable setSelectedOption={setSelectedOption} selectedOption={selectedOption} setSelectedCandidate={setSelectedCandidate} candidates={candidates} onScheduleInterview={() => setShowModal(true)
                } />
            case "questions":
                return <InterviewQuestions Questions={Questions} setQuestions={setQuestions} onGenerateSuccess={() => { saveQuestions() }} />
            case "success":
                return <InterviewSuccess sendMail={sendMail} interviewID={interviewID} onBackToCandidates={() => setCurrentView("candidates")} />
            default:
                return <CandidatesTable onScheduleInterview={() => setShowModal(true)} />
        }
    }


    const sendMail = async () => {
        try {

            const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Interview Scheduled</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
          <table align="center" width="600" style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <tr>
              <td style="background: #4f46e5; padding: 20px; text-align: center; color: white; font-size: 24px; font-weight: bold;">
                Recruito AI
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; color: #333;">
                <h2 style="color: #111; margin-bottom: 10px;">Interview Scheduled 🎉</h2>
                <p style="font-size: 16px; line-height: 1.5;">
                  Dear Candidate,<br/><br/>
                  We are pleased to inform you that your interview has been <b>successfully scheduled</b>.
                </p>
                <p style="font-size: 16px; line-height: 1.5;">
                  Please make sure you are available at the scheduled time. If you need to reschedule, contact our support team.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:3000/interviews/${interviewID}" style="background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                    View Interview Details
                  </a>
                </div>
                <p style="font-size: 14px; color: #666; text-align: center;">
                  © ${new Date().getFullYear()} Recruito AI. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
            const res = await axios.post("/api/Notification/Email", {
                to: selectedCandidate.candidate.applicant_email,
                subject: "Interview Scheduled",
                text: "Your interview is scheduled for tomorrow",
                html: htmlContent,
            });
            console.log(res.data);
        } catch (err) {
            console.error("Error sending mail:", err.response?.data || err);
        }
    };


    const createInterview = async () => {
        try {
            const response = await axios.post("/api/Interviews/Create", {
                job_id: selectedCandidate.job_id,
                application_id: selectedCandidate.application_id,
                mode: "Wai",
                interview_type: selectedTypes,
                duration_minutes: selectedDuration

            })
            console.log("Interview Created:", response.data);
            setInterviewID(response.data.id)

            generateQuestions();

        } catch (error) {
            console.log("Error creating interview:", error);
        }
    }

    const getCandidates = async () => {
        try {
            const response = await axios.get("/api/job/get-all-candidates");

            console.log("✅ API Response:", response.data);

            if (response.data.candidates) {
                console.log("Candidates:", response.data.candidates);
                setCandidates(response.data.candidates);
            } else {
                console.warn("No candidates found in response");
            }
        } catch (error) {
            console.error("❌ Error fetching candidates:", error.response?.data || error.message);
        }
    };

    const generateQuestions = async () => {
        try {
            const response = await axios.post("/api/Interviews/questions/generate-questions-ai", {
                interview_type: selectedTypes,
                duration_minutes: selectedDuration,
                job_id: selectedCandidate.job_id
            });
            console.log("Generated Questions:", response.data.data.questions);
            setQuestions(response.data.data.questions)
            setCurrentView("questions")
        } catch (error) {
            console.log(error);
        }
    }

    const saveQuestions = async () => {
        try {

            for (const [categoryKey, categoryQuestions] of Object.entries(Questions)) {

                for (const questionData of categoryQuestions) {
                    await axios.post("/api/Interviews/questions/save-questions", {
                        interviewId: interviewID,
                        question: questionData,
                        question_type: categoryKey
                    });
                }
            }
            console.log("All questions saved successfully");
            setCurrentView("success")
        } catch (error) {
            console.error("Error saving questions:", error);
        }
    }


    useEffect(() => {
        getCandidates()
    }, [])


    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-auto p-0">{renderContent()}</main>
            </div>

            {showModal && (
                selectedOption === "Interview with HR" ?
                    <SlotModal onClose={() => setShowModal(false)} />
                    :
                    <ScheduleModal
                        onClose={() => setShowModal(false)}
                        onSchedule={() => {
                            setShowModal(false)
                            createInterview();

                        }}
                        setSelectedTypes={setSelectedTypes}
                        customType={customType}
                        selectedTypes={selectedTypes}
                        setCustomType={setCustomType}
                        setSelectedDuration={setSelectedDuration}
                        selectedDuration={selectedDuration}
                    />
            )}
        </div>
    )
}

const ScheduleModal = ({ onClose, onSchedule, setSelectedTypes, customType, selectedTypes, setCustomType, setSelectedDuration, selectedDuration }) => {

    console.log(selectedDuration, selectedTypes);

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
                                        onClick={() => {
                                            console.log(duration)
                                            setSelectedDuration(duration)
                                        }}
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


const SlotModal = ({ onClose }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [email, setEmail] = useState('');

    const handleFetch = () => {
        if (!email || !startDate || !endDate || !startTime) {
            alert('Please fill in all fields.');
            return;
        }
        console.log('Fetching slots with the following data:');
        console.log('HR Email:', email);
        console.log('From Date:', startDate);
        console.log('To Date:', endDate);
        console.log('Duration:', startTime);
        // Add your API call logic here
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white relative rounded-2xl p-6 max-w-3xl w-full mx-4 animate-slideUp">
                <button
                    onClick={onClose}
                    className="absolute top-4 font-bold cursor-pointer  right-6 text-gray-500 hover:text-gray-800"
                >

                    x
                </button>
                <div className="flex flex-col w-full h-fit">
                    <span className="text-orange-500 mx-auto font-bold mb-4">Schedule Interview With Human Resource</span>
                    <div className="flex items-center justify-center gap-3">
                        {/* <Mail className='w-5 h-5 text-gray-400' /> */}
                        <input
                            type="email"
                            name="email"
                            placeholder="Put email ID of HR"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border text-sm text-black border-gray-300 rounded-full px-4 py-0.5 mt-2 w-xs "
                        />
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-4 mx-auto w-full ">
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            placeholderText="From Date"
                            className="w-28 px-4 py-0.5 border border-gray-300 text-sm rounded-full text-black outline-0"
                            dateFormat="MM/dd/yyyy"
                        />


                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            placeholderText="To Date"
                            className="w-28 px-4 py-0.5 border border-gray-300 text-sm rounded-full text-black outline-0"
                            dateFormat="MM/dd/yyyy"
                        />

                        <DatePicker
                            selected={startTime}
                            onChange={(time) => setStartTime(time)}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={30}
                            timeCaption="Time"
                            dateFormat="h:mm aa"
                            placeholderText="Specific Duration"
                            className="w-24 px-4 py-0.5 border border-gray-300 rounded-full text-sm text-black outline-0"
                        />
                        <button
                            onClick={handleFetch}
                            className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Fetch
                        </button>
                    </div>
                    <div className="divider w-5/6 mx-auto my-4 bg-gray-400 h-0.5"></div>

                    <span className="text-gray-700 text-sm mx-auto mb-4">
                        Below are the available Slots: Select and sent invitation
                    </span>
                    <ul className="overglow-y-auto max-h-48 space-y-1 px-4">
                        <li className="flex items-center justify-center gap-1 font-semibold text-sm text-gray-700">
                            <div className="text-blue-600">
                                24-08-2025 :
                            </div>
                            <div className=" cursor-pointer">
                                12:15 to  14:15,
                            </div>
                            <div className="text-blue-600 cursor-pointer">
                                15:10 to 15:40
                            </div>

                        </li>
                        <li className="flex items-center justify-center gap-1 font-semibold text-sm text-gray-700">
                            <div className="">
                                24-08-2025 :
                            </div>
                            <div className="">
                                12:15 to  14:15,
                            </div>
                            <div className="">
                                15:10 to 15:40
                            </div>

                        </li>
                        <li className="flex items-center justify-center gap-1 font-semibold text-sm text-gray-700">
                            <div className="">
                                24-08-2025 :
                            </div>
                            <div className="">
                                12:15 to  14:15,
                            </div>
                            <div className="">
                                15:10 to 15:40
                            </div>

                        </li>
                    </ul>

                    <div className="flex items-center justify-center w-full gap-8  pt-6">
                        <button

                            className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Send to HR
                        </button>
                        <button

                            className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Send to Candidate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard
