// firebase.js
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAUcqnRU1TzZAfh9PLaLO-maUPcZq9XCUA",
    authDomain: "hirelog-9c804.firebaseapp.com",
    projectId: "hirelog-9c804",
    storageBucket: "hirelog-9c804.firebasestorage.app",
    messagingSenderId: "343851063465",
    appId: "1:343851063465:web:d0143be4e22b4f28f671b8",
    measurementId: "G-GEWRT5GJSC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// export const analytics = getAnalytics(app);
export const db = getFirestore(app);
