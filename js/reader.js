// ======================= IMPORTS =======================
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ======================= DOM ELEMENTS =======================
const readerTitle = document.getElementById("reader-title");
const imagesContainer = document.getElementById("reader-images-container");
const backToDetailBtn = document.getElementById("back-to-detail");
const prevChapterBtn = document.getElementById("prev-chapter-btn");
const nextChapterBtn = document.getElementById("next-chapter-btn");

// Elemen Panel Pengaturan BARU
const settingsButton = document.getElementById("settings-button");
const settingsPanel = document.getElementById("settings-panel");
const imageSizeSlider = document.getElementById("image-size-slider");
const chapterSelect = document.getElementById("chapter-select");
const pageSelect = document.getElementById("page-select");
const downloadChapterBtn = document.getElementById("download-chapter-btn");
const reportButton = document.getElementById("report-button");
const themeButton = document.getElementById("theme-button"); // DIPERBAIKI

// ======================= FUNGSI-FUNGSI =======================

// FUNGSI DIPERBAIKI
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

function getIdsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    comicId: params.get("id"),
    chapterId: params.get("chapter"),
  };
}

/**
 * Mencegah klik kanan dan beberapa shortcut keyboard.
 */
function setupProtections() {
  imagesContainer.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", (e) => {
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
      e.preventDefault();
    }
  });
}

/**
 * Mereset dan memuat ulang thread komentar Disqus. (FUNGSI BARU)
 * @param {string} comicId - ID komik.
 * @param {string} chapterId - ID chapter.
 */
function resetDisqus(comicId, chapterId) {
  const pageUrl = window.location.href;
  const pageIdentifier = `${comicId}_${chapterId}`; // ID unik untuk setiap chapter

  // Cek jika Disqus sudah dimuat di halaman
  if (window.DISQUS) {
    DISQUS.reset({
      reload: true,
      config: function () {
        this.page.url = pageUrl;
        this.page.identifier = pageIdentifier;
      },
    });
  }
}

/**
 * Fungsi utama untuk memuat semua data.
 */
async function loadReaderData() {
  const { comicId, chapterId } = getIdsFromUrl();
  if (!comicId || !chapterId) {
    imagesContainer.innerHTML = "<p>Error: Informasi tidak lengkap.</p>";
    return;
  }

  try {
    const comicRef = doc(db, "comics", comicId);
    const comicSnap = await getDoc(comicRef);
    if (!comicSnap.exists()) throw new Error("Komik tidak ditemukan.");
    const comicData = comicSnap.data();
    backToDetailBtn.href = `detail.html?id=${comicId}`;

    const currentChapterRef = doc(db, "comics", comicId, "chapters", chapterId);
    const currentChapterSnap = await getDoc(currentChapterRef);
    if (!currentChapterSnap.exists())
      throw new Error("Chapter tidak ditemukan.");
    const currentChapterData = currentChapterSnap.data();

    const title = `${comicData.title} - Chapter ${currentChapterData.chapterNumber}`;
    document.title = title;
    readerTitle.textContent = title;

    // Tampilkan gambar dan isi dropdown halaman
    let imagesHTML = "";
    let pageSelectHTML = "";
    currentChapterData.pages.forEach((pageUrl, index) => {
      imagesHTML += `<img src="${pageUrl}" class="reader__image" id="page-${
        index + 1
      }" alt="Halaman ${index + 1}">`;
      pageSelectHTML += `<option value="${index + 1}">Halaman ${
        index + 1
      }</option>`;
    });
    imagesContainer.innerHTML = imagesHTML;
    pageSelect.innerHTML = pageSelectHTML;

    // Ambil semua chapter untuk navigasi
    const chaptersRef = collection(db, "comics", comicId, "chapters");
    const q = query(chaptersRef, orderBy("chapterNumber", "asc"));
    const allChaptersSnapshot = await getDocs(q);

    const allChapters = [];
    allChaptersSnapshot.forEach((doc) =>
      allChapters.push({ id: doc.id, ...doc.data() })
    );

    let selectHTML = "";
    let currentIndex = -1;
    allChapters.forEach((chap, index) => {
      const isSelected = chap.id === chapterId;
      if (isSelected) currentIndex = index;
      selectHTML += `<option value="${chap.id}" ${
        isSelected ? "selected" : ""
      }>Chapter ${chap.chapterNumber}</option>`;
    });
    chapterSelect.innerHTML = selectHTML;

    if (currentIndex > 0) {
      prevChapterBtn.href = `reader.html?id=${comicId}&chapter=${
        allChapters[currentIndex - 1].id
      }`;
      prevChapterBtn.style.display = "inline-block";
    }

    if (currentIndex < allChapters.length - 1) {
      nextChapterBtn.href = `reader.html?id=${comicId}&chapter=${
        allChapters[currentIndex + 1].id
      }`;
      nextChapterBtn.style.display = "inline-block";
    }

    if (currentChapterData.downloadUrl) {
      downloadChapterBtn.href = currentChapterData.downloadUrl;
      downloadChapterBtn.target = "_blank";
      downloadChapterBtn.style.display = "block";
    }

    // Panggil fungsi reset Disqus setelah semua konten dimuat (PERUBAHAN)
    resetDisqus(comicId, chapterId);
  } catch (error) {
    console.error("Error loading reader data:", error);
    imagesContainer.innerHTML = `<p>Gagal memuat chapter: ${error.message}</p>`;
  }
}

/**
 * Fungsi untuk mengirim laporan masalah.
 */
async function submitReport() {
  const { comicId, chapterId } = getIdsFromUrl();
  const reason = prompt(
    "Silakan jelaskan masalahnya (contoh: gambar rusak, urutan salah, dll):"
  );

  if (reason && reason.trim() !== "") {
    try {
      await addDoc(collection(db, "reports"), {
        comicId: comicId,
        chapterId: chapterId,
        reason: reason.trim(),
        url: window.location.href,
        reportedAt: serverTimestamp(),
      });
      alert("Terima kasih! Laporan Anda telah dikirim.");
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Gagal mengirim laporan. Coba lagi nanti.");
    }
  }
}

// ======================= EVENT LISTENERS =======================

// Tampilkan/sembunyikan panel pengaturan
settingsButton.addEventListener("click", () => {
  settingsPanel.classList.toggle("show");
});

// Atur ukuran gambar
imageSizeSlider.addEventListener("input", () => {
  const newSize = imageSizeSlider.value;
  const images = document.querySelectorAll(".reader__image");
  images.forEach((img) => {
    img.style.maxWidth = `${newSize}%`;
  });
});

// Pindah chapter dari dropdown
chapterSelect.addEventListener("change", () => {
  const { comicId } = getIdsFromUrl();
  const selectedChapterId = chapterSelect.value;
  if (comicId && selectedChapterId) {
    window.location.href = `reader.html?id=${comicId}&chapter=${selectedChapterId}`;
  }
});

// Pindah halaman dari dropdown
pageSelect.addEventListener("change", () => {
  const selectedPage = pageSelect.value;
  const pageElement = document.getElementById(`page-${selectedPage}`);
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: "smooth" });
  }
});

// Tombol lapor
reportButton.addEventListener("click", submitReport);

// ======================= INITIALIZATION =======================
document.addEventListener("DOMContentLoaded", () => {
  setupDarkMode();
  loadReaderData();
  setupProtections();
});
