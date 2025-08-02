// Import fungsi yang kita butuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Konfigurasi Firebase Anda yang sudah kita buat sebelumnya
const firebaseConfig = {
  apiKey: "AIzaSyC2wGF6JQA0U60Z_VCQUrUFVUHKewEbqFk",
  authDomain: "manga-o-yonde.firebaseapp.com",
  projectId: "manga-o-yonde",
  storageBucket: "manga-o-yonde.firebasestorage.app",
  messagingSenderId: "255354025597",
  appId: "1:255354025597:web:870558067e26d47ed3a314",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi layanan yang akan kita gunakan
const db = getFirestore(app); // Koneksi ke Database Firestore
const auth = getAuth(app); // Koneksi ke sistem Authentication

// Ekspor variabel dan fungsi yang akan digunakan di file lain
export {
  db,
  auth,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onAuthStateChanged,
};
