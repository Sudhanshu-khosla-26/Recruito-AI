"use client"
import Navbar from "@/_components/navbar"
import Sidebar from "@/_components/sidebar"
import axios from "axios"
import { ArrowLeft, ArrowRight, Notebook, FileText, Search, Plus, ChevronLeft, ChevronRight, Upload, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import ResumeResults from "@/_components/resume-results";
import { toast } from 'react-toastify';


const page = () => {

    const fileInputRef = useRef(null)
    const [formdata, setformdata] = useState({
        jobTitle: "",
        experience: "",
        location: "",
        ctcRange: ""
    })
    const [loading, setLoading] = useState(false)
    const [percentage, setpercentage] = useState(0)
    const [jobDescriptions, setJobDescriptions] = useState([]);
    const [filteredJobDescriptions, setFilteredJobDescriptions] = useState([]);
    const [selectedJd, setselectedJd] = useState(null);
    const [share, setShare] = useState(false)
    const [currentPage, setCurrentPage] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [selectedfiles, setselectedfiles] = useState([]);
    const [currentFileName, setCurrentFileName] = useState('');
    const [currentFileIndex, setCurrentFileIndex] = useState(1);
    const [analyzedResume, setanalyzedResume] = useState([])
    const totalPages = 3;


    console.log(uploadedFiles, "uploadedFiles");
    console.log("selectedfiles", selectedfiles);
    console.log(selectedJd, "selectedJd");

    const getallJobDescription = async () => {
        const data = await fetch('/api/job/get-all-jd');
        const json = await data.json();
        setJobDescriptions(json.jobs);
        setFilteredJobDescriptions(json.jobs);
        console.log(json.jobs);
    }



    const handleFiles = (files) => {
        const newFiles = Array.from(files).map((file, index) => ({
            id: Date.now() + index,
            name: file.name,
            type: file.type.includes("pdf") ? "pdf" : "doc",
            file
        }))
        setUploadedFiles((prev) => [...prev, ...newFiles])
    }

    const handleDrop = (e) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
    }

    const handleFileInput = (e) => {
        handleFiles(e.target.files)
    }

    const removeFile = (fileId) => {
        setUploadedFiles((files) => files.filter((file) => file.id !== fileId))
    }

    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1)
        }
    }
    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1)
        }
    }

    const filterJobDescriptions = () => {
        const filtered = jobDescriptions.filter((jd) => {
            const matchesTitle = formdata.jobTitle
                ? jd?.title?.toLowerCase().includes(formdata.jobTitle.toLowerCase())
                : true;

            const matchesExperience = formdata.experience
                ? String(jd?.experience_required || "").toLowerCase() === formdata.experience.toLowerCase()
                : true;

            const matchesLocation = formdata.location
                ? jd?.location?.toLowerCase().includes(formdata.location.toLowerCase())
                : true;

            const matchesCtc = formdata.ctcRange
                ? String(jd?.ctc_range || "").toLowerCase() === formdata.ctcRange.toLowerCase()
                : true;

            return matchesTitle && matchesExperience && matchesLocation && matchesCtc;
        });

        console.log(filtered, "filtered");
        setFilteredJobDescriptions(filtered);
    };


    // const getalltheResults = async () => {
    //     try {
    //         const results = await axios.get("/api/Applications/get-all-applications", {
    //             params: {
    //                 jobid: selectedJd.id
    //             }
    //         });

    //         console.log(results, "results");
    //         console.log(results.data.applications, "applications");
    //     } catch (error) {
    //         console.error("Error fetching applications:", error);
    //     }
    // };


    const handleAnalyze = async () => {
        nextPage();

        if (!selectedJd) {
            alert("Please select a job description first");
            prevPage();
            prevPage();
            return;
        }

        setLoading(true);
        setpercentage(0);
        let completed = 0;
        const total = selectedfiles.length;

        for (let i = 0; i < selectedfiles.length; i++) {
            const file = selectedfiles[i];
            setCurrentFileName(file.file.name); // Update current file name
            setCurrentFileIndex(i + 1); // Update current file index

            const formData = new FormData();
            formData.append("resume", file.file);
            formData.append("jobId", selectedJd.id);

            try {
                const response = await axios.post("/api/job/resume-analyze-create", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                setanalyzedResume(prev => [...prev, response.data]);
                console.log("Analysis result:", response.data);
            } catch (error) {
                console.error("Error analyzing resume:", error);
            }

            completed++;
            const percent = Math.round((completed / total) * 100);
            setpercentage(percent);
        }

        // getalltheResults();
        setLoading(false);
        setCurrentFileName('');
        setCurrentFileIndex(1);
        setselectedfiles([]);
        setUploadedFiles([]);
    }

    const getStage = (percent) => {
        if (percent === 0) return 'Initializing';
        if (percent < 25) return 'Parsing Resume';
        if (percent < 50) return 'Analyzing Skills';
        if (percent < 75) return 'Matching Experience';
        if (percent < 95) return 'Generating Score';
        if (percent < 100) return 'Finalizing Results';
        return 'Complete';
    };

    const currentStage = getStage(percentage);

    useEffect(() => {
        // toast.success("Welcome to dashboard", { position: "top-right", autoClose: 2000 });
        // toast("Welcome to dashboard")
        // toast("Welcome to dashboard")
        getallJobDescription();
    }, []);


    return (
        <div className="w-container h-full w-full max-w-screen h-max-screen flex overflow-hidden text-sm bg-white text-black">
            <Sidebar />

            <div className="flex flex-1 flex-col overflow-hidden">
                <Navbar className="px-6" />
                <div className="relative h-full overflow-hidden">

                    <div
                        className="flex h-full transition-transform duration-700 ease-in-out"
                        style={{
                            transform: `translateX(-${currentPage * (100 / totalPages)}%)`,
                            width: `${totalPages * 100}%`,
                        }}
                    >


                        <div className="flex-1 px-6  pt-0 pb-0 flex-shrink-0 overflow-hidden" style={{ width: `${100 / totalPages}%` }}>
                            {/* Header Section */}
                            <div className="relative flex items-start flex-col">
                                <h1 className="text-sm font-semibold w-fit text-blue-900 mb-12">Job Description</h1>

                                <div className="absolute  top-2 left-0 right-0 w-full flex-1">
                                    <div className="flex items-center justify-center gap-4 mb-4 text-black">
                                        <div>
                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">Job Title</label>
                                            <input
                                                type="text"
                                                value={formdata.jobTitle}
                                                onChange={(e) => setformdata({ ...formdata, jobTitle: e.target.value })}
                                                placeholder="Human Resource Manager"
                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">Experience in years</label>
                                            <select
                                                value={formdata.experience}
                                                onChange={(e) => setformdata({ ...formdata, experience: e.target.value })}
                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            >
                                                <option value="">Any Experience</option>
                                                <option value="0-1">0-1</option>
                                                <option value="1-3">1-3</option>
                                                <option value="3-5">3-5</option>
                                                <option value="5-7">5-7</option>
                                                <option value="7-10">7-10</option>
                                                <option value="10+">10+</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">Location</label>
                                            <input
                                                type="text"
                                                value={formdata.location}
                                                onChange={(e) => setformdata({ ...formdata, location: e.target.value })}
                                                placeholder="Head office, Mumbai"
                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">CTC Range</label>
                                            <select
                                                value={formdata.ctcRange}
                                                onChange={(e) => setformdata({ ...formdata, ctcRange: e.target.value })}
                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            >
                                                <option value="">Any CTC</option>
                                                <option value="2-4">2-4 LPA</option>
                                                <option value="4-6 LPA">4-6 LPA</option>
                                                <option value="6-10 LPA">6-10 LPA</option>
                                                <option value="10-15 LPA">10-15 LPA</option>
                                                <option value="15-25 LPA">15-25 LPA</option>
                                                <option value="25+ LPA">25+ LPA</option>
                                            </select>
                                        </div>

                                        <div className="flex items-end justify-center">
                                            <button
                                                onClick={filterJobDescriptions}
                                                className="flex items-center gap-2 bg-orange-500 mt-[20px] hover:bg-orange-600 text-white w-8 justify-center h-8  py-1 rounded-full transition-colors"
                                            >
                                                <Search className="h-4 w-4" />

                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Panel - Job Details */}

                                </div>
                            </div>


                            {/* Filter Section */}



                            <div className="flex gap-10">
                                <div className="flex-[1] rounded-xl  p-6 pb-0 overflow-hidden">
                                    <div className="flex items-center gap-4 mb-6">
                                        <h2 className="text-lg font-semibold text-blue-900">Available Job Descriptions</h2>
                                        <button className="flex items-center gap-2 text-orange-500 hover:text-orange-600 text-sm font-medium">
                                            <Plus className="h-4 w-4" />
                                            Create a Job Description
                                        </button>
                                    </div>

                                    {/* Job Grid */}



                                    {filteredJobDescriptions.length === 0 ? (
                                        <div className="flex flex-col flex-1 items-center justify-center py-12 text-gray-500">
                                            <Search className="w-12 h-12 mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No jobs found</p>
                                            <p className="text-sm">Try adjusting your search criteria</p>
                                        </div>
                                    ) :
                                        <div className={`grid grid-cols-1 md:grid-cols-2  gap-4 overflow-y-auto
                                    ${selectedJd ? "lg:grid-cols-1 w-64 max-h-90  mb-0" : "lg:grid-cols-4 mb-6  max-h-96 "}
                                `}>
                                            {selectedJd?.length > 0 ? [selectedJd] : filteredJobDescriptions.slice(0, 16).map((job) => (
                                                <div
                                                    key={job.id}
                                                    onClick={() => setselectedJd(job)}
                                                    className={`p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md  ${selectedJd?.id === job.id
                                                        ? "border-blue-500 bg-blue-50 shadow-md"
                                                        : "border-gray-200 hover:border-gray-300"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-lg ${selectedJd?.id === job.id ? "bg-blue-200" : "bg-gray-100"}`}>
                                                            <FileText className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-medium text-sm text-gray-900 truncate">{job.title}</h3>
                                                            <p className="text-xs text-gray-500 truncate">{job.location}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    }


                                    {/* Pagination */}
                                    <div className="flex items-center justify-center gap-2 pb-4 pt-6">
                                        <button className="p-1 hover:bg-gray-100 rounded">
                                            <ChevronLeft className="h-4 w-4 text-gray-600" />
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Page <span className="font-medium">1</span> | 10
                                        </span>
                                        <button className="p-1 hover:bg-gray-100 rounded">
                                            <ChevronRight className="h-4 w-4 text-gray-600" />
                                        </button>
                                    </div>
                                </div>


                                {selectedJd && (
                                    <div className="flex flex-col  w-96 h-full flex-1 items-end  pr-6">
                                        <div className="w-full h-full max-h-[435px] mt-6  bg-white rounded-xl shadow-sm border flex-1 border-gray-200 p-6 overflow-hidden overflow-y-scroll">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-semibold text-blue-900">Job Details</h3>
                                                <button onClick={() => setselectedJd(null)} className="p-1 hover:bg-gray-100 rounded">
                                                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                                                </button>
                                            </div>


                                            <div className="mb-2 flex items-center justify-start">
                                                <h3 className="font-semibold text-blue-600">Job Title :</h3>
                                                <p className="text-gray-600 text-center ml-1">{selectedJd.title}</p>
                                            </div>

                                            <div className="mb-2 flex items-center justify-start">
                                                <h4 className="font-semibold text-blue-600">Location :</h4>
                                                <p className="text-gray-600 text-sm ml-1">{selectedJd.location}</p>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="font-semibold text-blue-600 mb-3">Job Description Details</h4>

                                                <div className="space-y-6">
                                                    {/* About Role */}
                                                    {selectedJd.description?.about && (
                                                        <div>
                                                            <h5 className="font-medium text-gray-800">About the Role</h5>
                                                            <p className="text-sm text-gray-600 leading-relaxed">{selectedJd.description.about}</p>
                                                        </div>
                                                    )}

                                                    {/* Key Responsibilities */}
                                                    {selectedJd.description?.key_responsibilities && (
                                                        <div>
                                                            <h5 className="font-medium text-gray-800">Key Responsibilities</h5>
                                                            <ul className="text-sm text-gray-600 space-y-1">
                                                                {selectedJd.description.key_responsibilities.map((resp, index) => (
                                                                    <li key={index} className="flex items-start">
                                                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                                        {resp}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Required Skills */}
                                                    {selectedJd.key_skills && (
                                                        <div>
                                                            <h5 className="font-medium text-gray-800">Key Skills</h5>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedJd.key_skills.map((skill, index) => (
                                                                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Good to Have */}
                                                    {selectedJd.good_to_have_skills && selectedJd.good_to_have_skills.length > 0 && (
                                                        <div>
                                                            <h5 className="font-medium text-gray-800">Good to Have</h5>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedJd.good_to_have_skills.map((skill, index) => (
                                                                    <span key={index} className="px-2 py-1 bg-gray-100 text-blue-900 rounded-md text-xs font-medium">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Qualifications */}
                                                    {selectedJd.description?.qualifications && (
                                                        <div>
                                                            <h5 className="font-medium text-gray-800">Qualifications</h5>
                                                            <ul className="text-sm text-gray-600 space-y-1">
                                                                {selectedJd.description.qualifications.map((qual, index) => (
                                                                    <li key={index} className="flex items-start">
                                                                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                                                        {qual}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* What We Offer */}
                                                    {selectedJd.description?.what_we_offer && (
                                                        <div>
                                                            <h5 className="font-medium text-gray-800">What We Offer</h5>
                                                            <ul className="text-sm text-gray-600 space-y-1">
                                                                {selectedJd.description.what_we_offer.map((offer, index) => (
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
                                                            <p className="text-sm text-gray-600">{selectedJd.experience_required || selectedJd.experience || 'Not specified'}</p>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-medium text-gray-800 mb-1">CTC Range</h5>
                                                            <p className="text-sm text-gray-600">{selectedJd.ctc_range || selectedJd.ctcRange || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="px-3 py-0.5 text-orange-500 rounded-full border border-orange-500 w-28 text-sm mt-3" onClick={nextPage}>
                                            Next
                                        </button>
                                    </div>

                                )}
                            </div>

                        </div>

                        {/* Page 2 - Interview Process */}

                        <div className="flex-1 flex flex-shrink-0 flex-col overflow-hidden" style={{ width: `${100 / totalPages}%` }}>


                            <div className="flex flex-col">
                                {/* Main Content */}
                                <div className="flex-1 px-6 overflow-hidden">
                                    <div className="relative h-full overflow-hidden">


                                        <div className="flex-1 px-6  pt-0 pb-0 flex-shrink-0 overflow-hidden" >
                                            {/* Header Section */}
                                            <div className="relative flex items-start flex-col">
                                                <h1 className="text-sm font-semibold w-fit text-blue-900 mb-12">Job Description</h1>

                                                <div className="absolute  top-2 left-0 right-0 w-full flex-1">
                                                    <div className="flex items-center justify-center gap-4 mb-4 text-black">
                                                        <div>
                                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">Job Title</label>
                                                            <input
                                                                type="text"
                                                                value={formdata.jobTitle}
                                                                onChange={(e) => setformdata({ ...formdata, jobTitle: e.target.value })}
                                                                placeholder="Human Resource Manager"
                                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">Experience in years</label>
                                                            <select
                                                                value={formdata.experience}
                                                                onChange={(e) => setformdata({ ...formdata, experience: e.target.value })}
                                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                            >
                                                                <option value="">Any Experience</option>
                                                                <option value="0-1">0-1</option>
                                                                <option value="1-3">1-3</option>
                                                                <option value="3-5">3-5</option>
                                                                <option value="5-7">5-7</option>
                                                                <option value="7-10">7-10</option>
                                                                <option value="10+">10+</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">Location</label>
                                                            <input
                                                                type="text"
                                                                value={formdata.location}
                                                                onChange={(e) => setformdata({ ...formdata, location: e.target.value })}
                                                                placeholder="Head office, Mumbai"
                                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-blue-900 mb-1  ml-1.5">CTC Range</label>
                                                            <select
                                                                value={formdata.ctcRange}
                                                                onChange={(e) => setformdata({ ...formdata, ctcRange: e.target.value })}
                                                                className="w-full px-4 py-1 border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                            >
                                                                <option value="">Any CTC</option>
                                                                <option value="2-4">2-4 LPA</option>
                                                                <option value="4-6 LPA">4-6 LPA</option>
                                                                <option value="6-10 LPA">6-10 LPA</option>
                                                                <option value="10-15 LPA">10-15 LPA</option>
                                                                <option value="15-25 LPA">15-25 LPA</option>
                                                                <option value="25+ LPA">25+ LPA</option>
                                                            </select>
                                                        </div>

                                                        <div className="flex items-end justify-center">
                                                            <button
                                                                onClick={filterJobDescriptions}
                                                                className="flex items-center gap-2 bg-orange-500 mt-[20px] hover:bg-orange-600 text-white w-8 justify-center h-8  py-1 rounded-full transition-colors"
                                                            >
                                                                <Search className="h-4 w-4" />

                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Right Panel - Job Details */}

                                                </div>
                                            </div>

                                            <div className="flex gap-6 h-full mt-4">
                                                {/* Left Panel - Available Jobs */}
                                                <div className="w-80 rounded-xl mt-1">
                                                    <h2 className="text-sm font-semibold text-blue-900 mb-4">Available Job Descriptions</h2>

                                                    {/* Selected Job Card */}
                                                    <div className="p-3 border border-blue-500 bg-blue-50 rounded-lg mb-6">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-blue-200 rounded-lg">
                                                                <FileText className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-medium text-sm text-gray-900">{selectedJd?.title}</h3>
                                                                <p className="text-xs text-gray-500">{selectedJd?.location}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Panel - Upload Area */}
                                                <div className="flex-1 rounded-xl">
                                                    <div>
                                                        <h2 className="text-sm font-semibold text-orange-500">Upload Resumes (Doc, PDF only)</h2>
                                                    </div>

                                                    {/* Upload Area */}
                                                    <div
                                                        className="border-2 mt-4 border-dashed border-gray-300 rounded-xl p-8 py-4 text-center hover:border-orange-400 transition-colors"
                                                        onDrop={handleDrop}
                                                        onDragOver={(e) => e.preventDefault()}
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <Upload className="h-12 w-12 text-gray-400 mb-4" />
                                                            <p className="text-gray-600 mb-2">
                                                                Drag and drop the file(s) here or
                                                                <button
                                                                    onClick={() => fileInputRef.current.click()}
                                                                    className="text-orange-500 hover:text-orange-600 ml-1 underline"
                                                                >
                                                                    use the file browser
                                                                </button>
                                                            </p>
                                                            <input
                                                                type="file"
                                                                multiple
                                                                ref={fileInputRef}
                                                                className="hidden"
                                                                accept=".pdf,.doc,.docx"
                                                                onChange={handleFileInput}
                                                            />


                                                        </div>

                                                    </div>
                                                    <div className="flex justify-end mt-2">
                                                        <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors">
                                                            <Upload className="h-4 w-4" />
                                                            Upload
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Uploaded Files Section */}
                                        <div className="pl-4">
                                            <h3 className="text-base font-semibold text-orange-500 mb-4">Uploaded Resume From Candidates</h3>

                                            <div className="grid grid-cols-2 gap-2 h-full max-h-44 w-full overflow-y-auto pr-4">
                                                {uploadedFiles.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className={`flex items-center  gap-4 p-2  rounded-lg w-fit
                                                            ${selectedfiles.includes(file) ? "bg-orange-300" : "bg-gray-50"}
                                                            `}
                                                        onClick={() => { selectedfiles.includes(file) ? setselectedfiles(prev => prev.filter(f => f !== file)) : setselectedfiles(prev => [...prev, file]) }}

                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-blue-600" />
                                                            <span className="text-sm text-blue-600 truncate max-w-40">{file.name}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFile(file.id)}
                                                            className="p-1 hover:bg-gray-200 rounded"
                                                        >
                                                            <X className="h-3 w-3 text-gray-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className=" flex items-center justify-end w-full mr-2 mt-1 shadow-md shadow-gray-50 ">
                                                <button disabled={selectedfiles.length === 0} onClick={handleAnalyze} className="bg-white text-orange-500 hover:bg-orange-100 px-4 py-1 border border-orange-500 rounded-full">Analyze</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>


                        {/* Page 3 - Interview Process */}
                        <div className="flex flex-col pt-4 flex-shrink-0" style={{ width: `${100 / totalPages}%` }}>
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center max-w-md w-full px-6">
                                        {/* Main heading */}
                                        <div className="mb-6">
                                            <span className="animate-pulse text-orange-500 font-semibold text-xl">
                                                Resume Screening is in process... Stay Tuned
                                            </span>
                                        </div>

                                        {/* File info */}
                                        <div className="mb-4 text-gray-600">
                                            {currentFileName && (
                                                <p className="text-sm mb-1">
                                                    Processing: <span className="font-medium text-gray-800">{currentFileName}</span>
                                                </p>
                                            )}
                                            {selectedfiles.length > 1 && (
                                                <p className="text-xs">
                                                    File {currentFileIndex} of {selectedfiles.length}
                                                </p>
                                            )}
                                        </div>

                                        {/* Progress bar container */}
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-700">{currentStage}</span>
                                                <span className="text-sm text-gray-500">{percentage}%</span>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500 ease-out relative"
                                                    style={{ width: `${percentage}%` }}
                                                >
                                                    {/* Animated shine effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white via-transparent opacity-30 animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Loading animation dots */}
                                        <div className="flex justify-center space-x-1 mb-4">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>

                                        {/* Progress details */}
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <p>Analyzing skills, experience, and qualifications...</p>
                                            <p>This may take 15-30 seconds per resume</p>
                                            {selectedfiles.length > 1 && (
                                                <p>Estimated time remaining: {Math.ceil((selectedfiles.length - currentFileIndex) * 20)} seconds</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            )
                                : (
                                    <ResumeResults analyzedResumes={[analyzedResume]} />
                                )
                            }

                        </div>


                    </div>


                </div>

            </div>
        </div >
    )
}

export default page