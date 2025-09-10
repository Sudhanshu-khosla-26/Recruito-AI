"use client"
import { useState } from "react"
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

const Sidebar = () => {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const links = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
        },
        {
            href: "/job-descriptions",
            label: "Job Descriptions",
            icon: FileText,
        },
        {
            href: "/analyze-resume",
            label: "Analyse Resume",
            icon: FileSearch,
        },
        {
            href: "/interviews",
            label: "Interviews",
            icon: MessageSquare,
        },
        {
            href: "/status",
            label: "Status",
            icon: Activity,
        },
    ]

    const belowLinks = [
        {
            href: "/analytics",
            label: "Analytics",
            icon: BarChart3,
        },
        {
            href: "/settings",
            label: "Account & Setting",
            icon: Settings,
        },
    ]

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
                    {links.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href

                        return (
                            <Link href={link.href} key={link.label}>
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
                        )
                    })}
                </nav>
            </div>

            {/* Bottom Navigation */}
            <div className="py-6">
                <nav className="space-y-1 px-3">
                    {belowLinks.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href

                        return (
                            <Link href={link.href} key={link.label}>
                                <div
                                    className={`flex items-center px-3 py-1 my-0.5 rounded-lg transition-colors cursor-pointer
                                    ${isActive
                                            ? "bg-orange-500 text-white"
                                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                        }`}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!isCollapsed && <span className="ml-3 text-sm font-medium">{link.label}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}

export default Sidebar
