import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDOQK3z7XNdJ2P2JW10hbSBv0GLiO2oJkE",
  authDomain: "familybubble-ecfa6.firebaseapp.com",
  projectId: "familybubble-ecfa6",
  storageBucket: "familybubble-ecfa6.appspot.com",
  messagingSenderId: "804761460768",
  appId: "1:804761460768:web:1010dccfd9d48b1e695c45",
  measurementId: "G-ZP7G17MS89"
};

const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Export them
export { app, auth, db, functions, storage, googleProvider };

