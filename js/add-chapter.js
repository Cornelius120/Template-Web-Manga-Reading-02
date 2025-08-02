// ======================= IMPORTS =======================
import { db, auth } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ======================= DOM ELEMENTS =======================
const comicTitleHeading = document.getElementById("comic-title-heading");
const addChapterForm = document.getElementById("add-chapter-form");
const imageUploadInput = document.getElementById("image-upload-input");
const imagePreviewContainer = document.getElementById(
  "image-preview-container"
);
const imageLinksTextarea = document.getElementById("image-links-textarea");
const uploadStatus = document.getElementById("upload-status");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const themeButton = document.getElementById("theme-button"); // Tombol Dark Mode BARU
const backButton = document.getElementById("back-to-chapter-list"); // Tombol Kembali BARU

// ======================= STATE & CONFIG =======================
let comicId = null;
let uploadedImageUrls = [];
let imgbbApiKeys = [];
let currentApiKeyIndex = 0;

// ======================= FUNGSI-FUNGSI =======================

/**
 * Mengatur fungsionalitas mode gelap/terang. (FUNGSI BARU)
 */
function setupDarkMode() {
  const darkTheme = "dark-theme";
  const iconTheme = "fa-sun";

  const selectedTheme = localStorage.getItem("selected-theme");
  const getCurrentTheme = () =>
    document.body.classList.contains(darkTheme) ? "dark" : "light";

  if (selectedTheme === "dark") {
    document.body.classList.add(darkTheme);
    themeButton.classList.add(iconTheme);
    themeButton.classList.remove("fa-moon");
  } else {
    themeButton.classList.add("fa-moon");
  }

  themeButton.addEventListener("click", () => {
    document.body.classList.toggle(darkTheme);
    themeButton.classList.toggle(iconTheme);
    themeButton.classList.toggle("fa-moon");
    localStorage.setItem("selected-theme", getCurrentTheme());
  });
}

/**
 * Mengambil ID komik dari parameter URL.
 */
function getComicIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/**
 * Mengambil dan menampilkan judul komik.
 */
async function fetchAndDisplayComicTitle() {
  if (!comicId) {
    comicTitleHeading.textContent = "ID Komik Tidak Ditemukan";
    addChapterForm.style.display = "none";
    backButton.href = "admin.html"; // Arahkan ke admin jika ID tidak ada
    return;
  }
  backButton.href = `chapter-list.html?id=${comicId}`; // Set link kembali yang benar

  const comicRef = doc(db, "comics", comicId);
  const comicSnap = await getDoc(comicRef);

  if (comicSnap.exists()) {
    comicTitleHeading.textContent = `Tambah Chapter untuk: ${
      comicSnap.data().title
    }`;
  } else {
    comicTitleHeading.textContent = "Komik Tidak Ditemukan";
    addChapterForm.style.display = "none";
  }
}

/**
 * Mengatur fungsionalitas perpindahan tab.
 */
function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      button.classList.add("active");
      const tabId = button.dataset.tab;
      document.getElementById(tabId).classList.add("active");
    });
  });
}

/**
 * Mengambil daftar API Key dari Firestore.
 */
async function fetchApiKeys() {
  try {
    const apiKeysRef = doc(db, "settings", "apiKeys");
    const docSnap = await getDoc(apiKeysRef);
    if (
      docSnap.exists() &&
      docSnap.data().keys &&
      docSnap.data().keys.length > 0
    ) {
      imgbbApiKeys = docSnap.data().keys;
    } else {
      console.warn("Tidak ada API Key ImgBB yang ditemukan di Firestore.");
      alert(
        "Peringatan: Tidak ada API Key ImgBB yang dikonfigurasi. Silakan atur di Panel Admin."
      );
    }
  } catch (error) {
    console.error("Gagal mengambil API Keys:", error);
  }
}

/**
 * Menangani upload gambar ke ImgBB.
 */
async function uploadImageToImgBB(file) {
  if (imgbbApiKeys.length === 0) {
    alert("Error: Tidak ada API Key ImgBB yang tersedia.");
    return null;
  }

  const apiKey = imgbbApiKeys[currentApiKeyIndex];
  currentApiKeyIndex = (currentApiKeyIndex + 1) % imgbbApiKeys.length;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      }
    );
    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      console.error("ImgBB upload error:", result);
      return null;
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

/**
 * Menangani event saat pengguna memilih file gambar.
 */
async function handleImageSelection(event) {
  const files = event.target.files;
  if (files.length === 0) return;

  uploadStatus.textContent = `Mengunggah ${files.length} gambar... (0/${files.length})`;
  imagePreviewContainer.innerHTML = "";
  uploadedImageUrls = [];

  let uploadedCount = 0;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);

    const url = await uploadImageToImgBB(file);
    if (url) {
      uploadedImageUrls.push(url);
      uploadedCount++;
      uploadStatus.textContent = `Mengunggah ${files.length} gambar... (${uploadedCount}/${files.length})`;
    } else {
      uploadStatus.textContent = `Gagal mengunggah ${file.name}. Proses dihentikan.`;
      return;
    }
  }
  uploadStatus.textContent = `Berhasil mengunggah ${uploadedCount} dari ${files.length} gambar.`;
}

// ======================= EVENT LISTENERS =======================
imageUploadInput.addEventListener("change", handleImageSelection);

addChapterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitButton = addChapterForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan...";

  let pageUrls = [];
  const activeTab = document.querySelector(".tab-button.active").dataset.tab;

  if (activeTab === "upload-api") {
    pageUrls = uploadedImageUrls;
  } else {
    pageUrls = imageLinksTextarea.value
      .split("\n")
      .map((link) => link.trim())
      .filter((link) => link);
  }

  if (pageUrls.length === 0) {
    alert("Harap tambahkan setidaknya satu gambar halaman.");
    submitButton.disabled = false;
    submitButton.textContent = "Simpan Chapter";
    return;
  }

  try {
    const chapterData = {
      chapterNumber: parseFloat(
        document.getElementById("chapter-number").value
      ),
      chapterTitle: document.getElementById("chapter-title").value || "",
      releaseDate: serverTimestamp(),
      pages: pageUrls,
      downloadUrl: document.getElementById("download-url").value || "",
    };

    const chapterCollectionRef = collection(db, "comics", comicId, "chapters");
    await addDoc(chapterCollectionRef, chapterData);

    const comicRef = doc(db, "comics", comicId);
    await updateDoc(comicRef, {
      lastUpdated: serverTimestamp(),
    });

    alert(`Chapter ${chapterData.chapterNumber} berhasil ditambahkan!`);
    window.location.href = `chapter-list.html?id=${comicId}`;
  } catch (error) {
    console.error("Error adding chapter: ", error);
    alert("Gagal menambahkan chapter. Lihat console untuk detail.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Simpan Chapter";
  }
});

// ======================= INITIALIZATION =======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    setupDarkMode(); // Panggil fungsi dark mode
    comicId = getComicIdFromUrl();
    fetchAndDisplayComicTitle();
    setupTabs();
    fetchApiKeys();
  } else {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "admin.html";
  }
});
