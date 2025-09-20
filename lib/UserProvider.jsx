"use client";

import { createContext, useContext, useEffect, useState, useMemo, use } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase"; // <-- apna firebase config ka path dalna

const UserContext = createContext(null);

const PUBLIC_ROUTES = ["/signin", "/signup", "/"]; // public routes

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (PUBLIC_ROUTES.includes(pathname)) {
            setLoading(false);
            return;
        }

        const getUser = async () => {
            try {
                const res = await axios.post("/api/auth/getuser");
                setUser(res.data.user);
            } catch (err) {
                console.error("Error fetching user:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getUser();
    }, [pathname]);

    // ✅ Signout function
    const signout = async () => {
        try {
            await firebaseSignOut(auth); // firebase se logout
            setUser(null);
        } catch (err) {
            console.error("Error signing out:", err);
        }
    };

    const value = useMemo(
        () => ({ user, setUser, loading, signout }),
        [user, loading]
    );

    return (
        <UserContext.Provider value={value}>
            {!loading && children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);