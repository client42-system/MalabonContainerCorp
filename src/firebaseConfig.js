import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDgXk-v1GjllF3R9RWpZwGsCM7K6xLYoXA",
    authDomain: "clientsystem-63cb9.firebaseapp.com",
    projectId: "clientsystem-63cb9",
    storageBucket: "clientsystem-63cb9.appspot.com",
    messagingSenderId: "683306577894",
    appId: "1:683306577894:web:b0741c88f7d3f6456db027",
    measurementId: "G-1YXFX5GKZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
