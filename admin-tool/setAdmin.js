// Mengimpor SDK Admin Firebase
const admin = require("firebase-admin");

// Mengimpor kunci rahasia yang sudah Anda unduh
const serviceAccount = require("./serviceAccountKey.json");

// Inisialisasi aplikasi dengan hak akses admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ===================================================================
// GANTI DENGAN EMAIL ANDA YANG INGIN DIJADIKAN ADMIN
const emailToMakeAdmin = "sembiringcornelius18@gmail.com";
// ===================================================================

console.log(`Mencoba menjadikan ${emailToMakeAdmin} sebagai admin...`);

// Proses mencari user berdasarkan email
admin
  .auth()
  .getUserByEmail(emailToMakeAdmin)
  .then((user) => {
    // Jika user ditemukan, tambahkan "label" admin ke akunnya
    return admin.auth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log(
      `✅ BERHASIL! ${emailToMakeAdmin} sekarang adalah seorang admin.`
    );
    console.log(
      "Silakan logout dan login kembali di website untuk melihat perubahannya."
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ GAGAL:", error.message);
    console.error(
      "Pastikan email yang Anda masukkan sudah terdaftar di Firebase Authentication."
    );
    process.exit(1);
  });
