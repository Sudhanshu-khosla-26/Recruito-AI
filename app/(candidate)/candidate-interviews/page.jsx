"use client"

import { useState, useEffect } from 'react'
import { Calendar, Search } from 'lucide-react';
import Sidebar from '@/_components/sidebar';
import Navbar from '@/_components/navbar';
import axios from 'axios';

// Assuming these are imported from other files
// import Navbar from './Navbar';
// import Sidebar from './Sidebar';

// Mock components for Navbar and Sidebar (remove these when you have actual components)


const InterviewDashboard = () => {
    const [activeInterviews, setActiveInterviews] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [interviews, setInterviews] = useState([]);

    // Dummy data for interviews
    const scheduledInterviews = [
        {
            id: 1,
            role: 'HR Manager',
            location: 'Mumbai, India',

            interviewType: 'AI',
            status: 'completed',
            date: null
        },
        {
            id: 2,
            role: 'HR Manager',
            location: 'Mumbai, India',

            interviewType: 'HR',
            date: '15-08-2025 11:15am IST',
            status: 'scheduled'
        },
        {
            id: 3,
            role: 'HR Manager',
            location: 'Mumbai, India',

            interviewType: 'HM',
            date: '15-09-2025 11:15am IST',
            status: 'scheduled'
        },
        {
            id: 4,
            role: 'HR Manager',
            location: 'Mumbai, India',

            interviewType: 'Additional',
            date: '15-09-2025 12:15pm IST',
            status: 'scheduled'
        }
    ];

    const previousInterviews = [
        {
            id: 5,
            role: 'HR Manager',
            location: 'Mumbai, India',
            date: '28-01-2025',
            status: 'Rejected'
        },
        {
            id: 5,
            role: 'HR Manager',
            location: 'Mumbai, India',
            date: '28-01-2025',
            status: 'Rejected'
        },
        {
            id: 5,
            role: 'HR Manager',
            location: 'Mumbai, India',
            date: '28-01-2025',
            status: 'Rejected'
        },
        {
            id: 5,
            role: 'HR Manager',
            location: 'Mumbai, India',
            date: '28-01-2025',
            status: 'Rejected'
        }
    ];

    const getInterviewList = async () => {
        const response = await axios.get("/api/Interviews/get-user-interviews")
        console.log(response.data.interviews)
        setInterviews(response.data.interviews);
    }

    useEffect(() => {
        getInterviewList();
    }, [])


    const handleAction = (interviewId, action) => {
        console.log(`${action} interview ${interviewId}`);
        // Handle the action (Accept, Reject, Reschedule, Complete)
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Navbar */}
                <Navbar />

                {/* Dashboard Content */}
                <div className="flex-1 p-6 pt-0 overflow-auto">
                    {/* Welcome Message */}

                    {/* Active/Scheduled Interviews Toggle */}
                    {activeInterviews ? (
                        <div>
                            {/* Active Interviews Section */}
                            {scheduledInterviews.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-orange-500 text-lg">You don't have any active interviews</p>
                                </div>
                            ) : (
                                <div>
                                    <h2 className="text-orange-500 text-[16px] ">Your interviews schedule</h2>
                                    <p className="text-gray-600 mb-3 w-full text-center text-sm">You have interviews has been scheduled, have a check</p>

                                    {/* Interview Cards Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        {scheduledInterviews.map((interview) => (
                                            <div key={interview.id} className="flex flex-col justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                                <div className="flex items-start mb-3">
                                                    <Calendar className="w-8 h-8 text-gray-600 mr-3 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-blue-500 text-sm font-medium">{interview.role}</p>
                                                        <p className="text-gray-600 text-xs">{interview.location}</p>
                                                        {/* <p className="text-gray-500 text-xs">Job Code: {interview.jobCode}</p> */}
                                                        <p className="text-gray-500 text-xs">
                                                            Interview Type: {interview.interviewType}
                                                        </p>
                                                        {interview.date && (
                                                            <p className="text-gray-500 text-xs">Date: {interview.date}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 justify-center">
                                                    {interview.status === 'completed' ? (
                                                        <button
                                                            onClick={() => handleAction(interview.id, 'completed')}
                                                            className="px-6 py-1.5 bg-orange-500 text-white rounded-full text-xs hover:bg-orange-600 transition-colors"
                                                        >
                                                            Completed
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(interview.id, 'accept')}
                                                                className="px-4 py-1.5 bg-green-500 text-white rounded-full text-xs hover:bg-green-600 transition-colors"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(interview.id, 'reject')}
                                                                className="px-2 py-1.5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(interview.id, 'reschedule')}
                                                                className="px-4 py-1.5 bg-gray-300 text-gray-700 rounded-full text-sm hover:bg-gray-400 transition-colors"
                                                            >
                                                                Reschedule
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {/* Divider */}
                    <div className="border-t border-gray-300 pb-4"></div>

                    {/* Previous Interviews Section */}
                    <div>
                        <div className="flex flex-col  ">

                            <h2 className="text-gray-600 text-[16px] ml-[12vw]">The interview you have given earlier</h2>

                            {/* Search Bar */}
                            <div className="relative flex items-center px-3  ml-auto border border-gray-300 focus:outline-none focus:border-gray-400 rounded-full">
                                <input
                                    type="text"
                                    placeholder="Job title"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full md:w-96 px-1 py-1   text-sm  outline-0 text-black "
                                />
                                <Search className=" w-5 h-5 text-gray-400 cursor-pointer hover:text-black" />
                            </div>
                        </div>

                        {/* Previous Interview Cards */}
                        {previousInterviews.length > 0 ? (
                            <div className="space-y-4">
                                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">

                                    {previousInterviews.map((interview) => (
                                        <li key={interview.id} className="bg-pink-100 rounded-lg p-2 cursor-pointer px-4 w-3xs max-w-xs border border-gray-300 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-gray-200 p-2 rounded-lg ">
                                                    <Calendar className="w-8 h-8 text-gray-600  flex-shrink-0" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[15px] text-gray-800">{interview.role}</p>
                                                    <p className="text-gray-600 text-sm">{interview.location}</p>
                                                    <p className="text-gray-500 text-xs">{interview.date}</p>
                                                    <p className="text-gray-500 text-xs">Status: {interview.status}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="text-center pt-8 text-gray-500 mt-auto">
                                {/* <p>View the entire comment and status of the HR</p>
                                <p>Recruiter of earlier interview. If deleted from HR</p>
                                <p>Side, this will so No interview details found</p> */}

                                <span>No previous interview details found</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewDashboard;