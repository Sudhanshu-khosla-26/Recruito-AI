"use client"

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/_components/sidebar'
import Navbar from '@/_components/navbar'
import axios from 'axios'
import { useParams } from "next/navigation";
import { X, Download, Mail, User, Phone, FileText } from 'lucide-react'
import { toast } from 'react-toastify'


const page = () => {
    const { id } = useParams();
    const [resumefile, setresumefile] = useState(null);
    const [jobdescription, setjobdescription] = useState(null);
    const [currentpage, setcurrentpage] = useState(0)
    const [isDragging, setIsDragging] = useState(false);
    const [IsAnalyzed, setIsAnalyzed] = useState(false);
    const [formData, setFormData] = useState({
        applicant_name: '',
        applicant_email: "",
        applicant_phone: "",
        status: "applied",
        analyzed_paramters: [],
        match_percentage: "",
        resume_url: "",
        type: "manual-apply"
    });
    const inputRef = useRef(null);

    console.log(resumefile);

    const analyzeResume = async () => {
        try {
            const FORM_DATA = new FormData();
            FORM_DATA.append('resume', resumefile);
            FORM_DATA.append('jobId', jobdescription?.id);
            const response = await axios.post('/api/Applications/Resume-analyze-ai', FORM_DATA);
            console.log(response.data.applicationData);
            if (response.data.success) {
                setFormData({
                    applicant_name: response.data.applicationData.applicant_name,
                    applicant_email: response.data.applicationData.applicant_email,
                    applicant_phone: response.data.applicationData.applicant_phone,
                    status: response.data.applicationData.status,
                    analyzed_paramters: response.data.applicationData.analyze_parameter,
                    match_percentage: response.data.applicationData.match_percentage,
                    resume_url: response.data.applicationData.resume_url,
                });
            }
            setIsAnalyzed(true);

        } catch (error) {
            console.error('Error analyzing resume:', error);
        }
    }

    const nextpage = () => {
        if (currentpage < pages.length - 1) {
            setcurrentpage(currentpage + 1);
        }
    }

    // Drag and Drop Handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            setresumefile(files[0]);
        }
    };


    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setresumefile(files[0]);
        }
    };

    useEffect(() => {
        const fetchJobDescription = async () => {
            try {
                const response = await axios.get(`/api/job/${id}`);
                console.log(response.data);
                setjobdescription(response.data);
            } catch (error) {
                console.error('Error fetching job description:', error);
            }
        }

        fetchJobDescription();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {

        try {
            const response = await axios.post('/api/Applications/create', {
                job_id: jobdescription?.id,
                resume_url: formData.resume_url,
                match_percentage: formData.match_percentage,
                applicant_phone: formData.applicant_phone,
                analyzed_paramters: formData.analyzed_paramters,
                applicant_email: formData.applicant_email,
                applicant_name: formData.applicant_name,
            });
            console.log('Application submitted successfully:', response.data);
            toast.success('Application submitted successfully!');
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Failed to submit application.');
        }
    };



    useEffect(() => {
        if (resumefile?.name) {
            analyzeResume()
        }
    }, [resumefile]);



    const pages = [
        <>
            <div className="bg-[#FEE9E7] rounded-lg p-2 px-4 w-fit mt-4 flex items-center gap-3">
                <div className="bg-[#E9EEF5] p-2 rounded-lg flex items-center justify-center">
                    <FileText className='w-4 h-4 text-black' />
                </div>
                <div className="flex flex-col ">
                    <span className="text-gray-700 text-[14px] ">{jobdescription?.title}</span>
                    <span className="text-[#909399] text-[11px]">{jobdescription?.location}</span>
                </div>
            </div>
            <div className="flex flex-col w-5/6 mx-auto h-full flex-1 items-end">
                <div className="w-full h-full max-h-[390px]  mt-6  bg-white rounded-xl shadow-sm border flex-1 border-gray-200 p-6 px-32  overflow-hidden overflow-y-scroll">

                    <div className="mb-2 flex items-center justify-start">
                        <h3 className="font-semibold text-blue-600">Job Title :</h3>
                        <p className="text-gray-600 text-center ml-1">{jobdescription?.title}</p>
                    </div>

                    <div className="mb-2 flex items-center justify-start">
                        <h4 className="font-semibold text-blue-600">Location :</h4>
                        <p className="text-gray-600 text-sm ml-1">{jobdescription?.location}</p>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-semibold text-blue-600 mb-3">Job Description Details</h4>

                        <div className="space-y-6">
                            {/* About Role */}
                            {jobdescription?.description?.about && (
                                <div>
                                    <h5 className="font-medium text-gray-800">About the Role</h5>
                                    <p className="text-sm text-gray-600 leading-relaxed">{jobdescription?.description.about}</p>
                                </div>
                            )}

                            {/* Key Responsibilities */}
                            {jobdescription?.description?.key_responsibilities && (
                                <div>
                                    <h5 className="font-medium text-gray-800">Key Responsibilities</h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        {jobdescription?.description.key_responsibilities.map((resp, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                {resp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Required Skills */}
                            {jobdescription?.key_skills && (
                                <div>
                                    <h5 className="font-medium text-gray-800">Key Skills</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {jobdescription?.key_skills.map((skill, index) => (
                                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Good to Have */}
                            {jobdescription?.good_to_have_skills && jobdescription?.good_to_have_skills.length > 0 && (
                                <div>
                                    <h5 className="font-medium text-gray-800">Good to Have</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {jobdescription?.good_to_have_skills.map((skill, index) => (
                                            <span key={index} className="px-2 py-1 bg-gray-100 text-blue-900 rounded-md text-xs font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Qualifications */}
                            {jobdescription?.description?.qualifications && (
                                <div>
                                    <h5 className="font-medium text-gray-800">Qualifications</h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        {jobdescription?.description.qualifications.map((qual, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                {qual}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* What We Offer */}
                            {jobdescription?.description?.what_we_offer && (
                                <div>
                                    <h5 className="font-medium text-gray-800">What We Offer</h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        {jobdescription?.description.what_we_offer.map((offer, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                {offer}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Experience & CTC */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <h5 className="font-medium text-gray-800 mb-1">Experience</h5>
                                    <p className="text-sm text-gray-600">{jobdescription?.experience_required || jobdescription?.experience || 'Not specified'}</p>
                                </div>
                                <div>
                                    <h5 className="font-medium text-gray-800 mb-1">CTC Range</h5>
                                    <p className="text-sm text-gray-600">{jobdescription?.ctc_range || jobdescription?.ctcRange || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <div className="flex items-center justify-end w-5/6 mx-auto mt-4">
                <button onClick={() => { nextpage(); }} className='bg-orange-400 hover:bg-orange-500 text-black px-6 py-1.5 rounded-lg cursor-pointer text-sm font-medium'>
                    Apply Now
                </button>
            </div>
        </>
        ,
        <>
            <div className="flex items-center justify-center gap-4 ">

                <span className="text-orange-500 text-sm">

                    Upload Resumes <br />(Doc, PDF only)

                </span>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex items-center justify-center gap-4 text-orange-500 border-2 rounded-xl py-2 px-6 transition-colors duration-200 ${isDragging ? "border-dotted  bg-orange-50 border-orange-400" : " border-gray-400"}`}>

                    <Download className='text-gray-600' />
                    <input onChange={handleFileSelect} type="file" name="" id="" className='hidden' ref={inputRef} />
                    <span className="text-sm">Drag and drop the file(s) to here or <br /> <span onClick={() => inputRef.current.click()} className=" cursor-pointer font-semibold"> use the file browser</span></span>

                </div>

                <button onClick={() => inputRef.current.click()} className="bg-orange-500 text-white rounded-full shadow-md shadow-gray-400  text-sm px-6 py-2">Upload</button>

            </div>
            {resumefile && <div className="bg-gray-100 rounded-lg px-4 py-1 mt-1 w-fit flex items-center justify-center gap-4 ">
                <span className="text-xs text-blue-500">{resumefile.name}</span>
                <span className="text-black cursor-pointer hover:bg-gray-400 rounded-full" onClick={() => {
                    setResumeFile(null);
                    setIsAnalyzed(false);
                    setFormData({
                        applicant_name: '',
                        applicant_email: "",
                        applicant_phone: "",
                        status: "applied",
                        analyzed_paramters: [],
                        match_percentage: "",
                        resume_url: "",
                        type: "manual-apply"
                    })
                }}><X className='w-3 h-3' /></span>
            </div>
            }
            {IsAnalyzed ? (
                <form className='space-y-4 mt-6 min-h-6/6 h-full'>
                    {/* Applicant Name */}
                    <div>
                        <label htmlFor="applicant_name" className="text-gray-700 font-medium flex items-center gap-2 mb-2">
                            <User className="w-5 h-5 text-orange-500" />
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="applicant_name"
                            name="applicant_name"
                            value={formData.applicant_name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                            className="w-full px-4 text-sm py-1 border text-black border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        />
                    </div>

                    {/* Applicant Email */}
                    <div>
                        <label htmlFor="applicant_email" className="text-gray-700 font-medium flex items-center gap-2 mb-2">
                            <Mail className="w-5 h-5 text-orange-500" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="applicant_email"
                            name="applicant_email"
                            value={formData.applicant_email}
                            onChange={handleChange}
                            placeholder="name@example.com"
                            required
                            className="w-full text-black px-4 py-1 border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        />
                    </div>

                    {/* Applicant Phone */}
                    <div>
                        <label htmlFor="applicant_phone" className="text-gray-700 font-medium flex items-center gap-2 mb-2">
                            <Phone className="w-5 h-5 text-orange-500" />
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            id="applicant_phone"
                            name="applicant_phone"
                            value={formData.applicant_phone}
                            onChange={handleChange}
                            placeholder="e.g., +1234567890"
                            required
                            className="w-full text-black px-4 py-1 border border-gray-300 outline-0 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        />
                    </div>
                </form>

            ) : (
                <div className="flex items-center justify-center text-gray-600 text-[15px] min-h-6/6 h-full mt-6">
                    <span className=''>Fields will appear once the clicking on apply and <br /> upload resume will help to fill the fields auto from Resume.</span>
                </div>
            )}
            <div className="w-full flex items-center justify-end mt-4">
                <button disabled={!IsAnalyzed} onClick={() => handleSubmit()} className={`bg-orange-500 text-white rounded-full shadow-md shadow-gray-400  text-sm px-6 py-2 ${IsAnalyzed === false ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>Submit</button>

            </div>
        </>
    ]

    if (!jobdescription) {
        return <div className="flex flex-col gap-4 items-center justify-center h-screen w-screen  bg-white text-orange-500">
            <div className="animate-spin rounded-full h-12 w-12 border-6 border-t-6 border-gray-200 border-t-orange-500"></div>
            <span className="animate-pulse text-xl font-semibold">
                Loading...
            </span>
        </div>;
    }

    return (
        <div className='flex bg-white flex-row h-screen w-screen overflow-hidden '>
            <Sidebar />
            <div className="flex flex-1 flex-col max-w-7xl  w-full h-full  pt-0 ">
                <Navbar />
                <div className='flex flex-col pt-0 pb-0 p-7 max-h-7/12 h-full'>
                    <span className="text-orange-500 font-bold text-sm">
                        Available Job Descriptions
                    </span>
                    {pages[currentpage]}
                </div>
            </div>
        </div>
    )
}

export default page
