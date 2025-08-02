// ======================= IMPORTS =======================
import { db, auth } from "./firebase.js";

import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ======================= DOM ELEMENTS =======================
const loginView = document.getElementById("admin-login-view");
const adminPanelView = document.getElementById("admin-panel-view");
const googleLoginButton = document.getElementById("admin-login-google");
const emailLoginForm = document.getElementById("email-login-form");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("admin-logout-button");
const adminDisplayName = document.getElementById("admin-display-name");
const addComicForm = document.getElementById("add-comic-form");
const genreListContainer = document.getElementById("genre-list-container");
const themeButton = document.getElementById("theme-button"); // Tombol Dark Mode BARU

// Elemen Navigasi & Tampilan
const showListBtn = document.getElementById("show-list-btn");
const showAddBtn = document.getElementById("show-add-btn");
const showApiKeyBtn = document.getElementById("show-api-key-btn");

const comicListSection = document.getElementById("comic-list-section");
const addComicSection = document.getElementById("add-comic-section");
const apiKeySection = document.getElementById("api-key-section");
const comicListTbody = document.getElementById("comic-list-tbody");
const apiKeyForm = document.getElementById("api-key-form");
const apiKeyInputs = document.querySelectorAll(".api-key-input");

// ======================= DATA & CONFIG =======================
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

async function renderComicList() {
  comicListTbody.innerHTML =
    '<tr><td colspan="4">Memuat daftar komik...</td></tr>';
  try {
    const comicsRef = collection(db, "comics");
    const q = query(comicsRef, orderBy("lastUpdated", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      comicListTbody.innerHTML =
        '<tr><td colspan="4">Belum ada komik yang ditambahkan.</td></tr>';
      return;
    }

    let comicsHTML = "";
    querySnapshot.forEach((doc) => {
      const comic = { id: doc.id, ...doc.data() };
      comicsHTML += `
    <tr>
        <td><img src="${comic.thumbnailUrl || ""}" alt="${comic.title}"></td>
        <td>${comic.title}</td>
        <td>${comic.status}</td>
        <td class="action-buttons">
            <button class="button" onclick="location.href='edit-comic.html?id=${
              comic.id
            }'">Edit Komik</button>
            <button class="button" onclick="location.href='chapter-list.html?id=${
              comic.id
            }'">Lihat Chapter</button>
        </td>
    </tr>
`;
    });
    comicListTbody.innerHTML = comicsHTML;
  } catch (error) {
    console.error("Error rendering comic list: ", error);
    comicListTbody.innerHTML =
      '<tr><td colspan="4">Gagal memuat daftar komik.</td></tr>';
  }
}

async function loadApiKeys() {
  const apiKeysRef = doc(db, "settings", "apiKeys");
  const docSnap = await getDoc(apiKeysRef);
  if (docSnap.exists()) {
    const keys = docSnap.data().keys || [];
    apiKeyInputs.forEach((input, index) => {
      input.value = keys[index] || "";
    });
  }
}

function switchAdminView(viewToShow) {
  comicListSection.style.display = "none";
  addComicSection.style.display = "none";
  apiKeySection.style.display = "none";
  showListBtn.classList.remove("active");
  showAddBtn.classList.remove("active");
  showApiKeyBtn.classList.remove("active");

  if (viewToShow === "list") {
    comicListSection.style.display = "block";
    showListBtn.classList.add("active");
    renderComicList();
  } else if (viewToShow === "add") {
    addComicSection.style.display = "block";
    showAddBtn.classList.add("active");
  } else if (viewToShow === "api") {
    apiKeySection.style.display = "block";
    showApiKeyBtn.classList.add("active");
    loadApiKeys();
  }
}

function toggleAdminView(isAdmin, user) {
  if (isAdmin) {
    loginView.style.display = "none";
    adminPanelView.style.display = "block";
    adminDisplayName.textContent = user.displayName || user.email;
    switchAdminView("list");
  } else {
    loginView.style.display = "block";
    adminPanelView.style.display = "none";
    if (user) {
      loginView.querySelector("h2").textContent = "Akses Ditolak";
      loginView.querySelector("p").textContent =
        "Akun Anda tidak memiliki hak akses sebagai Admin.";
      googleLoginButton.style.display = "none";
      emailLoginForm.style.display = "none";
    }
  }
}

// ======================= DARK MODE LOGIC (BARU) =======================
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

// ======================= EVENT LISTENERS =======================
showListBtn.addEventListener("click", () => switchAdminView("list"));
showAddBtn.addEventListener("click", () => switchAdminView("add"));
showApiKeyBtn.addEventListener("click", () => switchAdminView("api"));

apiKeyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const keysToSave = Array.from(apiKeyInputs)
    .map((input) => input.value.trim())
    .filter((key) => key);
  try {
    await setDoc(doc(db, "settings", "apiKeys"), { keys: keysToSave });
    alert("API Keys berhasil disimpan!");
  } catch (error) {
    console.error("Error saving API keys:", error);
    alert("Gagal menyimpan API Keys.");
  }
});

googleLoginButton.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch((error) =>
    console.error("Google sign-in error:", error)
  );
});

emailLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  loginError.textContent = "";
  signInWithEmailAndPassword(auth, email, password).catch((error) => {
    loginError.textContent = "Email atau password salah.";
  });
});

logoutButton.addEventListener("click", () => {
  signOut(auth).catch((error) => console.error("Sign-out error:", error));
});

addComicForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitButton = addComicForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan...";

  try {
    const selectedGenres = Array.from(
      document.querySelectorAll('input[name="genres"]:checked')
    ).map((cb) => cb.value);
    const comicData = {
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
      viewCount: 0,
      totalRatings: 0,
      averageRating: 0,
      lastUpdated: serverTimestamp(),
    };
    await addDoc(collection(db, "comics"), comicData);
    alert(`Komik "${comicData.title}" berhasil ditambahkan!`);
    addComicForm.reset();
    switchAdminView("list");
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Gagal menambahkan komik.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Simpan Komik";
  }
});

// ======================= INITIALIZATION =======================
populateGenreList();
setupDarkMode(); // Panggil fungsi dark mode
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const idTokenResult = await user.getIdTokenResult();
      const isAdmin = idTokenResult.claims.admin === true;
      toggleAdminView(isAdmin, user);
    } catch (error) {
      console.error("Error getting user role:", error);
      toggleAdminView(false, null);
    }
  } else {
    toggleAdminView(false, null);
  }
});
