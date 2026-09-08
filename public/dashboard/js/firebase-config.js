import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRFdFw1LTjydGLG8cN7PGaLJoIs-i9o0I",
  authDomain: "catat-keuangan-web.firebaseapp.com",
  projectId: "catat-keuangan-web",
  storageBucket: "catat-keuangan-web.firebasestorage.app",
  messagingSenderId: "697960795997",
  appId: "1:697960795997:web:ac6918a4d118a2c12022b4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("FinoCatat ke-buka di banyak tab, mode offline cuma jalan di 1 tab utama bro.");
    } else if (err.code == 'unimplemented') {
        console.warn("Browser HP lu kaga support nyimpen data offline.");
    }
});

export { app, auth, db, messaging, getToken, onMessage };