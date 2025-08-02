const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.addAdminRole = functions.https.onCall((data, context) => {
  // Pastikan hanya admin yang sudah ada yang bisa memanggil fungsi ini (untuk keamanan tambahan)
  // if (context.auth.token.admin !== true) {
  //   return { error: "Hanya admin yang bisa menambahkan admin baru." };
  // }

  // Mendapatkan user berdasarkan email dan menambahkan custom claim 'admin'
  return admin
    .auth()
    .getUserByEmail(data.email)
    .then((user) => {
      return admin.auth().setCustomUserClaims(user.uid, {
        admin: true,
      });
    })
    .then(() => {
      return { message: `Sukses! ${data.email} telah dijadikan admin.` };
    })
    .catch((err) => {
      return { error: err.message };
    });
});
