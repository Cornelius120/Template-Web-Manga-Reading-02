// ======================= IMPORTS =======================
import { db, auth } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ======================= DOM ELEMENTS =======================
const comicTitleHeading = document.getElementById("comic-title-heading");
const editComicForm = document.getElementById("edit-comic-form");
const genreListContainer = document.getElementById("genre-list-container");
const deleteComicBtn = document.getElementById("delete-comic-btn");
const themeButton = document.getElementById("theme-button"); // Tombol Dark Mode BARU

// ======================= STATE =======================
let comicId = null;
const genres = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Isekai",
  "Magic",
  "Mecha",
  "Martial Arts",
  "Mystery",
  "Psychological",
  "Romance",
  "School Life",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
  "Tragedy",
  "Historical",
  "Harem",
];

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
 * Membuat daftar checkbox genre.
 */
function populateGenreList() {
  genreListContainer.innerHTML = genres
    .sort()
    .map(
      (genre) => `
        <div>
            <input type="checkbox" id="genre-${genre.toLowerCase()}" name="genres" value="${genre}">
            <label for="genre-${genre.toLowerCase()}">${genre}</label>
        </div>
    `
    )
    .join("");
}

/**
 * Mengambil data komik dan mengisi formulir.
 */
async function loadComicData() {
  if (!comicId) {
    comicTitleHeading.textContent = "ID Komik Tidak Ditemukan";
    editComicForm.style.display = "none";
    return;
  }

  try {
    const comicRef = doc(db, "comics", comicId);
    const comicSnap = await getDoc(comicRef);

    if (comicSnap.exists()) {
      const comicData = comicSnap.data();
      comicTitleHeading.textContent = `Mengedit: ${comicData.title}`;

      // Mengisi semua field formulir dengan data yang ada
      document.getElementById("comic-title").value = comicData.title || "";
      document.getElementById("comic-alt-titles").value = (
        comicData.alternativeTitles || []
      ).join("\n");
      document.getElementById("comic-authors").value = (
        comicData.authors || []
      ).join(", ");
      document.getElementById("comic-artists").value = (
        comicData.artists || []
      ).join(", ");
      document.getElementById("comic-synopsis").value =
        comicData.synopsis || "";
      document.getElementById("comic-thumbnail").value =
        comicData.thumbnailUrl || "";
      document.getElementById("comic-type").value = comicData.type || "Manhwa";
      document.getElementById("comic-status").value =
        comicData.status || "Ongoing";

      // Menandai checkbox genre yang sesuai
      (comicData.genres || []).forEach((genre) => {
        const checkbox = document.getElementById(
          `genre-${genre.toLowerCase()}`
        );
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    } else {
      comicTitleHeading.textContent = "Komik Tidak Ditemukan";
      editComicForm.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading comic data:", error);
    alert("Gagal memuat data komik.");
  }
}

/**
 * Menangani penghapusan komik beserta semua chapternya.
 */
async function handleDeleteComic() {
  if (!comicId) return;

  const confirmation = confirm(
    "PERINGATAN: Apakah Anda benar-benar yakin ingin menghapus komik ini beserta SEMUA chapternya? Tindakan ini tidak dapat dibatalkan."
  );
  if (!confirmation) return;

  const secondConfirmation = confirm(
    "Konfirmasi kedua: Ini akan menghapus komik secara permanen. Lanjutkan?"
  );
  if (!secondConfirmation) return;

  try {
    // Hapus semua chapter di sub-koleksi terlebih dahulu
    const chaptersRef = collection(db, "comics", comicId, "chapters");
    const chaptersSnapshot = await getDocs(chaptersRef);
    const batch = writeBatch(db); // Gunakan batch write untuk efisiensi
    chaptersSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Setelah semua chapter dihapus, hapus dokumen komik utama
    const comicRef = doc(db, "comics", comicId);
    await deleteDoc(comicRef);

    alert("Komik dan semua chapternya berhasil dihapus.");
    window.location.href = "admin.html";
  } catch (error) {
    console.error("Error deleting comic:", error);
    alert("Gagal menghapus komik.");
  }
}

// ======================= EVENT LISTENERS =======================

editComicForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!comicId) return;

  const submitButton = editComicForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan...";

  try {
    const selectedGenres = Array.from(
      document.querySelectorAll('input[name="genres"]:checked')
    ).map((cb) => cb.value);

    // Membuat objek data yang akan diperbarui
    const updatedData = {
      title: document.getElementById("comic-title").value,
      alternativeTitles: document
        .getElementById("comic-alt-titles")
        .value.split("\n")
        .filter((t) => t.trim()),
      authors: document
        .getElementById("comic-authors")
        .value.split(",")
        .map((s) => s.trim())
        .filter((t) => t),
      artists: document
        .getElementById("comic-artists")
        .value.split(",")
        .map((s) => s.trim())
        .filter((t) => t),
      synopsis: document.getElementById("comic-synopsis").value,
      thumbnailUrl: document.getElementById("comic-thumbnail").value,
      genres: selectedGenres,
      type: document.getElementById("comic-type").value,
      status: document.getElementById("comic-status").value,
    };

    const comicRef = doc(db, "comics", comicId);
    await updateDoc(comicRef, updatedData);

    alert("Perubahan berhasil disimpan!");
    window.location.href = "admin.html";
  } catch (error) {
    console.error("Error updating document:", error);
    alert("Gagal menyimpan perubahan.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Simpan Perubahan";
  }
});

deleteComicBtn.addEventListener("click", handleDeleteComic);

// ======================= INITIALIZATION =======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    setupDarkMode(); // Panggil fungsi dark mode
    comicId = getComicIdFromUrl();
    populateGenreList();
    loadComicData();
  } else {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "admin.html";
  }
});
