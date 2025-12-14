import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Validate required environment variables
const requiredEnvVars = {
  REACT_APP_FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
  REACT_APP_FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  REACT_APP_FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  REACT_APP_FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  REACT_APP_FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

// Fallback to original working values if env vars are missing (for Vercel builds)
const getEnvVar = (key, fallback) => {
  return process.env[key] || fallback;
};

// Original working Firebase configuration (fallback values)
const fallbackConfig = {
  REACT_APP_FIREBASE_API_KEY: 'AIzaSyDOQK3z7XNdJ2P2JW10hbSBv0GLiO2oJkE',
  REACT_APP_FIREBASE_AUTH_DOMAIN: 'familybubble-ecfa6.firebaseapp.com',
  REACT_APP_FIREBASE_PROJECT_ID: 'familybubble-ecfa6',
  REACT_APP_FIREBASE_STORAGE_BUCKET: 'familybubble-ecfa6.appspot.com',
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '804761460768',
  REACT_APP_FIREBASE_APP_ID: '1:804761460768:web:1010dccfd9d48b1e695c45',
  REACT_APP_FIREBASE_MEASUREMENT_ID: 'G-ZP7G17MS89',
};

if (missingVars.length > 0) {
  const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}\n\nUsing fallback configuration values. For production, set these in Vercel Environment Variables.`;
  console.warn(errorMessage);
  // Don't throw - use fallbacks so build can complete
}

const firebaseConfig = {
  apiKey: getEnvVar('REACT_APP_FIREBASE_API_KEY', fallbackConfig.REACT_APP_FIREBASE_API_KEY),
  authDomain: getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN', fallbackConfig.REACT_APP_FIREBASE_AUTH_DOMAIN),
  projectId: getEnvVar('REACT_APP_FIREBASE_PROJECT_ID', fallbackConfig.REACT_APP_FIREBASE_PROJECT_ID),
  storageBucket: getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET', fallbackConfig.REACT_APP_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', fallbackConfig.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
  appId: getEnvVar('REACT_APP_FIREBASE_APP_ID', fallbackConfig.REACT_APP_FIREBASE_APP_ID),
  measurementId: getEnvVar('REACT_APP_FIREBASE_MEASUREMENT_ID', fallbackConfig.REACT_APP_FIREBASE_MEASUREMENT_ID)
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

