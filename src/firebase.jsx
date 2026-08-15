import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBJTnCeFQhVMRog9x5gyuSXyOB6L2RzS8w",
  authDomain: "coofee-website.firebaseapp.com",
  projectId: "coofee-website",
  storageBucket: "coofee-website.firebasestorage.app",
  messagingSenderId: "707964808914",
  appId: "1:707964808914:web:3ccd9924f3a3754167c70b",
  measurementId: "G-8B9GVYG66W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;