"use client"
import { useState, useEffect } from "react"
import Sidebar from "@/_components/sidebar"
import Navbar from "@/_components/navbar"



export default function InterviewStatus() {

    return (

        <div className="w-container h-full w-full max-w-screen h-max-screen flex overflow-hidden text-sm bg-white text-black">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden ">
                <Navbar className="px-6 " />
                <div className=" h-full p-6 py-0">
                    <h1 className="text-[#EA7125]  font-semibold text-lg " >Interview Status</h1>

                </div>
            </div>
        </div>


    )
}
