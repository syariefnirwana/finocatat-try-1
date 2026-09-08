// ==========================================
// STATE.JS - GUDANG MEMORI APLIKASI
// ==========================================
// Semua variabel global dideklarasikan di sini.

// 1. Data User & Transaksi Utama
window.globalTotalSaldo = 0;
window.cachedUsernameRaw = "";
window.currentUserUid = null;
window.localTransactionsCache = [];

// 2. Data Panel Admin
window.isAdmin = false;
window.appConfigData = null;
window.adminUserCache = [];

// 3. Status Sesi & Callback (Modal System)
window.pendingReAuth = { type: null, payload: null };
window.successCallback = null;
window.isExiting = false; // Flag sakti penahan bug redirect pas logout

// 4. Cache Evaluasi Bulanan (Banner)
window.cachedPem = 0;
window.cachedPeng = 0;

// 5. Pagination & Interaksi Transaksi
window.currentTxPage = 1;
window.txPerPage = 10;
window.pendingDeleteId = null;

// 6. Pagination Admin Users
window.adminCurrentPage = 1;
window.adminItemsPerPage = 5;

// 7. Carousel Banner System
window.currentSlide = 0;
window.totalSlides = 3;

// Export default (Opsional karena sudah otomatis global di window)
export default {};