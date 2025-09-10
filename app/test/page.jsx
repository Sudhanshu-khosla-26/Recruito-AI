"use client"
import Navbar from "@/_components/navbar"
import Sidebar from "@/_components/sidebar"
import { Upload, FileText, X } from "lucide-react"
import { useState, useRef } from "react"

const AnalyzeResumePage = () => {
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [selectedJob, setSelectedJob] = useState("HR Manager")
    const fileInputRef = useRef(null)
    const [formdata, setformdata] = useState({
        jobTitle: "",
        experience: "",
        location: "",
        ctcRange: ""
    })

    const handleFiles = (files) => {
        const newFiles = Array.from(files).map((file, index) => ({
            id: Date.now() + index,
            name: file.name,
            type: file.type.includes("pdf") ? "pdf" : "doc",
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

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6">
                    <Navbar />
                </div>

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
                                                    // onClick={filterJobDescriptions}
                                                    className="flex items-center gap-2 bg-orange-500 mt-[20px] hover:bg-orange-600 text-white w-8 justify-center h-8  py-1 rounded-full transition-colors"
                                                >
                                                    {/* <Search className="h-4 w-4" /> */}

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
                                                    <h3 className="font-medium text-sm text-gray-900">{selectedJob}</h3>
                                                    <p className="text-xs text-gray-500">Mumbai, India</p>
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

                                <div className="grid grid-cols-2 gap-2 max-h-64 w-full overflow-y-auto pr-4">
                                    {uploadedFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center  gap-4 p-2 bg-gray-50 rounded-lg"
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
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default AnalyzeResumePage
