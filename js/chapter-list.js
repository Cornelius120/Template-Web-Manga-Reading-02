// ======================= IMPORTS =======================
import { db, auth } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ======================= DOM ELEMENTS =======================
const comicTitleHeading = document.getElementById("comic-title-heading");
const chapterListTbody = document.getElementById("chapter-list-tbody");
const themeButton = document.getElementById("theme-button");
const addNewChapterBtn = document.getElementById("add-new-chapter-btn"); // Tombol BARU

// ======================= STATE =======================
let comicId = null;

// ======================= FUNGSI-FUNGSI =======================

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

function getComicIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchAndDisplayComicTitle() {
  if (!comicId) {
    comicTitleHeading.textContent = "ID Komik Tidak Ditemukan";
    addNewChapterBtn.style.display = "none"; // Sembunyikan tombol jika ID tidak ada
    return;
  }
  // Set link untuk tombol tambah chapter (DIPERBARUI)
  addNewChapterBtn.href = `add-chapter.html?id=${comicId}`;

  const comicRef = doc(db, "comics", comicId);
  const comicSnap = await getDoc(comicRef);

  if (comicSnap.exists()) {
    comicTitleHeading.textContent = `Daftar Chapter untuk: ${
      comicSnap.data().title
    }`;
  } else {
    comicTitleHeading.textContent = "Komik Tidak Ditemukan";
    addNewChapterBtn.style.display = "none";
  }
}

async function renderChapterList() {
  if (!comicId) return;

  chapterListTbody.innerHTML =
    '<tr><td colspan="4">Memuat daftar chapter...</td></tr>';
  try {
    const chaptersRef = collection(db, "comics", comicId, "chapters");
    const q = query(chaptersRef, orderBy("chapterNumber", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      chapterListTbody.innerHTML =
        '<tr><td colspan="4">Belum ada chapter yang ditambahkan untuk komik ini.</td></tr>';
      return;
    }

    let chaptersHTML = "";
    querySnapshot.forEach((doc) => {
      const chapter = { id: doc.id, ...doc.data() };
      const releaseDate = chapter.releaseDate
        ? new Date(chapter.releaseDate.seconds * 1000).toLocaleDateString(
            "id-ID"
          )
        : "N/A";

      chaptersHTML += `
                <tr data-chapter-id="${chapter.id}">
                    <td>Chapter ${chapter.chapterNumber}</td>
                    <td>${chapter.chapterTitle || "-"}</td>
                    <td>${releaseDate}</td>
                    <td class="action-buttons">
                        <button class="button" disabled>Edit</button>
                        <button class="button button-danger delete-btn">Hapus</button>
                    </td>
                </tr>
            `;
    });
    chapterListTbody.innerHTML = chaptersHTML;
  } catch (error) {
    console.error("Error rendering chapter list: ", error);
    chapterListTbody.innerHTML =
      '<tr><td colspan="4">Gagal memuat daftar chapter.</td></tr>';
  }
}

async function deleteChapter(chapterId) {
  const isConfirmed = confirm(
    "Apakah Anda yakin ingin menghapus chapter ini? Tindakan ini tidak bisa dibatalkan."
  );

  if (isConfirmed) {
    try {
      const chapterRef = doc(db, "comics", comicId, "chapters", chapterId);
      await deleteDoc(chapterRef);
      alert("Chapter berhasil dihapus.");
      renderChapterList();
    } catch (error) {
      console.error("Error deleting chapter: ", error);
      alert("Gagal menghapus chapter.");
    }
  }
}

// ======================= EVENT LISTENERS =======================

chapterListTbody.addEventListener("click", (event) => {
  if (event.target.classList.contains("delete-btn")) {
    const row = event.target.closest("tr");
    const chapterId = row.dataset.chapterId;
    if (chapterId) {
      deleteChapter(chapterId);
    }
  }
});

// ======================= INITIALIZATION =======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    setupDarkMode();
    comicId = getComicIdFromUrl();
    fetchAndDisplayComicTitle();
    renderChapterList();
  } else {
    alert("Anda harus login sebagai admin untuk mengakses halaman ini.");
    window.location.href = "admin.html";
  }
});
