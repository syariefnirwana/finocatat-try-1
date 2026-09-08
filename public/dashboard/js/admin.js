import { db } from "./firebase-config.js";
import { collection, doc, updateDoc, setDoc, getDocs, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// ADMIN.JS - SISTEM KONTROL PANEL ADMIN
// ==========================================

window.initAppConfigSystem = function () {
    onSnapshot(doc(db, "app_config", "settings"), (docSnap) => {
        if (docSnap.exists()) {
            window.appConfigData = docSnap.data();
            if (!window.appConfigData.co_admins) window.appConfigData.co_admins = [];
            if (!window.appConfigData.banners) window.appConfigData.banners = [];
            if (window.appConfigData.announcement_enabled === undefined) window.appConfigData.announcement_enabled = true;
            if (window.appConfigData.is_maintenance === undefined) window.appConfigData.is_maintenance = false;
        } else {
            // Default perdana
            window.appConfigData = {
                co_admins: [], banners: [], announcement_enabled: true, is_maintenance: false
            };
            import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(({ doc, setDoc }) => {
                setDoc(doc(db, "app_config", "settings"), window.appConfigData, { merge: true });
            });
        }

        const curUser = (window.cachedUsernameRaw || "").toLowerCase();
        const isMaster = curUser === 'adminutama' || curUser === 'syarief';
        const isCoAdmin = window.appConfigData.co_admins.map(c => c.toLowerCase()).includes(curUser);
        window.isAdmin = isMaster || isCoAdmin;

        // LOGIC LOCKDOWN MAINTENANCE
        const mOverlay = document.getElementById('maintenanceOverlay');
        const mText = document.getElementById('maintenanceMsgText');
        
        if (window.appConfigData.is_maintenance) {
            if (mText) mText.innerText = window.appConfigData.maintenance_msg || "Server sedang dalam peningkatan kualitas.";
            if (!window.isAdmin) {
                // User biasa? Kunci layarnya!
                if (mOverlay) {
                    mOverlay.classList.remove('hidden');
                    mOverlay.classList.add('flex');
                }
            } else {
                // Kalo admin, kasih tau doang tapi kaga dikunci
                console.warn("Maintance Mode ON! Tapi lu Admin, jadi bebas nembus.");
                if (mOverlay) mOverlay.classList.add('hidden');
            }
        } else {
            // Kalo maintenance mati, cabut overlay
            if (mOverlay) mOverlay.classList.add('hidden');
        }

        if (window.isAdmin) {
            document.getElementById('navAdminDesktop').classList.remove('hidden');
            document.getElementById('navAdminMobile').classList.remove('hidden');
            document.getElementById('navAdminMobile').classList.add('flex');
            if (isMaster) window.adminFetchUserList();
        } else {
            document.getElementById('navAdminDesktop').classList.add('hidden');
            document.getElementById('navAdminMobile').classList.add('hidden');
            document.getElementById('navAdminMobile').classList.remove('flex');
            if (localStorage.getItem('activeTab') === 'admin') window.switchTab('dashboard');
        }

        window.renderAppConfigUI();
    });
}

// 2. Render UI Berdasarkan Config Firestore
window.renderAppConfigUI = function () {

    // Render Toggle Maintenance & Isi Auto Notif
    const adminMaintToggle = document.getElementById('adminToggleMaintenanceBtn');
    const maintInputBox = document.getElementById('maintenanceInputBox');
    const maintMsgInput = document.getElementById('adminMaintenanceMsg');
    
    // TAMBAHIN DUA BARIS INI BUAT NGISI TEXTBOX NOTIF OTOMATIS:
    if(document.getElementById('adminAutoNotifTitle')) document.getElementById('adminAutoNotifTitle').value = window.appConfigData.auto_notif_title || "";
    if(document.getElementById('adminAutoNotifContent')) document.getElementById('adminAutoNotifContent').value = window.appConfigData.auto_notif_content || "";
    
    if (adminMaintToggle) {
        if (window.appConfigData.is_maintenance) {
            adminMaintToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-5"></div>`;
            adminMaintToggle.className = "w-10 h-5 rounded-full bg-red-600 p-1 transition-colors relative flex items-center";
            if (maintInputBox) maintInputBox.style.display = 'flex';
            if (maintMsgInput) maintMsgInput.value = window.appConfigData.maintenance_msg || "";
        } else {
            adminMaintToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-0"></div>`;
            adminMaintToggle.className = "w-10 h-5 rounded-full bg-slate-300 dark:bg-slate-700 p-1 transition-colors relative flex items-center";
            if (maintInputBox) maintInputBox.style.display = 'none';
        }
    }
    const webName = window.appConfigData.app_name || "FinoCatat";
    document.querySelectorAll('.display-app-name').forEach(el => el.textContent = webName);

    const displayAbout = document.getElementById('displayAboutText');
    if (displayAbout) {
        displayAbout.innerHTML = (window.appConfigData.about_text || "Aplikasi manajemen pencatatan.") + `<br><br><span class="text-[10px] opacity-70">Hak Cipta Terlindungi &copy; 2026 ${webName}.</span>`;
    }

    if (window.isAdmin) {
        const adminAppName = document.getElementById('adminAppNameInput');
        const adminAbout = document.getElementById('adminAboutInput');
        if (adminAppName) adminAppName.value = webName;
        if (adminAbout) adminAbout.value = window.appConfigData.about_text || "";

        // ISI VALUE ADMIN PENGUMUMAN
        const aTitle = document.getElementById('adminAnnTitle');
        const aVer = document.getElementById('adminAnnVersion');
        const aContent = document.getElementById('adminAnnContent');
        const aToggle = document.getElementById('adminAnnToggleBtn');
        if (aTitle && window.appConfigData.announcement) aTitle.value = window.appConfigData.announcement.title;
        if (aVer && window.appConfigData.announcement) aVer.value = window.appConfigData.announcement.version;
        if (aContent && window.appConfigData.announcement) aContent.value = window.appConfigData.announcement.content;

        if (aToggle && window.appConfigData.announcement) {
            if (window.appConfigData.announcement.enabled) {
                aToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-5"></div>`;
                aToggle.className = "w-10 h-5 rounded-full bg-emerald-500 p-1 transition-colors relative flex items-center";
            } else {
                aToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-0"></div>`;
                aToggle.className = "w-10 h-5 rounded-full bg-slate-300 dark:bg-slate-600 p-1 transition-colors relative flex items-center";
            }
        }
    }

    // Bangun ulang DOM Carousel Banners
    const track = document.getElementById('carouselTrack');
    const dotsCont = document.getElementById('carouselDotsContainer');
    let slidesHtml = '';
    let dotsHtml = '';

    const configBanners = window.appConfigData.banners || [];
    window.totalSlides = configBanners.length + 1;

    configBanners.forEach((b, i) => {
        const bgColors = ['from-accent/10', 'from-purple-500/10', 'from-amber-500/10', 'from-blue-500/10'];
        const textColors = ['text-accent', 'text-purple-600 dark:text-purple-400', 'text-amber-600 dark:text-amber-400', 'text-blue-600 dark:text-blue-400'];
        slidesHtml += `<div class="min-w-full h-full flex flex-col justify-center px-6 md:px-10 bg-gradient-to-r ${bgColors[i % 4]} to-transparent pointer-events-none select-none"><span class="text-xs font-bold ${textColors[i % 4]} uppercase tracking-wider">${b.title}</span><h2 class="text-base md:text-lg font-bold text-slate-800 dark:text-white mt-1">${b.desc}</h2></div>`;
        dotsHtml += `<button onclick="window.setSlide(${i})" class="carousel-dot w-2 h-2 rounded-full ${i === 0 ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-700'} transition-all"></button>`;
    });

    slidesHtml += `<div id="dynamicEvalSlide" class="min-w-full h-full flex flex-col justify-center px-6 md:px-10 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none select-none"><span id="evalBadge" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Evaluasi Bulanan</span><h2 id="evalText" class="text-base md:text-lg font-bold text-slate-800 dark:text-white mt-1">Menghitung rangkuman neraca...</h2></div>`;
    dotsHtml += `<button onclick="window.setSlide(${configBanners.length})" class="carousel-dot w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 transition-all"></button>`;

    if (track && dotsCont) {
        track.innerHTML = slidesHtml;
        dotsCont.innerHTML = dotsHtml;
        if (window.setSlide) window.setSlide(0);
        if (window.updateDynamicEvaluationBanner) window.updateDynamicEvaluationBanner();
    }

    // Status Toggle Inbox UI
    const adminInboxToggle = document.getElementById('adminToggleInboxBtn');
    const inboxBellMainBtn = document.querySelector('button[onclick="window.openInboxModal()"]');
    const isInboxOn = window.appConfigData.inbox_enabled !== undefined ? window.appConfigData.inbox_enabled : true;

    if (adminInboxToggle) {
        if (isInboxOn) {
            adminInboxToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-5"></div>`;
            adminInboxToggle.className = "w-10 h-5 rounded-full bg-emerald-500 p-1 transition-colors relative flex items-center";
        } else {
            adminInboxToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-0"></div>`;
            adminInboxToggle.className = "w-10 h-5 rounded-full bg-slate-300 dark:bg-slate-600 p-1 transition-colors relative flex items-center";
        }
    }

    // Sembunyiin Lonceng di UI User kalo admin matiin fitur
    if (inboxBellMainBtn) {
        if (isInboxOn) inboxBellMainBtn.classList.remove('hidden');
        else inboxBellMainBtn.classList.add('hidden');
    }

    // FIX: Tangkap elemen-elemen PDF (Gua sediain dua ID jaga-jaga kalo lu lupa ubah HTML-nya)
    const pdfBtn = document.getElementById('btnCetakPdf') || document.getElementById('pdfBtn'); 
    const pdfOverlay = document.getElementById('pdfOverlayMaintenance') || document.getElementById('pdfOverlay');
    const adminPdfToggle = document.getElementById('adminTogglePdfBtn');

    if (window.appConfigData.pdf_enabled) {
        if (pdfBtn) {
            pdfBtn.disabled = false;
            // Balikin ke warna cerah (Mode Aktif)
            pdfBtn.className = "w-full backdrop-blur-md bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center shadow-sm hover:bg-white/60 transition-all transform active:scale-95 group relative";
            
            // Targetin langsung ke anak pertamanya (div ikon) biar presisi
            const iconBox = pdfBtn.firstElementChild;
            if (iconBox && iconBox.tagName === 'DIV') {
                iconBox.className = "w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-sm";
            }
            
            const msg = pdfBtn.querySelector('.pdf-maintenance-msg');
            if(msg) msg.remove();
        }
        if (pdfOverlay) pdfOverlay.classList.remove('group-hover:opacity-100', 'group-hover:visible');
        
        if (adminPdfToggle) {
            adminPdfToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-5"></div>`;
            adminPdfToggle.className = "w-10 h-5 rounded-full bg-emerald-500 p-1 transition-colors relative flex items-center";
        }
    } else {
        if (pdfBtn) {
            pdfBtn.disabled = true;
            // Ubah border dan background jadi kusam (Mode Disabled)
            pdfBtn.className = "w-full backdrop-blur-md bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center shadow-sm cursor-not-allowed transition-all duration-300 relative group";
            
            // Matiin warna ikon jadi kelabu
            const iconBox = pdfBtn.firstElementChild;
            if (iconBox && iconBox.tagName === 'DIV') {
                iconBox.className = "w-10 h-10 rounded-xl bg-slate-400/10 text-slate-400 flex items-center justify-center text-sm";
            }
            
            // Suntik notif pake metode aman biar kaga ngerusak elemen div lain di dalem tombol
            if(!pdfBtn.querySelector('.pdf-maintenance-msg')) {
                pdfBtn.insertAdjacentHTML('beforeend', `<div class="pdf-maintenance-msg absolute inset-0 rounded-2xl bg-slate-900/10 dark:bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"><span class="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">Sedang Perbaikan</span></div>`);
            }
        }
        if (pdfOverlay) pdfOverlay.classList.add('group-hover:opacity-100', 'group-hover:visible');
        
        if (adminPdfToggle) {
            adminPdfToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-0"></div>`;
            adminPdfToggle.className = "w-10 h-5 rounded-full bg-slate-300 dark:bg-slate-600 p-1 transition-colors relative flex items-center";
        }
    }

    // Status Toggle Scan Struk AI UI
    const scannerBtn = document.getElementById('btnScanStruk');
    const adminScannerToggle = document.getElementById('adminToggleScannerBtn');
    const isScannerOn = window.appConfigData.ai_scanner_enabled !== undefined ? window.appConfigData.ai_scanner_enabled : true;

    if (adminScannerToggle) {
        if (isScannerOn) {
            adminScannerToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-5"></div>`;
            adminScannerToggle.className = "w-10 h-5 rounded-full bg-emerald-500 p-1 transition-colors relative flex items-center";
        } else {
            adminScannerToggle.innerHTML = `<div class="w-3 h-3 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-0"></div>`;
            adminScannerToggle.className = "w-10 h-5 rounded-full bg-slate-300 dark:bg-slate-600 p-1 transition-colors relative flex items-center";
        }
    }

    if (scannerBtn) {
        if (isScannerOn) {
            scannerBtn.disabled = false;
            scannerBtn.className = "w-full backdrop-blur-md bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center shadow-sm hover:bg-white/60 transition-all transform active:scale-95 group relative";
            if(scannerBtn.querySelector('div')) scannerBtn.querySelector('div').className = "w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex justify-center items-center text-sm";
            const msg = scannerBtn.querySelector('.scanner-maintenance-msg');
            if(msg) msg.remove();
        } else {
            scannerBtn.disabled = true;
            scannerBtn.className = "w-full backdrop-blur-md bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center shadow-sm cursor-not-allowed transition-all duration-300 relative group";
            if(scannerBtn.querySelector('div')) scannerBtn.querySelector('div').className = "w-10 h-10 rounded-xl bg-slate-400/10 text-slate-400 flex justify-center items-center text-sm";
            if(!scannerBtn.querySelector('.scanner-maintenance-msg')) {
                scannerBtn.innerHTML += `<div class="scanner-maintenance-msg absolute inset-0 rounded-2xl bg-slate-900/10 dark:bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"><span class="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">Sedang Perbaikan</span></div>`;
            }
        }
    }

    // Render List Co-Admin & Banner
    if (window.isAdmin) {
        const caList = document.getElementById('adminCoAdminList');
        if (caList) {
            caList.innerHTML = "";
            window.appConfigData.co_admins.forEach(c => {
                caList.innerHTML += `<div class="flex justify-between items-center bg-white dark:bg-slate-800/40 border p-2 rounded-lg"><span class="text-xs font-semibold">${c}</span><button onclick="window.adminRemoveCoAdmin('${c}')" class="text-red-500 hover:text-red-600 text-xs"><i class="fa-solid fa-trash-can"></i></button></div>`;
            });
        }

        const bnList = document.getElementById('adminBannerList');
        if (bnList) {
            bnList.innerHTML = "";
            window.appConfigData.banners.forEach((b, i) => {
                bnList.innerHTML += `<div class="flex justify-between items-center bg-white dark:bg-slate-800/40 border p-2 rounded-lg"><div class="flex flex-col pr-2"><span class="text-[10px] font-bold text-slate-500 uppercase">${b.title}</span><span class="text-xs truncate max-w-[200px]">${b.desc}</span></div><div class="flex gap-2"><button onclick="window.openEditBannerModal(${i}, '${b.title}', '${b.desc}')" class="text-blue-500 hover:text-blue-600 text-xs"><i class="fa-solid fa-pen"></i></button><button onclick="window.adminRemoveBanner(${i})" class="text-red-500 hover:text-red-600 text-xs"><i class="fa-solid fa-trash-can"></i></button></div></div>`;
            });
        }
    }
}

// 3. Modul Penyimpanan Identitas Web
window.adminSaveIdentity = async function () {
    const nm = document.getElementById('adminAppNameInput').value.trim();
    const ab = document.getElementById('adminAboutInput').value.trim();

    if (!nm) {
        if (window.showWarnModal) window.showWarnModal("Gagal Disimpan", "Nama Web/Aplikasi tidak boleh kosong.");
        return;
    }
    try {
        await updateDoc(doc(db, "app_config", "settings"), { app_name: nm, about_text: ab });
        if (window.showSuccessModal) window.showSuccessModal("Identitas Tersimpan", "Perubahan nama dan tentang kami sudah aktif.");
    } catch (e) { console.error(e); }
}

// 4. Modul Toggle Fitur
window.toggleAdminPDF = async function () {
    try {
        // Pastikan ada nilai default kalo undefined
        const currentState = window.appConfigData.pdf_enabled !== undefined ? window.appConfigData.pdf_enabled : true;

        await updateDoc(doc(db, "app_config", "settings"), { pdf_enabled: !currentState });

        if (window.showSuccessModal) window.showSuccessModal("Tersimpan", "Setelan akses fitur Cetak PDF sudah diperbarui.");
    } catch (e) {
        console.error("Gagal ubah setelan PDF", e);
        if (window.showWarnModal) window.showWarnModal("Gagal", "Terjadi kesalahan saat mengubah setelan PDF.");
    }
}

// Toggle Fitur Inbox via Admin
window.toggleAdminInbox = async function() {
    try { 
        const currentState = window.appConfigData.inbox_enabled !== undefined ? window.appConfigData.inbox_enabled : true;
        
        await updateDoc(doc(db, "app_config", "settings"), { inbox_enabled: !currentState }); 
        
        if(window.showSuccessModal) window.showSuccessModal("Tersimpan", "Setelan akses fitur Kotak Masuk (Inbox) sudah diperbarui.");
    } catch(e) { 
        console.error("Gagal ubah setelan Inbox", e); 
        if(window.showWarnModal) window.showWarnModal("Gagal", "Terjadi kesalahan saat mengubah setelan Inbox.");
    } 
}

// Toggle Fitur Scan Struk AI via Admin
window.toggleAdminScanner = async function() {
    try { 
        // Ambil data lama, kalo kosong defaultnya nyala (true)
        const currentState = window.appConfigData.ai_scanner_enabled !== undefined ? window.appConfigData.ai_scanner_enabled : true;
        
        await updateDoc(doc(db, "app_config", "settings"), { ai_scanner_enabled: !currentState }); 
        
        if(window.showSuccessModal) window.showSuccessModal("Tersimpan Bro!", "Setelan on/off fitur Scan Struk AI udah di-update ke database.");
    } catch(e) { 
        console.error("Gagal ubah setelan Scanner AI", e); 
        if(window.showWarnModal) window.showWarnModal("Gagal Eksekusi", "Waduh, terjadi error pas nyoba ngubah setelan AI Scanner.");
    } 
}

// Toggle Fitur Inbox via Admin
window.toggleAdminInbox = async function () {
    try {
        // Ambil value sebelumnya, kalo undefined berarti defaultnya true (nyala)
        const currentState = window.appConfigData.inbox_enabled !== undefined ? window.appConfigData.inbox_enabled : true;
        await updateDoc(doc(db, "app_config", "settings"), { inbox_enabled: !currentState });
        if (window.showSuccessModal) window.showSuccessModal("Tersimpan", "Setelan akses fitur Kotak Masuk (Inbox) sudah diperbarui.");
    } catch (e) { console.error("Gagal ubah setelan Inbox", e); }
}

// 5. Modul Hak Akses (Co-Admin)
window.adminAddCoAdmin = async function () {
    const input = document.getElementById('adminAddCoAdminInput').value.trim().toLowerCase();
    if (!input) return window.showWarnModal ? window.showWarnModal("Input Kosong", "Silakan ketik username yang valid terlebih dahulu.") : alert("Kosong");
    if (input === 'adminutama' || input === 'syarief' || window.appConfigData.co_admins.map(c => c.toLowerCase()).includes(input)) return window.showWarnModal ? window.showWarnModal("Sudah Terdaftar", "Username tersebut sudah memiliki akses Administrator.") : alert("Sudah ada");

    try {
        await updateDoc(doc(db, "app_config", "settings"), { co_admins: [...window.appConfigData.co_admins, input] });
        document.getElementById('adminAddCoAdminInput').value = '';
    } catch (e) { }
}

// 6. Modul Manajemen Banner
window.openAddBannerModal = function () {
    document.getElementById('adminBannerModalTitle').textContent = 'Tambah Banner Baru';
    document.getElementById('adminEditBannerIndex').value = '-1';
    document.getElementById('adminBannerTitle').value = '';
    document.getElementById('adminBannerDesc').value = '';
    document.getElementById('adminBannerModal').classList.remove('hidden');
}

window.openEditBannerModal = function (idx, t, d) {
    document.getElementById('adminBannerModalTitle').textContent = 'Edit Banner Info';
    document.getElementById('adminEditBannerIndex').value = idx;
    document.getElementById('adminBannerTitle').value = t;
    document.getElementById('adminBannerDesc').value = d;
    document.getElementById('adminBannerModal').classList.remove('hidden');
}

window.adminSubmitBanner = async function () {
    const t = document.getElementById('adminBannerTitle').value.trim();
    const d = document.getElementById('adminBannerDesc').value.trim();
    const idx = parseInt(document.getElementById('adminEditBannerIndex').value);

    if (!t || !d) return window.showWarnModal ? window.showWarnModal("Data Kosong", "Judul dan Deskripsi banner tidak boleh dibiarkan kosong.") : alert("Kosong");

    let newBanners = [...window.appConfigData.banners];
    if (idx === -1) {
        newBanners.push({ title: t, desc: d });
    } else {
        newBanners[idx] = { title: t, desc: d };
    }

    try {
        await updateDoc(doc(db, "app_config", "settings"), { banners: newBanners });
        window.closeModal('adminBannerModal');
    } catch (e) { }
}

window.adminRemoveBanner = async function (idx) {
    if (!confirm("Hapus slide banner ini?")) return;
    try { await updateDoc(doc(db, "app_config", "settings"), { banners: window.appConfigData.banners.filter((_, i) => i !== idx) }); } catch (e) { }
}

// 7. Modul List User (Khusus Master Admin)
window.adminFetchUserList = async function () {
    try {
        const snap = await getDocs(collection(db, "usernames"));
        window.adminUserCache = [];
        snap.forEach(d => window.adminUserCache.push(d.data()));

        // FIX: Suntik nilai default paginasi biar JS di HP kaga nge-blank (NaN)
        window.adminItemsPerPage = window.adminItemsPerPage || 5;
        window.adminCurrentPage = window.adminCurrentPage || 1;

        window.renderAdminUserTable();
    } catch (e) { console.error(e); }
}

window.renderAdminUserTable = function () {
    const tb = document.getElementById('adminUserTableBody');
    const pg = document.getElementById('adminUserPagination');
    if (!tb || !pg) return;

    window.adminItemsPerPage = window.adminItemsPerPage || 5;
    window.adminCurrentPage = window.adminCurrentPage || 1;

    if (!window.adminUserCache || window.adminUserCache.length === 0) {
        tb.innerHTML = `<tr><td colspan="2" class="p-2 text-center text-xs text-slate-400">Belum ada user.</td></tr>`;
        pg.innerHTML = "";
        return;
    }

    const totalP = Math.ceil(window.adminUserCache.length / window.adminItemsPerPage) || 1;
    if (window.adminCurrentPage > totalP) window.adminCurrentPage = totalP;
    const start = (window.adminCurrentPage - 1) * window.adminItemsPerPage;
    const paged = window.adminUserCache.slice(start, start + window.adminItemsPerPage);

    tb.innerHTML = "";
    paged.forEach(u => {
        const badgeStatus = u.isVerified
            ? `<span class="ml-1.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-bold whitespace-nowrap">Terverifikasi</span>`
            : `<span class="ml-1.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[8px] font-bold whitespace-nowrap">Belum</span>`;

        tb.innerHTML += `
        <tr class="border-b border-slate-200/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <td class="p-2 text-xs font-bold text-slate-700 dark:text-slate-300">@${u.rawUsername}</td>
            <td class="p-2 text-[10px] text-slate-500 flex items-center justify-between">${u.email} ${badgeStatus}</td>
        </tr>`;
    });

    let pBtn = '';
    for (let i = 1; i <= totalP; i++) {
        pBtn += `<button onclick="window.adminChangePage(${i})" class="w-5 h-5 mx-0.5 rounded text-[9px] font-bold transition-all ${i === window.adminCurrentPage ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'}">${i}</button>`;
    }

    pg.innerHTML = `
        <button onclick="window.adminChangePage(${window.adminCurrentPage - 1})" ${window.adminCurrentPage === 1 ? 'disabled' : ''} class="px-2 py-1 border rounded text-[9px] disabled:opacity-30">Prev</button>
        <div>${pBtn}</div>
        <button onclick="window.adminChangePage(${window.adminCurrentPage + 1})" ${window.adminCurrentPage === totalP ? 'disabled' : ''} class="px-2 py-1 border rounded text-[9px] disabled:opacity-30">Next</button>`;
}

window.adminChangePage = function (n) {
    window.adminCurrentPage = n;
    window.renderAdminUserTable();
}

// 8. Modul Laporan Bug & Customer Service
window.adminFetchReports = async function () {
    const tb = document.getElementById('adminReportTableBody');
    if (!tb) return;
    tb.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-xs text-slate-400 italic">Menarik data dari server...</td></tr>`;
    try {
        const snap = await getDocs(collection(db, "laporan_bug"));
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            const date = new Date(data.tanggal).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            html += `<tr class="border-b border-slate-200/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td class="p-2.5 text-[10px] text-slate-500 whitespace-nowrap"><span class="font-bold text-slate-700 dark:text-slate-300">@${data.username}</span><br>${date}</td>
                <td class="p-2.5 text-[10px] font-bold text-accent whitespace-nowrap">${data.kategori}</td>
                <td class="p-2.5 text-[11px] text-slate-600 dark:text-slate-300 max-w-[150px] md:max-w-[250px] truncate" title="${data.pesan}">${data.pesan}</td>
                <td class="p-2.5 text-center flex justify-center gap-1.5 items-center">
                    <button onclick="window.openCSDetail('${data.username}', '${data.kategori}', '${data.tanggal}', 'hidden-msg-${d.id}')" class="w-7 h-7 rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-colors" title="Lihat Detail"><i class="fa-solid fa-eye text-[10px]"></i></button>
                    <button onclick="window.adminDeleteReport('${d.id}')" class="w-7 h-7 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Hapus Laporan"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
                    <div id="hidden-msg-${d.id}" class="hidden">${data.pesan}</div>
                </td>
            </tr>`;
        });
        tb.innerHTML = html || `<tr><td colspan="4" class="p-5 text-center text-xs text-slate-400 italic">Wih sepi, belum ada laporan yang masuk.</td></tr>`;
    } catch (e) {
        tb.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-[11px] font-bold text-red-500">Gagal memuat laporan. Periksa koneksi internet.</td></tr>`;
    }
}

window.adminDeleteReport = async function (id) {
    if (!confirm("Yakin mau hapus laporan ini dari kotak masuk?")) return;
    try {
        await deleteDoc(doc(db, "laporan_bug", id));
        window.adminFetchReports();
    } catch (e) {
        if (window.showWarnModal) window.showWarnModal("Gagal", "Laporan gagal dihapus dari sistem.");
    }
}

// Eksekutor Balas Pesan Laporan CS ke Kotak Masuk Pengguna
window.adminSendCSReply = function () {
    const targetUser = window.currentCSUserTarget;
    const msg = document.getElementById('adminCSReplyInput').value.trim();

    if (!targetUser || !msg) {
        return window.showWarnModal ? window.showWarnModal("Peringatan", "Pesan balasan tidak boleh dibiarkan kosong.") : alert("Kosong!");
    }

    if (typeof window.sendUserNotification === 'function') {
        window.sendUserNotification(targetUser, "Pesan dari Administrator", msg, "admin");
        document.getElementById('adminCSReplyInput').value = "";
        window.closeModal('adminReportDetailModal');
        if (window.showSuccessModal) window.showSuccessModal("Terkirim", `Pesan balasan telah berhasil dikirimkan ke kotak masuk pengguna @${targetUser}.`);
    } else {
        alert("Fungsi notifikasi belum aktif.");
    }
}

// 9. Modul Smart Announcement
window.adminSaveAnnouncement = async function() {
    const title = document.getElementById('adminAnnTitle').value;
    const version = document.getElementById('adminAnnVersion').value;
    const content = document.getElementById('adminAnnContent').value;
    
    // Cari tombol berdasarkan atribut onclick biar bisa dilock pas loading
    const btn = document.querySelector('button[onclick="window.adminSaveAnnouncement()"]');

    if (!title || !version || !content) {
        return window.showWarnModal ? window.showWarnModal("Gagal Bro", "Semua kolom pengumuman wajib diisi!") : alert("Isi semua kolom!");
    }

    if (btn) { btn.textContent = "Menyimpan..."; btn.disabled = true; }

    try {
        // Import dinamis biar kebal error scope
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");

        // KUNCI FIX-NYA DI SINI: Pake setDoc + merge: true biar anti-mental
        await setDoc(doc(db, "app_config", "settings"), {
            announcement_title: title,
            announcement_version: version,
            announcement_content: content
        }, { merge: true });

        if (window.showSuccessModal) window.showSuccessModal("Mantap!", "Pengumuman Pop-up berhasil disimpan dan diterbitkan.");
    } catch (e) {
        console.error("Gagal save announcement", e);
        if (window.showWarnModal) window.showWarnModal("Error System", "Gagal nyimpen data ke Firebase.");
    } finally {
        if (btn) { btn.textContent = "Simpan & Terbitkan Pengumuman"; btn.disabled = false; }
    }

}

window.toggleAdminAnnouncement = async function() {
    try {
        const currentState = window.appConfigData && window.appConfigData.announcement_enabled !== undefined ? window.appConfigData.announcement_enabled : true;
        
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");

        // Pake setDoc + merge juga biar aman
        await setDoc(doc(db, "app_config", "settings"), {
            announcement_enabled: !currentState
        }, { merge: true });

        if(window.showSuccessModal) window.showSuccessModal("Tersimpan Bro", "Status saklar pengumuman pop-up berhasil diubah.");
    } catch (e) {
        console.error("Gagal toggle announcement", e);
        if(window.showWarnModal) window.showWarnModal("Error", "Gagal mengubah status pengumuman.");
    }
}

// ==========================================
// 10. MODUL BROADCAST MESSAGE & AUTOCOMPLETE
// ==========================================
window.broadcastSelectedUsers = [];

// Fungsi Render Tag UI
window.renderBroadcastTags = function () {
    const container = document.getElementById('broadcastTagContainer');
    const input = document.getElementById('broadcastUserInput');
    if (!container || !input) return;

    // Bersihin tag lama sebelum render ulang (tapi sisain inputnya)
    const existingTags = container.querySelectorAll('.b-tag');
    existingTags.forEach(t => t.remove());

    // Bikin badge buat tiap user yang kepilih
    window.broadcastSelectedUsers.forEach((usr, idx) => {
        const tag = document.createElement('div');
        tag.className = "b-tag flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-[10px] font-bold";
        tag.innerHTML = `<span>@${usr}</span><button onclick="window.adminRemoveBroadcastUser(${idx})" class="hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>`;
        container.insertBefore(tag, input);
    });
}

window.adminRemoveBroadcastUser = function (idx) {
    window.broadcastSelectedUsers.splice(idx, 1);
    window.renderBroadcastTags();
}

window.adminClearBroadcastUsers = function () {
    window.broadcastSelectedUsers = [];
    window.renderBroadcastTags();
}

window.adminAddAllUsersToBroadcast = function () {
    if (!window.adminUserCache) return;
    window.broadcastSelectedUsers = window.adminUserCache.map(u => u.rawUsername);
    window.renderBroadcastTags();
}

// Mesin Sugesti Autocomplete pas Admin Ngetik
const bInput = document.getElementById('broadcastUserInput');
const sBox = document.getElementById('broadcastSuggestBox');

if (bInput && sBox) {
    // Kalo admin klik di luar kotak, sembunyiin sugesti
    document.addEventListener('click', (e) => {
        if (e.target !== bInput && e.target !== sBox) {
            sBox.classList.add('hidden');
        }
    });

    bInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        sBox.innerHTML = '';

        if (!val || !window.adminUserCache) {
            sBox.classList.add('hidden');
            return;
        }

        // Cari user yang namanya cocok sama ketikan (dan belum dipake)
        const matches = window.adminUserCache.filter(u => {
            const uLow = u.rawUsername.toLowerCase();
            return uLow.includes(val) && !window.broadcastSelectedUsers.map(b => b.toLowerCase()).includes(uLow);
        });

        if (matches.length > 0) {
            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = "px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700/50";
                div.innerHTML = `@${m.rawUsername} <span class="text-[9px] text-slate-400 font-normal ml-1">(${m.email})</span>`;
                div.onmousedown = () => { // Pake mousedown biar klik kaga keduluan event 'blur' di input
                    window.broadcastSelectedUsers.push(m.rawUsername);
                    window.renderBroadcastTags();
                    bInput.value = '';
                    sBox.classList.add('hidden');
                };
                sBox.appendChild(div);
            });
            sBox.classList.remove('hidden');
        } else {
            sBox.innerHTML = `<div class="px-3 py-2 text-[10px] text-slate-400 italic">User tidak ditemukan</div>`;
            sBox.classList.remove('hidden');
        }
    });
}

// Eksekutor Kirim Pesan Massal
window.adminExecuteBroadcast = async function () {
    const msg = document.getElementById('broadcastMsgInput').value.trim();
    const btn = document.getElementById('btnExecuteBroadcast');

    if (window.broadcastSelectedUsers.length === 0) {
        return window.showWarnModal ? window.showWarnModal("Gagal", "Pilih minimal 1 user tujuan bro!") : alert("Pilih user!");
    }
    if (!msg) {
        return window.showWarnModal ? window.showWarnModal("Gagal", "Isi pesannya kaga boleh kosong!") : alert("Isi pesan!");
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Sedang Mengirim...`;

    try {
        // Karena fungsi sendUserNotification udah kita bikin di ui.js, kita tinggal looping manggil fungsinya
        if (typeof window.sendUserNotification === 'function') {
            let successCount = 0;

            // Pake Promise.all biar kirimnya barengan dan lebih cepet
            const sendPromises = window.broadcastSelectedUsers.map(usr => {
                return window.sendUserNotification(usr, "Pengumuman Administrator", msg, "admin")
                    .then(() => { successCount++; })
                    .catch(err => console.error(`Gagal kirim ke ${usr}`, err));
            });

            await Promise.all(sendPromises);

            document.getElementById('broadcastMsgInput').value = '';
            window.adminClearBroadcastUsers();
            if (window.showSuccessModal) window.showSuccessModal("Broadcast Selesai", `Pesan berhasil dikirim ke ${successCount} pengguna.`);
        } else {
            alert("Sistem notifikasi UI belum aktif.");
        }
    } catch (error) {
        console.error(error);
        if (window.showWarnModal) window.showWarnModal("Error Sistem", "Terjadi kesalahan saat mencoba mengirim broadcast.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane mr-1"></i> Kirim Pesan Sekarang`;
    }
}

// Toggle Status Maintenance
window.toggleAdminMaintenance = async function () {
    try {
        const currentState = window.appConfigData.is_maintenance || false;
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");

        await updateDoc(doc(db, "app_config", "settings"), { is_maintenance: !currentState });
        if(window.showSuccessModal) window.showSuccessModal("Tersimpan", "Status Maintenance berhasil diubah.");
    } catch (e) {
        console.error(e);
    }
}

// Simpan Pesan Maintenance & Tembak API Push Notif
window.saveMaintenanceMsg = async function () {
    const msg = document.getElementById('adminMaintenanceMsg').value.trim();
    if (!msg) return alert("Pesan tidak boleh kosong!");

    try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");
        
        await updateDoc(doc(db, "app_config", "settings"), { maintenance_msg: msg });
        
        // Tembak Vercel API buat ngirim Push Notif (Sesuaiin URL sama Vercel lu ntar)
        fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "⚠️ FinoCatat Sedang Maintenance",
                body: msg,
                secretPin: "SYARIEF_GANTENG_123" // Ganti sesuai password rahasia lu ntar
            })
        }).catch(err => console.log("API notif belom jalan: ", err));

        if(window.showSuccessModal) window.showSuccessModal("Berhasil", "Pesan tersimpan & Push Notifikasi sedang dikirim ke semua user!");
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// MODUL PUSH NOTIFICATION CENTER
// ==========================================

// 1. Simpan Template Notif Otomatis ke Firestore
window.saveAutoNotifConfig = async function() {
    const title = document.getElementById('adminAutoNotifTitle').value.trim();
    const content = document.getElementById('adminAutoNotifContent').value.trim();

    if (!title || !content) return alert("Judul dan isi notif otomatis kaga boleh kosong bro!");

    try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");
        
        await updateDoc(doc(db, "app_config", "settings"), { 
            auto_notif_title: title,
            auto_notif_content: content
        });
        
        if(window.showSuccessModal) window.showSuccessModal("Tersimpan", "Template notifikasi harian udah disimpen ke database. Ntar Vercel Cron bakal narik data ini tiap jam 8 malem.");
    } catch (e) {
        console.error(e);
        alert("Gagal nyimpen data.");
    }
}

// 2. Blast Push Notif Manual Sekarang Juga
window.sendManualPushNotif = async function() {
    const title = document.getElementById('adminManualNotifTitle').value.trim();
    const body = document.getElementById('adminManualNotifContent').value.trim();
    const btn = document.getElementById('btnSendManualPush');

    if (!title || !body) return alert("Isi dulu judul sama pesannya anjir!");
    if (!confirm("Woi lu yakin mau nge-blast notif ini ke SEMUA USER sekarang juga?")) return;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Ngirim...`;

    try {
        const res = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'manual',
                title: title,
                body: body,
                secretPin: "SYARIEF_GANTENG_123"
            })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('adminManualNotifTitle').value = "";
            document.getElementById('adminManualNotifContent').value = "";
            if(window.showSuccessModal) window.showSuccessModal("Blast Sukses!", `Push Notif udah berhasil ditembak ke ${data.sentCount} device user.`);
        } else {
            alert("Error dari server: " + data.error);
        }
    } catch (e) {
        alert("Gagal konek ke API Vercel.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-bomb mr-1"></i> Blast ke Semua User`;
    }
}

// 3. Test Push Notif ke Target 1 User Doang
window.sendTestPushNotif = async function() {
    const targetUser = document.getElementById('adminTargetUsername').value.trim().toLowerCase();
    const title = document.getElementById('adminTargetNotifTitle').value.trim();
    const body = document.getElementById('adminTargetNotifContent').value.trim();
    const btn = document.getElementById('btnSendTestPush');

    if (!targetUser || !title || !body) return alert("Lengkapin dulu semua kolom test-nya!");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Mencari target...`;

    try {
        const res = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'test',
                targetUsername: targetUser,
                title: title,
                body: body,
                secretPin: "SYARIEF_GANTENG_123"
            })
        });
        const data = await res.json();
        
        if (data.success) {
            if(window.showSuccessModal) window.showSuccessModal("Test Masuk!", `Notif udah dikirim langsung ke HP si @${targetUser}.`);
        } else {
            if(window.showWarnModal) window.showWarnModal("Gagal", data.error || data.message);
        }
    } catch (e) {
        alert("Gagal konek ke API Vercel.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-vial-circle-check mr-1"></i> Test Kirim ke Target`;
    }
}