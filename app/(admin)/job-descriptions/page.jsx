"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, Wand2, File, X } from 'lucide-react';
import axios from 'axios';
import Navbar from '@/_components/navbar';
import Sidebar from '@/_components/sidebar';

export default function RecruitOAIInterface() {
    const [formData, setFormData] = useState({
        jobTitle: '',
        location: '',
        experience: '',
        ctcRange: '',
        requiredSkills: '',
        goodToHaveSkills: '',
        others: ''
    });

    const [generatedJD, setGeneratedJD] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleJDChange = (field, value, nested = false) => {
        setGeneratedJD(prev => {
            if (!prev) return prev;

            if (nested) {
                return {
                    ...prev,
                    description: {
                        ...prev.description,
                        [field]: value
                    }
                };
            }

            return {
                ...prev,
                [field]: value
            };
        });

        console.log(generatedJD);
    };


    const handleGenerate = async () => {
        setIsGenerating(true);

        const body = {
            jobRole: formData.jobTitle,
            location: formData.location,
            company_name: "NITYA HR",
            yearsOfExperience: formData.experience,
            ctcRange: formData.ctcRange,
            keySkills: formData.requiredSkills.split(',').map(s => s.trim()),
            goodtohaveskills: formData.goodToHaveSkills.split(',').map(s => s.trim()),
            others: formData.others
        }

        console.log("body", body);

        // Simulate API call to your backend
        try {


            const response = await fetch('/api/job/generate-jd-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobRole: formData.jobTitle,
                    location: formData.location,
                    company_name: "NITYA HR",
                    yearsOfExperience: formData.experience,
                    ctcRange: formData.ctcRange,
                    keySkills: formData.requiredSkills.split(',').map(s => s.trim()),
                    goodtohaveskills: formData.goodToHaveSkills.split(',').map(s => s.trim()),
                    others: formData.others
                })
            });


            const result = await response.json();
            console.log(result);
            console.log('Generated JD:', result?.job_description?.raw_text);
            const data = await result.job_description.raw_text.replace("```json", "").replace("```", "");
            const jsondata = await JSON.parse(data);
            console.log(jsondata);
            setGeneratedJD(jsondata);
        } catch (error) {
            console.error('Error generating JD:', error);
            // For demo, show sample data
            setGeneratedJD({
                title: formData.jobTitle,
                companyName: FormData.company_name || "TechCorp Solutions",
                location: formData.location || "Head Office, Mumbai",
                experience_required: formData.experience || "3-5 years",
                ctc_range: formData.ctcRange || "8-12 LPA",
                key_skills: formData.requiredSkills.split(',').map(s => s.trim()).filter(s => s) || ["HR Management", "Recruitment", "Employee Relations"],
                good_to_have_skills: formData.goodToHaveSkills.split(',').map(s => s.trim()).filter(s => s) || ["HRIS Systems", "Data Analytics"],
                description: {
                    about: "Join our dynamic HR team to drive talent acquisition and employee engagement initiatives.",
                    key_responsibilities: [
                        "Manage end-to-end recruitment processes",
                        "Develop and implement HR policies",
                        "Handle employee relations and grievances",
                        "Conduct performance reviews and feedback sessions"
                    ],
                    qualifications: [
                        "Bachelor's degree in HR or related field",
                        "3+ years of HR experience",
                        "Strong communication and interpersonal skills",
                        "Knowledge of labor laws and regulations"
                    ],
                    what_we_offer: [
                        "Competitive salary and benefits",
                        "Professional development opportunities",
                        "Flexible working arrangements",
                        "Health insurance and wellness programs"
                    ]
                }
            });
        }

        setIsGenerating(false);
    };

    const handleCreateJd = async () => {
        setIsGenerating(true);
    };

    const saveJd = async () => {
        try {
            const res = await axios.post('api/job/create-manual', {
                title: generatedJD.title,
                key_skills: generatedJD.key_skills,
                location: generatedJD.location,
                experience_required: generatedJD.experience_required,
                ctc_range: generatedJD.ctc_range,
                companyName: generatedJD.companyName,
                good_to_have_skills: generatedJD.good_to_have_skills,
                description: generatedJD.description
            })
            console.log("savejd", res);
        } catch (error) {
            console.log("error", error);
        }
    }

    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(file =>
            file.type === 'application/pdf' ||
            file.type === 'application/msword' ||
            file.type === 'text/plain' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        console.log(validFiles);
        handleUpload(validFiles[0])
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const validFiles = selectedFiles.filter(file =>
            file.type === 'application/pdf' ||
            file.type === 'text/plain' ||
            file.type === 'application/msword' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        console.log(validFiles);
        handleUpload(validFiles[0])


    };

    const handleUpload = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/job/file-parse', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log(result);
            if (!response.ok) {
                throw new Error(result.error || 'Failed to parse file');
            }

            console.log(result);
            setGeneratedJD(result);
        } catch (err) {
            console.log("err", err);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };



    // const formatFileSize = (bytes) => {
    //     if (bytes === 0) return '0 Bytes';
    //     const k = 1024;
    //     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    //     const i = Math.floor(Math.log(bytes) / Math.log(k));
    //     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    // };





    const panel = [
        <>
            <div className=" flex flex-col  h-full mb-6">
                <h2 className="text-[14px] p-2 pb-3 font-semibold text-blue-900 w-fit">Create Job Description</h2>

                <div className="w-full">

                    {/* Action Buttons */}
                    <div className="flex mb-6">
                        <div className="flex items-center gap-0 relative">

                            <button onClick={() => setActiveTab(0)} className="flex relative py-1 items-center gap-x-3 px-4 text-sm w-36 justify-center border border-transparent border-r-0 bg-orange-400 text-white  cursor-pointer hover:bg-orange-500 transition-colors rounded-l-full rounded-r-0">

                                Create
                            </button>
                            <button onClick={() => setActiveTab(2)} className="flex right-6 relative py-1 items-center gap-x-3 px-4 text-sm w-36 justify-center border border-gray-300  shadow-gray-400 border-r-0  cursor-pointer bg-[#E8E8E8]  text-blue-900 hover:bg-gray-300   rounded-r-0 transition-colors rounded-l-full">

                                Upload
                            </button>
                            <button
                                onClick={() => setActiveTab(1)}
                                disabled={isGenerating}
                                className="flex relative right-9 items-center py-0.5 gap-x-2 px-4 justify-center  w-36 border border-gray-300  text-blue-900 rounded-full hover:bg-gray-300  bg-[#E8E8E8] cursor-pointer transition-colors disabled:opacity-50 "
                            >

                                Generate
                            </button>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="w-full  max-w-xl">
                        <div className="grid grid-cols-2 gap-4 pb-1">
                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                                    placeholder="Eg. Executive Manager"
                                    className="w-full  text-sm px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Experience in years</label>
                                <select
                                    value={formData.experience}
                                    onChange={(e) => handleInputChange('experience', e.target.value)}
                                    className="w-full px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="0-1">0-1</option>
                                    <option value="1-3">1-3</option>
                                    <option value="3-5">3-5</option>
                                    <option value="5-7">5-7</option>
                                    <option value="7-10">7-10</option>
                                    <option value="10+">10+</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm py-1">
                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    placeholder="Eg. Head Office, Mumbai"
                                    className="w-full px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">CTC Range</label>
                                <select
                                    value={formData.ctcRange}
                                    onChange={(e) => handleInputChange('ctcRange', e.target.value)}
                                    className="w-full px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="2-4">2-4 LPA</option>
                                    <option value="4-6 LPA">4-6 LPA</option>
                                    <option value="6-10 LPA">6-10 LPA</option>
                                    <option value="10-15 LPA">10-15 LPA</option>
                                    <option value="15-25 LPA">15-25 LPA</option>
                                    <option value="25+ LPA">25+ LPA</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description Details</label>
                            <textarea
                                rows={2}
                                placeholder="Eg. Type or copy paste - Educational Qualifications, Key Work & Responsibilities, Reporting to..."
                                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>



                        <div>
                            <label className="block py-1 text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Required Specific Skills</label>
                            <input
                                type="text"
                                value={formData.requiredSkills}
                                onChange={(e) => handleInputChange('requiredSkills', e.target.value)}
                                placeholder="Communication, Leadership, Problem-solving, project management..."
                                className="w-full text-sm px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>



                        <div>
                            <label className="block py-1 text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Others</label>
                            <textarea
                                value={formData.others}
                                onChange={(e) => handleInputChange('others', e.target.value)}
                                placeholder="Certificates, Specific Education, etc."
                                rows={4}
                                className="w-full text-sm px-3 py-1 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="mt-6 text-center flex items-center justify-end">

                        <button
                            onClick={handleCreateJd}
                            disabled={isGenerating}
                            className="flex items-center py-1 gap-x-2 px-4 justify-center border border-blue-900 shadow-gray-400  shadow-lg text-blue-900 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <Wand2 size={16} className="text-blue-900" />
                            {isGenerating ? 'Creating JD...' : 'Create JD'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full  max-w-2xl  h-full max-h-sm  overflow-y-hidden ">
                {/* Preview Section */}
                <div className="w-md h-[520px] ml-28  pt-14 overflow-hidden  ">
                    <div className="bg-white h-full text-sm rounded-lg shadow-sm border border-gray-400 p-6 overflow-y-auto">
                        <div className="mb-2 flex items-center justify-start">
                            <h3 className="font-semibold   text-blue-600">Job Title :</h3>
                            <p {...generatedJD && { contentEditable: true, suppressContentEditableWarning: true }} onInput={(e) => handleJDChange('title', e.currentTarget.textContent)} className="text-gray-600 text-center ml-1">{generatedJD?.title || 'Human Resource Manager'}</p>
                        </div>

                        <div className="mb-2 flex items-center justify-start">
                            <h4 className="font-semibold text-blue-600 ">Location :</h4>
                            <p {...generatedJD && { contentEditable: true, suppressContentEditableWarning: true }} onInput={(e) => handleJDChange('location', e.currentTarget.textContent)} className="text-gray-600 text-sm ml-1">{generatedJD?.location || 'Head Office, Mumbai'}</p>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-semibold text-blue-600 mb-3">Job Description Details</h4>

                            {!generatedJD ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Wand2 className="mx-auto mb-3 text-gray-400" size={48} />
                                    <p className="text-xs ">   Based on the search, Job description will populate or the<br />
                                        below message will populate.<br />
                                        If available it will allow to edit the Job Description and ask<br />
                                        to save in a New Name & Location (pop up)
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* About Role */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">About the Role</h5>
                                        <p contentEditable={true} onInput={(e) => handleJDChange('about', e.currentTarget.textContent, true)} className="text-sm text-gray-600 leading-relaxed">{generatedJD?.description?.about}</p>
                                    </div>

                                    {/* Key Responsibilities */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Key Responsibilities</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.key_responsibilities?.map((resp, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    className="flex items-start"
                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.key_responsibilities];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, key_responsibilities: updated }
                                                            };
                                                        });
                                                    }}>
                                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {resp}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Required Skills */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Key Skills</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {generatedJD?.key_skills?.map((skill, index) => (
                                                <span key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.key_skills];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                key_skills: updated
                                                            };
                                                        });
                                                    }} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Good to Have */}
                                    {generatedJD?.good_to_have_skills?.length > 0 && (
                                        <div>
                                            <h5 className="font-medium text-gray-800  ">Good to Have</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {generatedJD?.good_to_have_skills?.map((skill, index) => (
                                                    <span key={index}
                                                        contentEditable={true}
                                                        suppressContentEditableWarning={true}

                                                        onInput={(e) => {
                                                            const value = e.currentTarget.textContent;
                                                            setGeneratedJD(prev => {
                                                                const updated = [...prev.good_to_have_skills];
                                                                updated[index] = value;
                                                                return {
                                                                    ...prev,
                                                                    key_responsibilities: updated
                                                                };
                                                            });
                                                        }} className="px-2 py-1 bg-gray-100 text-blue-900 rounded-md text-xs font-medium">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Qualifications */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Qualifications</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.qualifications?.map((qual, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}

                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.qualifications];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, qualifications: updated }
                                                            };
                                                        });
                                                    }} className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {qual}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* What We Offer */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">What We Offer</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.what_we_offer?.map((offer, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}

                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.what_we_offer];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, what_we_offer: updated }
                                                            };
                                                        });
                                                    }} className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {offer}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Experience & CTC */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-1">Experience</h5>
                                            <p contentEditable={true} suppressContentEditableWarning={true} onInput={(e) => handleJDChange('experience_required', e.currentTarget.textContent)} className="text-sm text-gray-600">{generatedJD?.experience_required}</p>
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-1">CTC Range</h5>
                                            <p contentEditable={true} suppressContentEditableWarning={true} onInput={(e) => handleJDChange('ctc_range', e.currentTarget.textContent)} className="text-sm text-gray-600">{generatedJD?.ctc_range}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Button */}
                    {/* {generatedJD && (
                                        <div className="mt-4 text-center">
                                            <button onClick={() => { saveJd() }} className="px-6 py-1 bg-white border border-gray-300 text-blue-900 rounded-full hover:bg-gray-50 transition-colors font-medium">
                                                Save
                                            </button>
                                        </div>
                                    )} */}
                </div>
            </div>
        </>,
        <>
            <div className=" flex flex-col  h-full mb-6">
                <h2 className="text-[14px] p-2 pb-3 font-semibold text-blue-900 w-fit">Create Job Description</h2>

                <div className="w-full">

                    {/* Action Buttons */}
                    <div className="flex mb-6">
                        <div className="flex items-center gap-0 relative">

                            <button onClick={() => setActiveTab(0)} className="flex relative py-1 items-center gap-x-3 px-4 text-sm w-36 justify-center border border-transparent border-r-0 bg-orange-400 text-white  cursor-pointer hover:bg-orange-500 transition-colors rounded-l-full rounded-r-0">

                                Create
                            </button>
                            <button onClick={() => setActiveTab(2)} className="flex right-6 relative py-1 items-center gap-x-3 px-4 text-sm w-36 justify-center border border-gray-300  shadow-gray-400 border-r-0  cursor-pointer bg-[#E8E8E8]  text-blue-900 hover:bg-gray-300   rounded-r-0 transition-colors rounded-l-full">

                                Upload
                            </button>
                            <button
                                onClick={() => setActiveTab(1)}
                                disabled={isGenerating}
                                className="flex relative right-9 items-center py-0.5 gap-x-2 px-4 justify-center  w-36 border border-gray-300  text-blue-900 rounded-full hover:bg-gray-300  bg-[#E8E8E8] cursor-pointer transition-colors disabled:opacity-50 "
                            >

                                Generate
                            </button>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="w-full  max-w-xl">
                        <div className="grid grid-cols-2 gap-4 pb-1">
                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                                    placeholder="Eg. Executive Manager"
                                    className="w-full  text-sm px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Experience in years</label>
                                <select
                                    value={formData.experience}
                                    onChange={(e) => handleInputChange('experience', e.target.value)}
                                    className="w-full px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="0-1">0-1</option>
                                    <option value="1-3">1-3</option>
                                    <option value="3-5">3-5</option>
                                    <option value="5-7">5-7</option>
                                    <option value="7-10">7-10</option>
                                    <option value="10+">10+</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm py-1">
                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    placeholder="Eg. Head Office, Mumbai"
                                    className="w-full px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900  ">CTC Range</label>
                                <select
                                    value={formData.ctcRange}
                                    onChange={(e) => handleInputChange('ctcRange', e.target.value)}
                                    className="w-full px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="2-4">2-4 LPA</option>
                                    <option value="4-6 LPA">4-6 LPA</option>
                                    <option value="6-10 LPA">6-10 LPA</option>
                                    <option value="10-15 LPA">10-15 LPA</option>
                                    <option value="15-25 LPA">15-25 LPA</option>
                                    <option value="25+ LPA">25+ LPA</option>
                                </select>
                            </div>
                        </div>



                        <div>
                            <label className="block py-1 text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Required Specific Skills</label>
                            <input
                                type="text"
                                value={formData.requiredSkills}
                                onChange={(e) => handleInputChange('requiredSkills', e.target.value)}
                                placeholder="Communication, Leadership, Problem-solving, project management..."
                                className="w-full text-sm px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block py-1 text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Good to have Skills</label>
                            <input
                                type="text"
                                value={formData.goodToHaveSkills}
                                onChange={(e) => handleInputChange('goodToHaveSkills', e.target.value)}
                                placeholder="Analytics skills, etc."
                                className="w-full text-sm px-3 py-1 border border-gray-300 rounded-full text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block py-1 text-sm font-medium ml-1 mb-0.5 text-blue-900  ">Others</label>
                            <textarea
                                value={formData.others}
                                onChange={(e) => handleInputChange('others', e.target.value)}
                                placeholder="Certificates, Specific Education, etc."
                                rows={4}
                                className="w-full text-sm px-3 py-1 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="mt-6 text-center flex items-center justify-end">

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex items-center py-1 gap-x-2 px-4 justify-center border border-blue-900 shadow-gray-400  shadow-lg text-blue-900 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <Wand2 size={16} className="text-blue-900" />
                            {isGenerating ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full  max-w-2xl  h-full max-h-sm  overflow-y-hidden ">
                {/* Preview Section */}
                <div className="w-md h-[520px] ml-28  pt-14 overflow-hidden  ">
                    <div className="bg-white h-full text-sm rounded-lg shadow-sm border border-gray-400 p-6 overflow-y-auto">
                        <div className="mb-2 flex items-center justify-start">
                            <h3 className="font-semibold   text-blue-600">Job Title :</h3>
                            <p {...generatedJD && { contentEditable: true, suppressContentEditableWarning: true }} onInput={(e) => handleJDChange('title', e.currentTarget.textContent)} className="text-gray-600 text-center ml-1">{generatedJD?.title || 'Human Resource Manager'}</p>
                        </div>

                        <div className="mb-2 flex items-center justify-start">
                            <h4 className="font-semibold text-blue-600 ">Location :</h4>
                            <p {...generatedJD && { contentEditable: true, suppressContentEditableWarning: true }} onInput={(e) => handleJDChange('location', e.currentTarget.textContent)} className="text-gray-600 text-sm ml-1">{generatedJD?.location || 'Head Office, Mumbai'}</p>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-semibold text-blue-600 mb-3">Job Description Details</h4>

                            {!generatedJD ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Wand2 className="mx-auto mb-3 text-gray-400" size={48} />
                                    <p className="text-xs ">On click of Generate JD, AI will Generate the Job
                                        <br /> Description and will be populate here.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* About Role */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">About the Role</h5>
                                        <p contentEditable={true} onInput={(e) => handleJDChange('about', e.currentTarget.textContent, true)} className="text-sm text-gray-600 leading-relaxed">{generatedJD?.description?.about}</p>
                                    </div>

                                    {/* Key Responsibilities */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Key Responsibilities</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.key_responsibilities?.map((resp, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    className="flex items-start"
                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.key_responsibilities];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, key_responsibilities: updated }
                                                            };
                                                        });
                                                    }}>
                                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {resp}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Required Skills */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Key Skills</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {generatedJD?.key_skills?.map((skill, index) => (
                                                <span key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.key_skills];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                key_skills: updated
                                                            };
                                                        });
                                                    }} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Good to Have */}
                                    {generatedJD?.good_to_have_skills?.length > 0 && (
                                        <div>
                                            <h5 className="font-medium text-gray-800  ">Good to Have</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {generatedJD?.good_to_have_skills?.map((skill, index) => (
                                                    <span key={index}
                                                        contentEditable={true}
                                                        suppressContentEditableWarning={true}

                                                        onInput={(e) => {
                                                            const value = e.currentTarget.textContent;
                                                            setGeneratedJD(prev => {
                                                                const updated = [...prev.good_to_have_skills];
                                                                updated[index] = value;
                                                                return {
                                                                    ...prev,
                                                                    key_responsibilities: updated
                                                                };
                                                            });
                                                        }} className="px-2 py-1 bg-gray-100 text-blue-900 rounded-md text-xs font-medium">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Qualifications */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Qualifications</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.qualifications?.map((qual, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}

                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.qualifications];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, qualifications: updated }
                                                            };
                                                        });
                                                    }} className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {qual}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* What We Offer */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">What We Offer</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.what_we_offer?.map((offer, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}

                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.what_we_offer];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, what_we_offer: updated }
                                                            };
                                                        });
                                                    }} className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {offer}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Experience & CTC */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-1">Experience</h5>
                                            <p contentEditable={true} suppressContentEditableWarning={true} onInput={(e) => handleJDChange('experience_required', e.currentTarget.textContent)} className="text-sm text-gray-600">{generatedJD?.experience_required}</p>
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-1">CTC Range</h5>
                                            <p contentEditable={true} suppressContentEditableWarning={true} onInput={(e) => handleJDChange('ctc_range', e.currentTarget.textContent)} className="text-sm text-gray-600">{generatedJD?.ctc_range}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Button */}
                    {/* {generatedJD && (
                                    <div className="mt-4 text-center">
                                        <button onClick={() => { saveJd() }} className="px-6 py-1 bg-white border border-gray-300 text-blue-900 rounded-full hover:bg-gray-50 transition-colors font-medium">
                                            Save
                                        </button>
                                    </div>
                                )} */}
                </div>
            </div>
        </>
        ,
        <>
            <div className=" flex flex-col  h-full mb-6">
                <h2 className="text-[14px] p-2 pb-3 font-semibold text-blue-900 w-fit">Create Job Description</h2>

                <div className="w-full">

                    {/* Action Buttons */}
                    <div className="flex mb-6">
                        <div className="flex items-center gap-0 relative">

                            <button onClick={() => setActiveTab(0)} className="flex relative py-1 items-center gap-x-3 px-4 text-sm w-36 justify-center border border-transparent border-r-0 bg-orange-400 text-white  cursor-pointer hover:bg-orange-500 transition-colors rounded-l-full rounded-r-0">

                                Create
                            </button>
                            <button onClick={() => setActiveTab(2)} className="flex right-6 relative py-1 items-center gap-x-3 px-4 text-sm w-36 justify-center border border-gray-300  shadow-gray-400 border-r-0  cursor-pointer bg-[#E8E8E8]  text-blue-900 hover:bg-gray-300   rounded-r-0 transition-colors rounded-l-full">

                                Upload
                            </button>
                            <button
                                onClick={() => setActiveTab(1)}
                                disabled={isGenerating}
                                className="flex relative right-9 items-center py-0.5 gap-x-2 px-4 justify-center  w-36 border border-gray-300  text-blue-900 rounded-full hover:bg-gray-300  bg-[#E8E8E8] cursor-pointer transition-colors disabled:opacity-50 "
                            >

                                Generate
                            </button>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="w-full  max-w-xl">
                        <label className="block text-sm font-medium ml-1 mb-0.5 text-blue-900">
                            Upload Files (DOC, DOCX, TXT, PDF only)
                        </label>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Drag and drop area */}
                        <div
                            onClick={handleClick}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragOver
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                                }
        `}
                        >
                            <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />

                            <div className="space-y-2">
                                <p className={`text-lg font-medium ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    or <span className="text-blue-600 font-medium">click to browse</span>
                                </p>
                                <p className="text-xs text-gray-400">
                                    Supports: PDF, DOC, DOCX files
                                </p>
                            </div>
                        </div>



                    </div>

                    {/* Generate Button */}
                    <div className="mt-6 text-center flex items-center justify-end">

                        <button

                            disabled={isGenerating}
                            className="flex items-center py-1 gap-x-2 px-4 justify-center border border-blue-900 shadow-gray-400  shadow-lg text-blue-900 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            <Wand2 size={16} className="text-blue-900" />
                            {isGenerating ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full  max-w-2xl  h-full max-h-sm  overflow-y-hidden ">
                {/* Preview Section */}
                <div className="w-md h-[520px] ml-28  pt-14 overflow-hidden  ">
                    <div className="bg-white h-full text-sm rounded-lg shadow-sm border border-gray-400 p-6 overflow-y-auto">
                        <div className="mb-2 flex items-center justify-start">
                            <h3 className="font-semibold   text-blue-600">Job Title :</h3>
                            <p {...generatedJD && { contentEditable: true, suppressContentEditableWarning: true }} onInput={(e) => handleJDChange('title', e.currentTarget.textContent)} className="text-gray-600 text-center ml-1">{generatedJD?.title || 'Human Resource Manager'}</p>
                        </div>

                        <div className="mb-2 flex items-center justify-start">
                            <h4 className="font-semibold text-blue-600 ">Location :</h4>
                            <p {...generatedJD && { contentEditable: true, suppressContentEditableWarning: true }} onInput={(e) => handleJDChange('location', e.currentTarget.textContent)} className="text-gray-600 text-sm ml-1">{generatedJD?.location || 'Head Office, Mumbai'}</p>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-semibold text-blue-600 mb-3">Job Description Details</h4>

                            {!generatedJD ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Wand2 className="mx-auto mb-3 text-gray-400" size={48} />
                                    <p className="text-xs ">   Based on the search, Job description will populate or the<br />
                                        below message will populate.<br />
                                        If available it will allow to edit the Job Description and ask<br />
                                        to save in a New Name & Location (pop up)
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* About Role */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">About the Role</h5>
                                        <p contentEditable={true} onInput={(e) => handleJDChange('about', e.currentTarget.textContent, true)} className="text-sm text-gray-600 leading-relaxed">{generatedJD?.description?.about}</p>
                                    </div>

                                    {/* Key Responsibilities */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Key Responsibilities</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.key_responsibilities?.map((resp, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    className="flex items-start"
                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.key_responsibilities];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, key_responsibilities: updated }
                                                            };
                                                        });
                                                    }}>
                                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {resp}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Required Skills */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Key Skills</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {generatedJD?.key_skills?.map((skill, index) => (
                                                <span key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}
                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.key_skills];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                key_skills: updated
                                                            };
                                                        });
                                                    }} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Good to Have */}
                                    {generatedJD?.good_to_have_skills?.length > 0 && (
                                        <div>
                                            <h5 className="font-medium text-gray-800  ">Good to Have</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {generatedJD?.good_to_have_skills?.map((skill, index) => (
                                                    <span key={index}
                                                        contentEditable={true}
                                                        suppressContentEditableWarning={true}

                                                        onInput={(e) => {
                                                            const value = e.currentTarget.textContent;
                                                            setGeneratedJD(prev => {
                                                                const updated = [...prev.good_to_have_skills];
                                                                updated[index] = value;
                                                                return {
                                                                    ...prev,
                                                                    key_responsibilities: updated
                                                                };
                                                            });
                                                        }} className="px-2 py-1 bg-gray-100 text-blue-900 rounded-md text-xs font-medium">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Qualifications */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">Qualifications</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.qualifications?.map((qual, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}

                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.qualifications];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, qualifications: updated }
                                                            };
                                                        });
                                                    }} className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {qual}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* What We Offer */}
                                    <div>
                                        <h5 className="font-medium text-gray-800  ">What We Offer</h5>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {generatedJD?.description?.what_we_offer?.map((offer, index) => (
                                                <li key={index}
                                                    contentEditable={true}
                                                    suppressContentEditableWarning={true}

                                                    onInput={(e) => {
                                                        const value = e.currentTarget.textContent;
                                                        setGeneratedJD(prev => {
                                                            const updated = [...prev.description.what_we_offer];
                                                            updated[index] = value;
                                                            return {
                                                                ...prev,
                                                                description: { ...prev.description, what_we_offer: updated }
                                                            };
                                                        });
                                                    }} className="flex items-start">
                                                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                    {offer}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Experience & CTC */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-1">Experience</h5>
                                            <p contentEditable={true} suppressContentEditableWarning={true} onInput={(e) => handleJDChange('experience_required', e.currentTarget.textContent)} className="text-sm text-gray-600">{generatedJD?.experience_required}</p>
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-gray-800 mb-1">CTC Range</h5>
                                            <p contentEditable={true} suppressContentEditableWarning={true} onInput={(e) => handleJDChange('ctc_range', e.currentTarget.textContent)} className="text-sm text-gray-600">{generatedJD?.ctc_range}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Button */}
                    {/* {generatedJD && (
                                    <div className="mt-4 text-center">
                                        <button onClick={() => { saveJd() }} className="px-6 py-1 bg-white border border-gray-300 text-blue-900 rounded-full hover:bg-gray-50 transition-colors font-medium">
                                            Save
                                        </button>
                                    </div>
                                )} */}
                </div>
            </div>
        </>


    ]

    return (
        <div className="flex h-full max-h-screen bg-gray-50">
            {/* Main Content */}
            <div className="flex-1 flex flex-row overflow-hidden">
                <Sidebar />
                {/* Content Area */}
                <div className="flex-1 p-6 pt-0 h-full ">
                    <Navbar />
                    <div className="max-w-7xl flex flex-row h-full   mx-auto pr-8">
                        {panel[activeTab]}
                    </div>
                </div>
            </div >
        </div >
    );
}