import { auth, db } from "./firebase.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const snapshot = await get(ref(db, `users/${user.uid}`));
  if (snapshot.exists()) {
    const data = snapshot.val();
    let walletUID = data.uid;

    // Ensure the UID follows CRX format
    if (!walletUID.startsWith('CRX')) {
      walletUID = `CRX${walletUID}`;
      // Optionally update it in Firebase
      // await update(ref(db, `users/${user.uid}`), { uid: walletUID });
    }

    // Show QR Code
    new QRCode(document.getElementById("walletQr"), {
      text: walletUID,
      width: 150,
      height: 150,
      colorDark: "#000",
      colorLight: "#fff",
    });

    // Show UID and Copy Function
    document.getElementById("walletAddress").textContent = walletUID;
    document.getElementById("copyButton").addEventListener("click", () => {
      navigator.clipboard.writeText(walletUID).then(() => {
        alert("Wallet UID copied!");
      });
    });
  }
});