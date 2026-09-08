let deferredPrompt;
const profileInstallBtn = document.getElementById('profileInstallAppBtn');

// Mencegah kemunculan pop-up instalasi bawaan peramban (browser) dan menyimpan event-nya
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('Event beforeinstallprompt berhasil dipicu.'); // Log untuk memastikan event berjalan
    e.preventDefault();
    deferredPrompt = e;
    
    if (profileInstallBtn) {
        profileInstallBtn.classList.remove('hidden');
    }
});

// Tambahkan log ini di luar event untuk pengecekan kondisi
window.addEventListener('load', () => {
    console.log('PWA Setup dimuat.');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker berhasil didaftarkan:', reg))
            .catch(err => console.error('Service Worker gagal:', err));
    }
});

// Menjalankan aksi instalasi ketika pengguna menekan tombol di tab Profil
if (profileInstallBtn) {
    profileInstallBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            // Menyembunyikan tombol jika pengguna telah menyetujui pemasangan aplikasi
            if (outcome === 'accepted') {
                profileInstallBtn.classList.add('hidden');
            }
            deferredPrompt = null;
        }
    });
}

// Mendaftarkan Service Worker ke dalam sistem
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker berhasil diaktifkan.', reg))
            .catch(err => console.error('Kesalahan: Service Worker gagal didaftarkan.', err));
    });
}

// Fitur Download Cache Paksa (Manual via Tombol)
window.forceDownloadCache = async function() {
    const btn = document.getElementById('btnDownloadCache');
    if(!btn) return;

    // Simpan teks asli dan ubah tombol jadi loading
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sedang Mengunduh...`;
    btn.disabled = true;
    btn.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        // Buka brankas cache FinoCatat v2 (Sesuaiin sama nama di Service Worker lu)
        const cache = await caches.open("finocatat-beta-v2");
        
        // List file yang WAJIB didownload biar web bisa kebuka
        // List file lokal yang WAJIB didownload biar web bisa kebuka (Tanpa CDN Eksternal)
    const urlsToCache = [
        "./",
        "/dashboard.html",
        "./manifest.json",
        "./js/firebase-config.js",
        "./js/state.js",
        "./js/ui.js",
        "./js/auth.js",
        "./js/transaksi.js",
        "./js/admin.js",
        "./js/pdf-generator.js",
        "./js/pwa-setup.js"
    ];
        
        // Sedot semua file
        await cache.addAll(urlsToCache);
        
        // Kasih notif sukses
        if (window.showSuccessModal) {
            window.showSuccessModal("Unduhan Selesai!", "Aplikasi FinoCatat lu sekarang udah 100% tahan banting dan bisa dibuka walau kaga ada sinyal.");
        } else {
            alert("Sukses! FinoCatat siap digunakan offline.");
        }
    } catch (err) {
        console.error("Gagal download cache manual:", err);
        if (window.showWarnModal) {
            window.showWarnModal("Gagal Mengunduh", "Ada file yang gagal disedot. Pastikan koneksi internet lu stabil ya bro.");
        } else {
            alert("Gagal mengunduh data offline.");
        }
    } finally {
        // Balikin wujud tombol ke semula
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
}