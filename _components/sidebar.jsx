"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
    LayoutDashboard,
    FileText,
    FileSearch,
    MessageSquare,
    Activity,
    BarChart3,
    Settings,
    ChevronLeft,
} from "lucide-react"
import { usePathname } from "next/navigation"
import axios from "axios"
import { useUser } from "@/lib/UserProvider"

const Sidebar = () => {
    const pathname = usePathname()
    // const [user, setuser] = useState(null)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { user, loading } = useUser();
    console.log(user);

    // useEffect(() => {
    //     const getuser = async () => {
    //         try {
    //             const res = await axios.post('/api/auth/getuser');
    //             console.log(res.data);
    //             setuser(res.data.user);
    //         } catch (error) {
    //             console.error("Error fetching user:", error);
    //         }
    //     }

    //     getuser();
    // }, [])


    const links = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            role: ""
        },
        {
            href: "/job-descriptions",
            label: "Job Descriptions",
            icon: FileText,
            role: ""
        },
        {
            href: "/analyze-resume",
            label: "Analyse Resume",
            icon: FileSearch,
            role: ""
        },
        {
            href: "/interviews",
            label: "Interviews",
            icon: MessageSquare,
            role: ""
        },
        {
            href: "/status",
            label: "Status",
            icon: Activity,
            role: ""
        },

        {
            href: "/candidate-dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            role: "jobseeker"
        },
        {
            href: "/candidate-interviews",
            label: "Interviews",
            icon: MessageSquare,
            role: "jobseeker"
        },
        {
            href: "/candidate-submit-docs",
            label: "Submit Docs",
            icon: FileText,
            role: "jobseeker"
        },


    ]




    const belowLinks = [
        {
            href: "/analytics",
            label: "Analytics",
            icon: BarChart3,
            role: ""
        },
        {
            href: "/settings",
            label: "Account & Setting",
            icon: Settings,
            role: ""
        },
        {
            href: "/candidate-settings",
            label: "Account & Setting",
            icon: Settings,
            role: "jobseeker"
        },
    ]

    if (loading) {
        return (
            <div className="w-52 transition-all duration-300 flex flex-col justify-center items-center h-full bg-black text-white min-h-screen relative">
                <div className="animate-spin rounded-full h-12 w-12 border-6 border-t-6 border-gray-200 border-t-orange-500"></div>
            </div>
        );
    }

    return (
        <div
            className={`${isCollapsed ? "w-16" : "w-52"} transition-all duration-300 flex flex-col h-full bg-black text-white min-h-screen relative`}
        >
            {/* Header */}
            <div className="p-6 ">
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-xl font-bold text-white">RecruitoAI</h1>
                            <div className="mt-2 px-3 py-1 bg-orange-500 text-white text-xs rounded-md inline-block">
                                COMPANY LOGO
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-gray-700 rounded-md transition-colors"
                    >
                        <ChevronLeft className={`h-4 w-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 py-6">
                <nav className="space-y-1 px-3">
                    {links.map((link, index) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href

                        return (

                            link.role === user?.role ? (
                                <Link href={link.href} key={index}>
                                    <div
                                        className={`flex items-center px-3 py-1 my-0.5 rounded-lg transition-colors cursor-pointer group
                                    ${isActive
                                                ? "bg-orange-500 text-white"
                                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!isCollapsed && <span className="ml-3 text-sm font-medium">{link.label}</span>}
                                    </div>
                                </Link>
                            ) :
                                (link.role === "" && user?.role != "jobseeker" && <Link href={link.href} key={link.label}>
                                    <div
                                        className={`flex items-center px-3 py-1 my-0.5 rounded-lg transition-colors cursor-pointer group
                                    ${isActive
                                                ? "bg-orange-500 text-white"
                                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!isCollapsed && <span className="ml-3 text-sm font-medium">{link.label}</span>}
                                    </div>
                                </Link>)
                        )
                    })}
                </nav>
            </div>

            {/* Bottom Navigation */}
            <div className="py-6">
                <nav className="space-y-1 px-3">
                    {belowLinks.map((link, index) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href

                        return (
                            link.role === user?.role ? (
                                <Link href={link.href} key={index}>
                                    <div
                                        className={`flex items-center px-3 py-1 my-0.5 rounded-lg transition-colors cursor-pointer group
                                    ${isActive
                                                ? "bg-orange-500 text-white"
                                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!isCollapsed && <span className="ml-3 text-sm font-medium">{link.label}</span>}
                                    </div>
                                </Link>
                            ) :
                                (link.role === "" && user?.role != "jobseeker" && <Link href={link.href} key={link.label}>
                                    <div
                                        className={`flex items-center px-3 py-1 my-0.5 rounded-lg transition-colors cursor-pointer group
                                    ${isActive
                                                ? "bg-orange-500 text-white"
                                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!isCollapsed && <span className="ml-3 text-sm font-medium">{link.label}</span>}
                                    </div>
                                </Link>)
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}

export default Sidebar
