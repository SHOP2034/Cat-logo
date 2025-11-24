// Inicialización y re-export de instancia Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// === CONFIG FIREBASE (ya presentes, no tocar si funcionan) ===
const firebaseConfig = {
  apiKey: "AIzaSyDf3G2vxejRbzus-pxHhEje1YzRtdvkYkg",
  authDomain: "adminlimpiarte.firebaseapp.com",
  projectId: "adminlimpiarte",
  storageBucket: "adminlimpiarte.firebasestorage.app",
  messagingSenderId: "936761526025",
  appId: "1:936761526025:web:db151e898aceff7d1675d8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

