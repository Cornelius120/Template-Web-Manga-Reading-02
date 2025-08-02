// ======================= IMPORTS =======================
// Mengimpor semua yang kita butuhkan dari file firebase.js
import {
  db,
  auth,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onAuthStateChanged,
} from "./firebase.js";

// ======================= UI & THEME LOGIC =======================
const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close"); // Kita perlu menambahkan tombol close di HTML nanti

/* Tampilkan menu mobile */
if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show-menu");
  });
}

/* Sembunyikan menu mobile */
// Kita akan tambahkan tombol close di dalam menu di HTML nanti agar bisa ditutup
if (navClose) {
  navClose.addEventListener("click", () => {
    navMenu.classList.remove("show-menu");
  });
}

/* Dark/Light Theme */
const themeButton = document.getElementById("theme-button");
const darkTheme = "dark-theme";
const iconTheme = "fa-sun"; // Ikon untuk mode gelap

// Cek tema yang tersimpan dari kunjungan sebelumnya
const selectedTheme = localStorage.getItem("selected-theme");
const selectedIcon = localStorage.getItem("selected-icon");

// Fungsi untuk mendapatkan tema saat ini
const getCurrentTheme = () =>
  document.body.classList.contains(darkTheme) ? "dark" : "light";
const getCurrentIcon = () =>
  themeButton.classList.contains(iconTheme) ? "fa-sun" : "fa-moon";

// Validasi dan terapkan tema dari localStorage
if (selectedTheme) {
  document.body.classList[selectedTheme === "dark" ? "add" : "remove"](
    darkTheme
  );
  themeButton.classList[selectedIcon === "fa-sun" ? "add" : "remove"](
    iconTheme
  );
  if (selectedIcon !== "fa-sun") themeButton.classList.add("fa-moon");
}

// Aktifkan/nonaktifkan tema secara manual dengan tombol
themeButton.addEventListener("click", () => {
  // Tambah atau hapus dark theme
  document.body.classList.toggle(darkTheme);
  themeButton.classList.toggle(iconTheme);
  // Ganti ikon moon jika tidak ada sun
  if (!themeButton.classList.contains(iconTheme)) {
    themeButton.classList.add("fa-moon");
  } else {
    themeButton.classList.remove("fa-moon");
  }

  // Simpan tema dan ikon pilihan pengguna
  localStorage.setItem("selected-theme", getCurrentTheme());
  localStorage.setItem("selected-icon", getCurrentIcon());
});

// ======================= DATA FETCHING & RENDERING =======================

const latestGrid = document.getElementById("latest-updates-grid");
const popularGrid = document.getElementById("popular-comics-grid");
const sliderContainer = document.querySelector(".comic-slider");

/**
 * Fungsi generik untuk membuat kartu komik HTML.
 * @param {object} comic - Objek data komik dari Firestore.
 * @returns {string} - String HTML untuk satu kartu komik.
 */
function createComicCard(comic) {
  // Placeholder jika thumbnail tidak ada
  const thumbnailUrl =
    comic.thumbnailUrl ||
    "https://via.placeholder.com/150x220.png?text=No+Image";

  return `
        <div class="comic-card" data-id="${comic.id}">
            <a href="detail.html?id=${comic.id}">
                <img src="${thumbnailUrl}" alt="${
    comic.title
  }" class="comic-card__image">
                <div class="comic-card__overlay">
                    <h3 class="comic-card__title">${comic.title}</h3>
                    <span class="comic-card__chapter">Update Ch. ${
                      comic.lastChapter || ""
                    }</span>
                </div>
            </a>
        </div>
    `;
}

/**
 * Fungsi untuk mengambil data dan menampilkannya di grid.
 * @param {object} q - Objek query Firestore.
 * @param {HTMLElement} container - Elemen HTML container untuk grid.
 */
async function renderComics(q, container) {
  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      container.innerHTML = "<p>Belum ada komik untuk ditampilkan.</p>";
      return;
    }

    let comicsHTML = "";
    querySnapshot.forEach((doc) => {
      comicsHTML += createComicCard({ id: doc.id, ...doc.data() });
    });
    container.innerHTML = comicsHTML;
  } catch (error) {
    console.error("Error rendering comics: ", error);
    container.innerHTML = "<p>Gagal memuat komik. Coba lagi nanti.</p>";
  }
}

/**
 * Fungsi untuk membuat dan menampilkan slider.
 */
async function renderSlider() {
  try {
    const comicsRef = collection(db, "comics");
    const q = query(comicsRef, orderBy("lastUpdated", "desc"), limit(10));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      sliderContainer.innerHTML = "<p>Slider tidak tersedia.</p>";
      return;
    }

    let slidesHTML = "";
    querySnapshot.forEach((doc) => {
      const comic = { id: doc.id, ...doc.data() };
      const synopsisSnippet = comic.synopsis
        ? comic.synopsis.substring(0, 100) + "..."
        : "Tidak ada sinopsis.";

      slidesHTML += `
                <div class="slide" style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${
                  comic.thumbnailUrl || ""
                })">
                    <div class="slide__content">
                        <h2 class="slide__title">${comic.title}</h2>
                        <p class="slide__genres">${
                          comic.genres ? comic.genres.join(", ") : ""
                        }</p>
                        <p class="slide__synopsis">${synopsisSnippet}</p>
                        <a href="detail.html?id=${
                          comic.id
                        }" class="button">Baca Sekarang</a>
                    </div>
                </div>
            `;
    });

    // Untuk saat ini kita tampilkan semua, nanti kita implementasikan library slider
    sliderContainer.innerHTML = slidesHTML;
  } catch (error) {
    console.error("Error rendering slider: ", error);
    sliderContainer.innerHTML = "<p>Gagal memuat slider.</p>";
  }
}

// ======================= INISIALISASI HALAMAN =======================
// Fungsi ini akan berjalan setelah seluruh halaman HTML dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Membuat query untuk data
  const comicsRef = collection(db, "comics");
  const latestQuery = query(
    comicsRef,
    orderBy("lastUpdated", "desc"),
    limit(18)
  );
  const popularQuery = query(
    comicsRef,
    orderBy("viewCount", "desc"),
    limit(10)
  );

  // Memuat semua data
  renderSlider();
  renderComics(latestQuery, latestGrid);
  renderComics(popularQuery, popularGrid);
});
