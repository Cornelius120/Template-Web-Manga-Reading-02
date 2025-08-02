// ======================= IMPORTS =======================
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ======================= DOM ELEMENTS =======================
const detailContent = document.getElementById("detail-content");
const themeButton = document.getElementById("theme-button");
const navMenu = document.getElementById("nav-menu");
const navToggle = document.getElementById("nav-toggle");

// ======================= FUNGSI-FUNGSI =======================

/**
 * Mengatur fungsionalitas menu mobile.
 */
function setupMobileMenu() {
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.add("show-menu");
    });
  }
  // Anda bisa menambahkan tombol close di dalam nav__menu di HTML untuk fungsi menutup
}

/**
 * Mengatur fungsionalitas mode gelap/terang.
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
 * Fungsi utama untuk mengambil semua data dan menampilkannya.
 */
async function loadComicDetails() {
  const comicId = getComicIdFromUrl();
  if (!comicId) {
    detailContent.innerHTML = "<p>Error: ID Komik tidak ditemukan di URL.</p>";
    return;
  }

  try {
    // 1. Ambil data utama komik
    const comicRef = doc(db, "comics", comicId);
    const comicSnap = await getDoc(comicRef);

    if (!comicSnap.exists()) {
      detailContent.innerHTML = "<p>Error: Komik tidak ditemukan.</p>";
      return;
    }

    const comicData = comicSnap.data();

    // Mengubah judul dokumen HTML
    document.title = `${comicData.title} - Manga o Yonde`;

    // 2. Ambil data chapter dari sub-koleksi
    const chaptersRef = collection(db, "comics", comicId, "chapters");
    const q = query(chaptersRef, orderBy("chapterNumber", "desc"));
    const chaptersSnapshot = await getDocs(q);

    let chaptersHTML = "";
    if (chaptersSnapshot.empty) {
      chaptersHTML = '<div class="chapter-list__item">Belum ada chapter.</div>';
    } else {
      chaptersSnapshot.forEach((doc) => {
        const chapter = doc.data();
        const releaseDate = chapter.releaseDate
          ? new Date(chapter.releaseDate.seconds * 1000).toLocaleDateString(
              "id-ID"
            )
          : "";
        chaptersHTML += `
                    <div class="chapter-list__item">
                        <a href="reader.html?id=${comicId}&chapter=${
          doc.id
        }">Chapter ${chapter.chapterNumber} ${
          chapter.chapterTitle ? `: ${chapter.chapterTitle}` : ""
        }</a>
                        <span class="chapter-list__date">${releaseDate}</span>
                    </div>
                `;
      });
    }

    // 3. Membuat HTML lengkap untuk ditampilkan
    const detailHTML = `
            <div class="detail__container">
                <div class="detail__thumbnail">
                    <img src="${comicData.thumbnailUrl}" alt="${
      comicData.title
    }">
                </div>
                <div class="detail__info">
                    <h1>${comicData.title}</h1>
                    <table class="info-table">
                        <tr>
                            <td>Judul Alternatif:</td>
                            <td>${(comicData.alternativeTitles || []).join(
                              "<br>"
                            )}</td>
                        </tr>
                        <tr>
                            <td>Author:</td>
                            <td class="info-tags">${(comicData.authors || [])
                              .map(
                                (author) =>
                                  `<a href="manga.html?q=${author}">${author}</a>`
                              )
                              .join("")}</td>
                        </tr>
                        <tr>
                            <td>Artist:</td>
                            <td class="info-tags">${(comicData.artists || [])
                              .map(
                                (artist) =>
                                  `<a href="manga.html?q=${artist}">${artist}</a>`
                              )
                              .join("")}</td>
                        </tr>
                        <tr>
                            <td>Genre:</td>
                            <td class="info-tags">${(comicData.genres || [])
                              .map(
                                (genre) =>
                                  `<a href="manga.html?genre=${genre}">${genre}</a>`
                              )
                              .join("")}</td>
                        </tr>
                        <tr>
                            <td>Tipe:</td>
                            <td class="info-tags"><a href="manga.html?type=${
                              comicData.type
                            }">${comicData.type}</a></td>
                        </tr>
                        <tr>
                            <td>Status:</td>
                            <td>${comicData.status}</td>
                        </tr>
                    </table>
                </div>
            </div>
            <div class="detail__synopsis">
                <h2>Sinopsis</h2>
                <p>${comicData.synopsis.replace(/\n/g, "<br>")}</p>
            </div>
            <div class="detail__chapters">
                <h2>Daftar Chapter</h2>
                <div class="chapter-list">
                    ${chaptersHTML}
                </div>
            </div>
        `;

    // 4. Masukkan HTML ke dalam halaman
    detailContent.innerHTML = detailHTML;
  } catch (error) {
    console.error("Error loading comic details:", error);
    detailContent.innerHTML =
      "<p>Gagal memuat detail komik. Silakan coba lagi nanti.</p>";
  }
}

// ======================= INITIALIZATION =======================
document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupDarkMode();
  loadComicDetails();
});
