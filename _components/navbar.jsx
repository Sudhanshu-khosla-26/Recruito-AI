"use client"
import Image from "next/image"
import { useState, useEffect } from "react"
import { ChevronDown, Search, Bell, Menu } from "lucide-react"
import { auth } from "@/lib/firebase"

const Navbar = () => {

    const [user, setUser] = useState(null)


    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((User) => {
            console.log(User);
            setUser(User);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className=" text-black flex w-full mx-auto mt-2 justify-between items-center px-6 py-3 ">

            {/* Left side - Greeting */}
            <div className="flex flex-row items-center bg-gray-200 rounded-full py-1.5 px-6 flex-1">
                <span className="text-lg font-medium text-gray-700">
                    Hello,
                    <span className="text-blue-600 ml-1 font-semibold">{user?.displayName || "User"} !</span>
                </span>
            </div>

            {/* Center - Search Bar */}
            <div className="flex-1 max-w-md mx-8 ">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search for anything..."
                        className="w-full pl-12 pr-4 py-1.5 bg-gray-200  rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                </div>
            </div>

            {/* Right side - Icons and Profile */}
            <div className="flex items-center space-x-4 ">
                {/* Menu Icon */}
                <button className="p-2 hover:bg-gray-300 transition-colors bg-gray-200 rounded-full">
                    <Menu className="h-5 w-5 text-orange-500" />
                </button>

                {/* Notification Icon */}
                <button className="p-2 hover:bg-gray-300  transition-colors bg-gray-200 rounded-full">
                    <Bell className="h-5 w-5 text-orange-500" />
                </button>

                {/* Profile Section */}
                <div className="flex items-center space-x-1 py-0 px-1.5 bg-gray-200 rounded-full">
                    <Image
                        src={user?.photoURL || "/placeholder.svg?height=40&width=40&query=user-avatar"}
                        alt="User Avatar"
                        width={40}
                        height={40}
                        className="rounded-full border-2 border-gray-200"
                    />
                    <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-gray-700">Super Admin</span>
                        <ChevronDown className="h-4 w-4 text-orange-500" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Navbar
