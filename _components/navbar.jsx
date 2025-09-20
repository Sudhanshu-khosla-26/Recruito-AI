"use client"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { ChevronDown, Search, Bell, Menu, LogOut, User, Settings } from "lucide-react"
import { useUser } from "@/lib/UserProvider"
import axios from "axios"

import { useRouter } from "next/navigation"

const Navbar = () => {
    const { user, signout } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const router = useRouter();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/remove-session");
            await signout();
            router.push('/signin'); // Redirect to login page after logout
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    return (
        <div className="text-black flex w-full mx-auto mt-2 justify-between items-center px-6 py-3">
            {/* Left side - Greeting */}
            <div className="flex flex-row items-center bg-gray-200 rounded-full py-1.5 px-6 flex-1">
                <span className="text-lg font-medium text-gray-700">
                    Hello,
                    <span className="text-blue-600 ml-1 font-semibold">{user?.name || "User"} !</span>
                </span>
            </div>

            {/* Center - Search Bar */}
            <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search for anything..."
                        className="w-full pl-12 pr-4 py-1.5 bg-gray-200 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                </div>
            </div>

            {/* Right side - Icons and Profile */}
            <div className="flex items-center space-x-4">
                {/* Menu Icon */}
                <button className="p-2 hover:bg-gray-300 transition-colors bg-gray-200 rounded-full">
                    <Menu className="h-5 w-5 text-orange-500" />
                </button>

                {/* Notification Icon */}
                <button className="p-2 hover:bg-gray-300 transition-colors bg-gray-200 rounded-full">
                    <Bell className="h-5 w-5 text-orange-500" />
                </button>

                {/* Profile Section with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleDropdown}
                        className="flex items-center space-x-1 py-0 px-1.5 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                    >
                        <Image
                            src={user?.profilePicture || "/default-avatar.png"}
                            alt="Profile"
                            width={40}
                            height={40}
                            className="rounded-full border-2 border-gray-200"
                        />
                        <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium text-gray-700">
                                {user?.role === "jobseeker" ? "candidate" : user?.role}
                            </span>
                            <ChevronDown
                                className={`h-4 w-4 text-orange-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            {/* Profile Option */}
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    router.push('/profile');
                                }}
                                className="w-full px-2 py-1 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                            >
                                <User className="h-4 w-4" />
                                <span>Profile</span>
                            </button>

                            {/* Settings Option */}
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    router.push('/settings');
                                }}
                                className="w-full px-2 py-1 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                            >
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </button>

                            {/* Divider */}
                            <div className="border-t border-gray-200 my-1"></div>

                            {/* Logout Option */}
                            <button
                                onClick={handleLogout}
                                className="w-full px-2 py-1 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar