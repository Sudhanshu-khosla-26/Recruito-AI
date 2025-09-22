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
import { toast } from 'react-toastify';

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
                    <SlotModal onClose={() => setShowModal(false)} selectedCandidate={selectedCandidate} />
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


// const SlotModal = ({ onClose, selectedCandidate }) => {
//     const [startDate, setStartDate] = useState(null);
//     const [endDate, setEndDate] = useState(null);
//     const [duration, setDuration] = useState("");
//     const [email, setEmail] = useState('');
//     const [slots, setSlots] = useState([]);
//     const [interviewer, setInterviewer] = useState('');
//     const [selectedSlot, setSelectedSlot] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(false);
//     const [showslots, setShowSlots] = useState(false);

//     const durationRef = useRef(null);
//     console.log(selectedSlot, "selectedSlot");
//     console.log("selectedCandidate", selectedCandidate);

//     const handleFetch = async () => {
//         if (!email || !startDate || !endDate || !duration) {
//             toast.info('Please fill in all fields.');
//             return;
//         }

//         try {
//             const response = await axios.post('/api/calender/slots', {
//                 interviewer_email: email,
//                 startDate: startDate.toISOString(), // safer to send ISO string
//                 endDate: endDate.toISOString(),
//                 duration: duration, // ✅ make sure this is the state, not setDuration
//                 selectedOption: "Whr"
//             });

//             if (response.data.success) {
//                 toast.success('Available slots fetched successfully!');
//             }

//             console.log('Available slots response:', response.data);
//             setSlots(response.data.availableSlots);
//             setInterviewer(response.data.interviewer);
//             setSelectedSlot(null);
//             setShowSlots(true);
//         } catch (error) {
//             toast.error(error?.response?.data?.error);
//         }

//         console.log('Fetching slots with the following data:');
//         console.log('HR Email:', email);
//         console.log('From Date:', startDate);
//         console.log('To Date:', endDate);
//         console.log('Duration:', duration);
//     };
//     const handleSlotSelect = (slotStartTime) => {
//         setSelectedSlot(slotStartTime);
//     };

//     const ScheduleInterview = async () => {

//         if (!selectedSlot) {
//             alert("Please select an available slot first.");
//             return;
//         }


//         let selectedSlotData = null;
//         for (const date in slots) {
//             selectedSlotData = slots[date].find(slot => slot.startTime === selectedSlot);
//             if (selectedSlotData) {
//                 break;
//             }
//         }

//         if (!selectedSlotData) {
//             alert("Selected slot data not found. Please try fetching slots again.");
//             return;
//         }


//         const { startTime, endTime } = selectedSlotData;
//         const mode = "Whr";

//         const data = {
//             interviewer_email: interviewer.email,
//             interviewer_id: interviewer.id,
//             application_id: selectedCandidate.application_id,
//             job_id: selectedCandidate.job_id,
//             candidate_email: selectedCandidate.candidate.applicant_email,
//             candidate_name: selectedCandidate.candidate.applicant_name,
//             candidate_id: selectedCandidate?.candidate?.id || "",
//             startTime: startTime,
//             endTime: endTime,
//             mode: mode,
//         };

//         try {
//             const response = await axios.post('/api/calender/book', data);
//             console.log('Interview booked response:', response.data);
//             toast.success(response.data.message);
//             onClose();
//         } catch (error) {
//             console.error('Error booking interview:', error.response?.data || error.message);
//             toast.error(error.response?.data?.error || "Failed to book interview.");
//         }
//     };

//     return (
//         <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
//             <div className="bg-white relative rounded-2xl p-6 max-w-3xl w-full mx-4 animate-slideUp">
//                 <button
//                     onClick={onClose}
//                     className="absolute top-4 font-bold cursor-pointer  right-6 text-gray-500 hover:text-gray-800"
//                 >

//                     x
//                 </button>
//                 <div className="flex flex-col w-full h-fit">
//                     <span className="text-orange-500 mx-auto font-bold ">Schedule Interview With Human Resource</span>
//                     <div className="flex items-center justify-center gap-3">
//                         {/* <Mail className='w-5 h-5 text-gray-400' /> */}
//                         <input
//                             type="email"
//                             name="email"
//                             placeholder="Put email ID of HR"
//                             value={email}
//                             onChange={(e) => setEmail(e.target.value)}
//                             className="border text-sm text-black border-gray-300 rounded-full px-4 py-0.5 mt-2 w-xs "
//                         />
//                     </div>
//                     <div className="flex items-center justify-center gap-3 mt-4 mx-auto w-full ">
//                         <DatePicker
//                             selected={startDate}
//                             onChange={(date) => setStartDate(date)}
//                             selectsStart
//                             startDate={startDate}
//                             endDate={endDate}
//                             placeholderText="From Date"
//                             className="w-28 px-4 py-0.5 border border-gray-300 text-sm rounded-full text-black outline-0"
//                             dateFormat="MM/dd/yyyy"
//                         />


//                         <DatePicker
//                             selected={endDate}
//                             onChange={(date) => setEndDate(date)}
//                             selectsEnd
//                             startDate={startDate}
//                             endDate={endDate}
//                             minDate={startDate}
//                             placeholderText="To Date"
//                             className="w-28 px-4 py-0.5 border border-gray-300 text-sm rounded-full text-black outline-0"
//                             dateFormat="MM/dd/yyyy"
//                         />

//                         <div className="relative w-36">
//                             <div
//                                 onClick={() => durationRef.current?.focus()}
//                                 className="w-36 px-4 py-1 border border-gray-300 rounded-full text-sm text-black outline-0 cursor-pointer"
//                             >
//                                 {duration ? (duration === 60 ? "1 hour" : `${duration} mins`) : "Select Duration"}

//                             </div>

//                             <select
//                                 ref={durationRef}
//                                 value={duration}
//                                 onChange={(e) => setDuration(Number(e.target.value))}
//                                 className="absolute top-0 text-black text-sm left-0 w-full h-full opacity-0 cursor-pointer"
//                             >
//                                 <option value="">Select Duration</option>
//                                 <option value={15}>15 minutes</option>
//                                 <option value={30}>30 minutes</option>
//                                 <option value={45}>45 minutes</option>
//                                 <option value={60}>1 hour</option>
//                             </select>
//                         </div>


//                         <button
//                             onClick={() => { handleFetch() }}
//                             className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
//                         >
//                             Fetch
//                         </button>
//                     </div>
//                     <div className="divider w-5/6 mx-auto my-4 bg-gray-400 h-0.5"></div>

//                     <span className="text-gray-700 text-sm mx-auto mb-4">
//                         Below are the available Slots: Select and sent invitation
//                     </span>
//                     {/* <ul className="overglow-y-auto max-h-48 space-y-1 px-4">
//                         <li className="flex items-center justify-center gap-1 font-semibold text-sm text-gray-700">
//                             <div className="text-blue-600">
//                                 24-08-2025 :
//                             </div>
//                             <div className=" cursor-pointer">
//                                 12:15 to  14:15,
//                             </div>
//                             <div className="text-blue-600 cursor-pointer">
//                                 15:10 to 15:40
//                             </div>

//                         </li>
//                         <li className="flex items-center justify-center gap-1 font-semibold text-sm text-gray-700">
//                             <div className="">
//                                 24-08-2025 :
//                             </div>
//                             <div className="">
//                                 12:15 to  14:15,
//                             </div>
//                             <div className="">
//                                 15:10 to 15:40
//                             </div>

//                         </li>
//                         <li className="flex items-center justify-center gap-1 font-semibold text-sm text-gray-700">
//                             <div className="">
//                                 24-08-2025 :
//                             </div>
//                             <div className="">
//                                 12:15 to  14:15,
//                             </div>
//                             <div className="">
//                                 15:10 to 15:40
//                             </div>

//                         </li>
//                     </ul> */}
//                     <ul className="overflow-y-auto max-h-48 space-y-2 px-4 max-w-8/12 mx-auto py-2">
//                         {Object.entries(slots).length > 0 ? (
//                             Object.entries(slots).map(([date, dailySlots]) => (
//                                 <li key={date} className="flex flex-col items-start font-semibold text-sm text-gray-700">
//                                     <div className="text-blue-600  mt-2">
//                                         {date}:
//                                     </div>
//                                     <div className="flex flex-wrap flex-row ">
//                                         {dailySlots.map((slot) => (
//                                             <div
//                                                 key={slot.startTime}
//                                                 onClick={() => handleSlotSelect(slot.startTime)}
//                                                 className={`cursor-pointer min-w-3/12 py-0.5   transition-colors ${selectedSlot === slot.startTime ? 'text-blue-500 ' : ''}`}
//                                             >
//                                                 {slot.time}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </li>
//                             ))
//                         ) : (
//                             <li className="text-center text-gray-500">
//                                 No slots available for the selected criteria.
//                             </li>
//                         )}
//                     </ul>
//                     <div className="flex items-center justify-center w-full gap-8  pt-6" onClick={ScheduleInterview}>
//                         <button

//                             className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
//                         >
//                             Schedule Interview
//                         </button>
//                     </div>
//                     {/* <div className="flex items-center justify-center w-full gap-8  pt-6">
//                         <button

//                             className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
//                         >
//                             Send to HR
//                         </button>
//                         <button

//                             className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
//                         >
//                             Send to Candidate
//                         </button>
//                     </div> */}
//                 </div>
//             </div>
//         </div >
//     );
// };

const SlotModal = ({ onClose, selectedCandidate }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [duration, setDuration] = useState("");
    const [email, setEmail] = useState('');
    const [slots, setSlots] = useState({});
    const [interviewer, setInterviewer] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isScheduled, setIsScheduled] = useState(false); // New state for conditional rendering
    const [bookingDetails, setBookingDetails] = useState(null);

    const durationRef = useRef(null);

    const handleFetch = async () => {
        if (!email || !startDate || !endDate || !duration) {
            toast.info('Please fill in all fields.');
            return;
        }

        try {
            const response = await axios.post('/api/calender/slots', {
                interviewer_email: email,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                duration: duration,
                selectedOption: "Whr"
            });

            if (response.data.success) {
                toast.success('Available slots fetched successfully!');
                setSlots(response.data.availableSlots);
                setInterviewer(response.data.interviewer);
                setSelectedSlot(null);
            }

        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to fetch available slots.");
            setSlots({});
            setInterviewer(null);
        }
    };

    const handleSlotSelect = (slotStartTime) => {
        setSelectedSlot(slotStartTime);
    };

    const ScheduleInterview = async () => {
        if (!selectedSlot) {
            toast.info("Please select an available slot first.");
            return;
        }

        let selectedSlotData = null;
        for (const date in slots) {
            selectedSlotData = slots[date].find(slot => slot.startTime === selectedSlot);
            if (selectedSlotData) {
                break;
            }
        }

        if (!selectedSlotData) {
            toast.error("Selected slot data not found. Please try fetching slots again.");
            return;
        }

        const { startTime, endTime } = selectedSlotData;
        const mode = "Whr";

        const data = {
            interviewer_email: interviewer.email,
            interviewer_id: interviewer.id,
            application_id: selectedCandidate.application_id,
            job_id: selectedCandidate.job_id,
            candidate_email: selectedCandidate.candidate.applicant_email,
            candidate_name: selectedCandidate.candidate.applicant_name,
            candidate_id: selectedCandidate?.candidate?.id || null,
            startTime: startTime,
            endTime: endTime,
            mode: mode,
        };

        try {
            const response = await axios.post('/api/calender/book', data);
            toast.success(response.data.message);
            setBookingDetails(response.data);
            setIsScheduled(true); // Show the new screen on success
        } catch (error) {
            console.error('Error booking interview:', error.response?.data || error.message);
            toast.error(error.response?.data?.error || "Failed to book interview.");
        }
    };

    const handleShare = async (sendTo) => {
        if (!bookingDetails) {
            toast.error("Booking details are missing.");
            return;
        }

        try {
            // Here you would add the logic to send notifications.
            // This could be another API call to a notification service.
            console.log(`Sending notification to ${sendTo}...`);
            toast.success(`Invitation sent to ${sendTo} successfully!`);
        } catch (error) {
            toast.error(`Failed to send invitation to ${sendTo}.`);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white relative rounded-2xl p-6 max-w-3xl w-full mx-4 animate-slideUp">
                <button
                    onClick={onClose}
                    className="absolute top-4 font-bold cursor-pointer right-6 text-lg text-center text-gray-500 hover:text-gray-800"
                >
                    x
                </button>

                {/* <div className={`flex transition-transform duration-500 ${isScheduled ? '-translate-x-full' : 'translate-x-0'}`}> */}

                {/* First Screen: Slots Selection */}
                {/* <div className={`flex-shrink-0 w-full  ${isScheduled == false ? "opacity-100" : "opacity-0 pointer-events-none"} `}> */}
                {isScheduled == false && <div className="flex flex-col w-full  h-fit">
                    <span className="text-orange-500 mx-auto font-bold">Schedule Interview With Human Resource</span>
                    <div className="flex items-center justify-center gap-3 mt-3">
                        <input
                            type="email"
                            name="email"
                            placeholder="Put email ID of HR"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border text-sm text-black border-gray-300 rounded-full px-4 py-0.5 mt-2 w-xs "
                        />
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-4 mx-auto w-full">
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            minDate={new Date()}
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
                        <div className="relative w-36">
                            <div
                                onClick={() => durationRef.current?.focus()}
                                className="w-36 px-4 py-1 border border-gray-300 rounded-full text-sm text-black outline-0 cursor-pointer"
                            >
                                {duration ? (duration === 60 ? "1 hour" : `${duration} mins`) : "Select Duration"}
                            </div>
                            <select
                                ref={durationRef}
                                value={duration || ''}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="absolute top-0 text-black text-sm left-0 w-full h-full opacity-0 cursor-pointer"
                            >
                                <option value="">Select Duration</option>
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>1 hour</option>
                            </select>
                        </div>
                        <button
                            onClick={handleFetch}
                            className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Fetch
                        </button>
                    </div>
                    <div className="divider w-5/6 mx-auto my-4 bg-gray-400 h-0.5"></div>
                    <span className="text-gray-700 text-sm mx-auto mb-4">
                        Below are the available Slots: Select and send invitation
                    </span>
                    <ul className="overflow-y-auto max-h-48 space-y-2 px-4 max-w-8/12 mx-auto py-2">
                        {Object.entries(slots).length > 0 ? (
                            Object.entries(slots).map(([date, dailySlots]) => (
                                <li key={date} className="flex flex-col items-start font-semibold text-sm text-gray-700">
                                    <div className="text-blue-600 mt-2">
                                        {date}:
                                    </div>
                                    <div className="flex flex-wrap flex-row ">
                                        {dailySlots.map((slot) => (
                                            <div
                                                key={slot.startTime}
                                                onClick={() => handleSlotSelect(slot.startTime)}
                                                className={`cursor-pointer min-w-3/12 py-0.5 transition-colors ${selectedSlot === slot.startTime ? 'text-blue-500' : ''}`}
                                            >
                                                {slot.time}
                                            </div>
                                        ))}
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="text-center text-gray-500">
                                No slots available for the selected criteria.
                            </li>
                        )}
                    </ul>
                    <div className="flex items-center justify-center w-full gap-8 pt-6">
                        <button
                            onClick={ScheduleInterview}
                            className="bg-orange-500 text-white rounded-full px-6 py-0.5 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Schedule Interview
                        </button>
                    </div>
                </div>
                }
                {/* </div> */}

                {/* Second Screen: Share Buttons */}
                {/* <div className={`flex-shrink-0 w-full flex items-center justify-center ${isScheduled ? "block" : "hidden"} `}> */}
                {isScheduled && <div className="flex flex-col items-center justify-center w-full h-full p-6">
                    <h2 className="text-2xl font-bold text-green-600 mb-4 text-center">Interview Scheduled Successfully!</h2>
                    <p className="text-gray-700 text-sm mb-6 text-center">
                        You can now send the invitation to the candidate and the hiring resources.
                    </p>
                    <div className="flex items-center justify-center w-full gap-8">
                        <button
                            onClick={() => handleShare('HR')}
                            className="bg-orange-400 text-white rounded-full px-6 py-2 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Send to HR
                        </button>
                        <button
                            onClick={() => handleShare('candidate')}
                            className="bg-orange-400 text-white rounded-full px-6 py-2 text-sm cursor-pointer hover:bg-orange-600 transition-colors"
                        >
                            Send to Candidate
                        </button>
                    </div>
                </div>}
                {/* </div> */}
                {/* </div> */}
            </div>
        </div >
    );
};

export default Dashboard
