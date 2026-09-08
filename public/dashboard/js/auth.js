import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, deleteUser, updatePassword, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, query, where, doc, deleteDoc, getDocs, writeBatch, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// AUTH.JS - SISTEM KEAMANAN & OTENTIKASI
// ==========================================

// 1. Fungsi Logout
window.executeLogout = async function() { 
    window.isExiting = true; 
    window.closeCustomLogout(); 
    await signOut(auth); 
    localStorage.removeItem('activeTab');
    window.showSuccessModal("Keluar Akun", "Anda telah berhasil logout dari sesi aplikasi.", () => { 
        window.location.href = "../index.html"; 
    }); 
}

// 2. Fungsi Update Profil (Username)
window.updateProfileUsername = async function() { 
    const rawNew = document.getElementById('profEditUsername').value.trim(); 
    if(!rawNew) return window.showWarnModal("Input Kosong", "Username tidak boleh dibiarkan kosong."); 
    if(!/^[a-zA-Z0-9]+$/.test(rawNew)) return window.showWarnModal("Format Salah", "Username hanya boleh menggunakan huruf dan angka tanpa spasi atau simbol."); 
    
    const newLow = rawNew.toLowerCase(); 
    if(newLow === window.cachedUsernameRaw.toLowerCase()) return window.showWarnModal("Peringatan", "Username ini adalah username yang sedang Anda gunakan saat ini."); 
    
    try { 
        const check = await getDoc(doc(db, "usernames", newLow)); 
        if(check.exists()) return window.showWarnModal("Username Terpakai", "Maaf, username tersebut telah digunakan oleh pengguna lain. Pilih yang lain."); 
        
        await setDoc(doc(db, "usernames", newLow), { email: auth.currentUser.email, uid: auth.currentUser.uid, rawUsername: rawNew }); 
        await deleteDoc(doc(db, "usernames", window.cachedUsernameRaw.toLowerCase())); 
        
        window.cachedUsernameRaw = rawNew; 
        document.getElementById('profUser').textContent = rawNew; 
        window.showSuccessModal("Username Diperbarui", "Identitas publik Anda berhasil diubah dengan aman."); 
    } catch(e) { 
        window.showWarnModal("Gangguan Sistem", "Terjadi kesalahan internal saat mencoba mengubah data username."); 
    } 
}

// 3. Sistem Re-Auth (Gembok Keamanan)
window.openReAuthModal = function(type, payload) { 
    window.pendingReAuth = { type, payload }; 
    document.getElementById('reAuthPasswordInput').value = ''; 
    document.getElementById('reAuthModal').classList.remove('hidden'); 
}

window.submitReAuth = async function() { 
    const pass = document.getElementById('reAuthPasswordInput').value; 
    if(!pass) return window.showWarnModal("Input Kosong", "Harap masukkan kata sandi Anda saat ini."); 
    
    const cred = EmailAuthProvider.credential(auth.currentUser.email, pass); 
    try { 
        await reauthenticateWithCredential(auth.currentUser, cred); 
        window.closeModal('reAuthModal'); 
        
        if(window.pendingReAuth.type === 'email') { 
            await verifyBeforeUpdateEmail(auth.currentUser, window.pendingReAuth.payload); 
            document.getElementById('profEditEmail').value = auth.currentUser.email; 
            window.showSuccessModal("Link Verifikasi Terkirim!", "Sesi diverifikasi. Cek kotak masuk/spam di email baru Anda untuk konfirmasi akhir."); 
        } else if(window.pendingReAuth.type === 'password') { 
            await updatePassword(auth.currentUser, window.pendingReAuth.payload); 
            document.getElementById('profEditPassword').value = ''; 
            window.showSuccessModal("Kata Sandi Diperbarui", "Sesi berhasil diverifikasi. Kata sandi akun berhasil diganti secara permanen."); 
        } 
    } catch(e) { 
        window.showWarnModal("Akses Ditolak", "Kata sandi saat ini yang Anda masukkan salah. Verifikasi gagal."); 
    } 
}

// 4. Fungsi Update Email & Password
window.updateProfileEmail = async function() { 
    const newE = document.getElementById('profEditEmail').value.trim(); 
    if(!newE) return window.showWarnModal("Input Kosong", "Alamat email baru tidak boleh kosong."); 
    if(!newE.includes('@') || newE === auth.currentUser.email) return window.showWarnModal("Email Tidak Valid", "Masukkan alamat email yang valid dan berbeda dengan email Anda saat ini."); 
    
    try { 
        await verifyBeforeUpdateEmail(auth.currentUser, newE); 
        
        // FIX: Sinkronisasi email baru ke database usernames
        if (window.cachedUsernameRaw) {
            await updateDoc(doc(db, "usernames", window.cachedUsernameRaw.toLowerCase()), { 
                email: newE 
            });
            window.sendUserNotification(window.cachedUsernameRaw, "Perubahan Email", `Anda telah mengajukan perubahan alamat email ke ${newE}. Silakan periksa kotak masuk Anda untuk instruksi verifikasi.`, "system");
        }

        document.getElementById('profEditEmail').value = auth.currentUser.email; 
        window.showSuccessModal("Link Verifikasi Terkirim!", `Silakan buka inbox/spam di ${newE} dan klik link yang dikirim Firebase untuk mengubah email.`); 
    } catch(e) { 
        if(e.code === 'auth/requires-recent-login') window.openReAuthModal('email', newE); 
        else window.showWarnModal("Gagal Mengirim", "Terjadi kesalahan: " + e.message); 
    } 
}

window.updateProfilePassword = async function() { 
    const newP = document.getElementById('profEditPassword').value; 
    if(!newP) return window.showWarnModal("Input Kosong", "Kata sandi baru tidak boleh dibiarkan kosong."); 
    if(newP.length < 8 || newP.length > 16 || !/[A-Z]/.test(newP) || !/[a-z]/.test(newP)) return window.showWarnModal("Format Sandi Ditolak", "Kata sandi baru harus 8-16 karakter dan mengandung minimal 1 huruf besar dan 1 huruf kecil."); 
    
    try { 
        await updatePassword(auth.currentUser, newP); 
        document.getElementById('profEditPassword').value = ''; 
        window.showSuccessModal("Kata Sandi Diperbarui", "Kata sandi akun Anda berhasil diganti dengan aman."); 
        window.sendUserNotification(window.cachedUsernameRaw, "Pembaruan Keamanan", "Kata sandi akun Anda telah berhasil diubah. Harap jaga kerahasiaan kata sandi baru Anda.", "system");
    } catch(e) { 
        if(e.code === 'auth/requires-recent-login') window.openReAuthModal('password', newP); 
        else window.showWarnModal("Gagal Pembaruan", "Gagal mengganti password: " + e.message); 
    } 
}

// 5. Danger Zone (Hapus Data & Akun)
window.executeDangerAction = async function(mode) { 
    if (mode === 'resetData') { 
        try { 
            const q = query(collection(db, "transaksi"), where("uid", "==", window.currentUserUid)); 
            const snap = await getDocs(q); 
            const batch = writeBatch(db); 
            snap.forEach(d => batch.delete(d.ref)); 
            await batch.commit(); 
            
            window.closeModal('dangerZoneModal'); 
            window.showSuccessModal("Berhasil Menghapus", "Seluruh data transaksi keuangan Anda berhasil dikosongkan."); 
        } catch (e) { 
            window.showWarnModal("Gagal", "Sistem gagal menghapus data."); 
        } 
    } else if (mode === 'deleteAccount') { 
        if (document.getElementById('dangerUserVerifyInput').value.trim() !== window.cachedUsernameRaw) return window.showWarnModal("Username Salah", "Teks yang Anda ketik tidak cocok dengan username Anda saat ini."); 
        
        try { 
            window.isExiting = true;
            await deleteDoc(doc(db, "usernames", window.cachedUsernameRaw.toLowerCase())); 
            const q = query(collection(db, "transaksi"), where("uid", "==", window.currentUserUid)); 
            const snap = await getDocs(q); 
            const batch = writeBatch(db); 
            snap.forEach(d => batch.delete(d.ref)); 
            await batch.commit(); 
            
            await deleteUser(auth.currentUser); 
            localStorage.removeItem('activeTab'); 
            
            window.closeModal('dangerZoneModal'); 
            window.showSuccessModal("Akun Dihapus", "Seluruh rekam data dan otentikasi dihapus permanen.", () => { window.location.href = "../index.html"; }); 
        } catch (e) { 
            window.isExiting = false; 
            window.showWarnModal("Akses Ditolak", "Login ulang diperlukan untuk aksi berbahaya ini."); 
        } 
    } 
}

// 6. Init Core Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (!user) { 
        if(!window.isExiting) { window.location.href = "../index.html"; }
    } else {
        window.currentUserUid = user.uid; 
        document.getElementById('profEmail').textContent = user.email; 
        document.getElementById('profEditEmail').value = user.email;

        // FITUR BARU: Update UI Status Akun Dinamis
        const statusEl = document.getElementById('profStatus');
        const btnVerify = document.getElementById('btnVerifyEmail');
        
        if(statusEl) {
            if(user.emailVerified) {
                statusEl.textContent = "Aktif Terverifikasi";
                statusEl.className = "font-semibold text-emerald-500";
                if(btnVerify) btnVerify.classList.add('hidden'); // Sembunyiin tombol kalo udah verif
            } else {
                statusEl.textContent = "Belum Terverifikasi";
                statusEl.className = "font-semibold text-amber-500"; 
                if(btnVerify) btnVerify.classList.remove('hidden'); // Munculin tombol kalo belum verif
            }
        }

        // FITUR BARU: Pop-up Announcement Update (Muncul sekali per versi update)
        if (!localStorage.getItem('fino_update_v1.2_seen')) {
        }
        
        // FITUR BARU: Pop-up saran verifikasi email (muncul sekali aja)
        if (!user.emailVerified && !localStorage.getItem('email_verify_warned_' + user.uid)) {
            setTimeout(() => {
                if (window.showWarnModal) {
                    window.showWarnModal(
                        "Saran Keamanan Akun", 
                        "Kami sangat menyarankan Anda untuk memverifikasi alamat email saat ini. Hal ini akan mempermudah Anda dalam memulihkan akun atau mereset kata sandi di kemudian hari. (Silakan periksa di menu Profil > Pengaturan Keamanan & Akun)"
                    );
                }
                localStorage.setItem('email_verify_warned_' + user.uid, 'true');
            }, 1500); 
        }
        
        getDocs(query(collection(db, "usernames"), where("uid", "==", user.uid))).then(snap => { 
            snap.forEach(d => { 
                const data = d.data(); // FIX: Deklarasiin variabel data di sini biar JS kaga bingung
                
                window.cachedUsernameRaw = data.rawUsername || ""; 
                document.getElementById('profUser').textContent = window.cachedUsernameRaw;
                // FIX: Update status verifikasi email ke database biar Admin Panel bisa baca
                if (data.isVerified !== user.emailVerified) {
                    updateDoc(d.ref, { isVerified: user.emailVerified }).catch(e => console.log(e));
                }
                document.getElementById('profEditUsername').value = window.cachedUsernameRaw; 
                
                // Render ulang foto profil dari memori
                if (data.photoURL) {
                    document.getElementById('profPicContainer').style.backgroundImage = `url(${data.photoURL})`;
                    document.getElementById('profPicIcon').classList.add('hidden');
                }
            }); 
            
            if(typeof window.initAppConfigSystem === 'function') window.initAppConfigSystem(); 
            if(typeof window.loadCustomDompetFromDB === 'function') window.loadCustomDompetFromDB();

            // Nyalain mesin inbox notif
            if(typeof window.initNotificationListener === 'function') window.initNotificationListener();

            // Tembak log login tapi batas 1x per sesi tab browser
                if(!sessionStorage.getItem('session_login_logged')) {
                    if(typeof window.sendUserNotification === 'function') {
                        window.sendUserNotification(window.cachedUsernameRaw, "Aktivitas Login Baru", `Sesi login baru terdeteksi pada ${new Date().toLocaleString('id-ID')}. Jika ini bukan Anda, segera ubah kata sandi Anda.`, "system");
                    }
                    sessionStorage.setItem('session_login_logged', 'true');
                }
        });

        if(typeof window.initTransactionListener === 'function') window.initTransactionListener(user.uid);
    }
    // Panggil inisialisasi dompet custom milik user
        if(typeof window.loadCustomDompetFromDB === 'function') window.loadCustomDompetFromDB();
        if(typeof window.refreshDompetUI === 'function') window.refreshDompetUI();
});

// 7. Fungsi Eksekusi Kirim Email Verifikasi
window.sendVerificationEmail = async function() {
    const user = auth.currentUser;
    if(!user) return;
    
    try {
        await sendEmailVerification(user);
        if(window.showSuccessModal) {
            window.showSuccessModal("Email Terkirim!", "Cek kotak masuk atau folder spam di email lu. Kalo linknya udah diklik, silakan logout dan login ulang biar status akun ke-refresh.");
        } else {
            alert("Email verifikasi berhasil dikirim!");
        }
    } catch(err) {
        console.error("🔥 Error Verifikasi:", err);
        if(window.showWarnModal) {
            if(err.code === 'auth/too-many-requests') {
                window.showWarnModal("Sabar Bro", "Lu udah minta link verifikasi berkali-kali. Firebase ngebatesin spam, coba tunggu beberapa menit lagi.");
            } else {
                window.showWarnModal("Gagal Mengirim", "Terjadi kesalahan jaringan pas ngirim email.");
            }
        }
    }
}