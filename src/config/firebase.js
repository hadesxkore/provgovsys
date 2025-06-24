import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBshWVmpC27JlRIkg2aZnUf47mJp6EwcSo",
  authDomain: "provincialgovernmentsample.firebaseapp.com",
  projectId: "provincialgovernmentsample",
  storageBucket: "provincialgovernmentsample.firebasestorage.app",
  messagingSenderId: "552106983948",
  appId: "1:552106983948:web:d6863a775a919daa156429",
  measurementId: "G-47PZRP35TC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db }; 