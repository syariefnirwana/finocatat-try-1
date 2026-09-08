// ==========================================
// UI.JS - PENGENDALI VISUAL & ANIMASI
// ==========================================

// 1. Sistem Universal Modal (Peringatan & Sukses)
window.showWarnModal = function(title, desc) { 
    document.getElementById('warnModalTitle').textContent = title; 
    document.getElementById('warnModalDesc').textContent = desc; 
    document.getElementById('universalWarnModal').classList.remove('hidden'); 
}
window.closeWarnModal = function() { 
    document.getElementById('universalWarnModal').classList.add('hidden'); 
}

window.showSuccessModal = function(title, desc, callback = null) { 
    document.getElementById('successModalTitle').textContent = title; 
    document.getElementById('successModalDesc').textContent = desc; 
    window.successCallback = callback; 
    document.getElementById('successActionModal').classList.remove('hidden'); 
}
window.closeSuccessModal = function() { 
    document.getElementById('successActionModal').classList.add('hidden'); 
    if (window.successCallback) { 
        window.successCallback(); 
        window.successCallback = null; 
    } 
}

window.closeModal = function(id) { 
    document.getElementById(id).classList.add('hidden'); 
}

// ==========================================
// SISTEM KOTAK MASUK (INBOX) NOTIFIKASI
// ==========================================
window.sendUserNotification = async function(targetUser, title, message, type = 'system') {
    if(!targetUser) return;
    try {
        const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");
        await addDoc(collection(db, "notifications"), {
            username: targetUser.toLowerCase(),
            title: title,
            message: message,
            type: type, // 'system' atau 'admin'
            date: new Date().toISOString(),
            isRead: false
        });
    } catch (e) { console.error("Gagal kirim notif", e); }
}

window.initNotificationListener = async function() {
    // Cegah fungsi jalan kalo data config Admin nunjukin fitur Inbox lagi dimatiin (disabled)
    if(window.appConfigData && window.appConfigData.inbox_enabled === false) return;

    // Pake silent return kalo Auth belom siap (INI YANG BIKIN KAGA MUNCUL NOTIF LOGIN PALSU)
    if(!window.cachedUsernameRaw) return;

    const { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const { db } = await import("./firebase-config.js");

    window.markNotifAsRead = async function(notifId) {
        // Langsung BUNUH datanya dari Firestore pas user ngeklik pesan!
        try { await deleteDoc(doc(db, "notifications", notifId)); } catch(e){ console.error("Gagal hapus notif", e); }
    }

    const q = query(collection(db, "notifications"), where("username", "==", window.cachedUsernameRaw.toLowerCase()));
    onSnapshot(q, (snap) => {
        let unreadCount = 0;
        let notifs = [];
        snap.forEach(d => {
            const data = d.data();
            if(!data.isRead) unreadCount++;
            notifs.push({ id: d.id, ...data });
        });

        notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
        window.localNotifs = notifs;

        const badge = document.getElementById('notifBadge');
        if(badge) {
            if(unreadCount > 0) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }
        window.renderInbox();
    });
}

window.renderInbox = function() {
    const container = document.getElementById('inboxContainer');
    if(!container) return;
    if(!window.localNotifs || window.localNotifs.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8"><i class="fa-solid fa-envelope-open text-3xl mb-2 block opacity-50"></i>Belum ada pesan masuk untuk saat ini.</p>`;
        return;
    }

    let html = '';
    window.localNotifs.forEach(n => {
        const isUnread = !n.isRead;
        const icon = n.type === 'admin' ? '<i class="fa-solid fa-headset"></i>' : '<i class="fa-solid fa-robot"></i>';
        const bgIcon = n.type === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500';
        const dateStr = new Date(n.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'});

        html += `
        <div onclick="window.markNotifAsRead('${n.id}')" class="flex gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${isUnread ? 'bg-white dark:bg-slate-800/80 border-blue-200 dark:border-blue-500/30' : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/40 opacity-70'}">
            <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${bgIcon}">${icon}</div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="text-xs font-bold text-slate-800 dark:text-white truncate pr-2 ${isUnread ? '' : 'font-semibold'}">${n.title}</h4>
                    <span class="text-[9px] text-slate-400 whitespace-nowrap">${dateStr}</span>
                </div>
                <p class="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">${n.message}</p>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

window.openInboxModal = function() {
    document.getElementById('inboxModal').classList.remove('hidden');
}

window.openChangelogModal = function() {
    document.getElementById('changelogModal').classList.remove('hidden');
}

// 2. Sistem Navigasi Tab
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden')); 
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    // Reset warna text navigasi desktop
    document.querySelectorAll('.nav-item').forEach(el => {
        el.className = el.id === 'navAdminDesktop' 
            ? "hidden nav-item items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 w-full text-left transition-all mt-4 border border-purple-500/20" 
            : "nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 w-full text-left transition-all";
    });

    // Reset warna text navigasi mobile
    document.querySelectorAll('.mobile-nav-item').forEach(el => {
        el.className = el.id === 'navAdminMobile' 
            ? "hidden mobile-nav-item flex-col items-center gap-0.5 text-purple-500 py-1 px-1" 
            : "mobile-nav-item flex flex-col items-center gap-0.5 text-slate-400 py-1 px-1";
    });
    
    // Beri warna aktif pada tab yang dipilih
    const activeDesktop = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if(activeDesktop) { 
        if(tabId === 'admin') activeDesktop.className = "nav-item items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-purple-100 bg-purple-600 w-full text-left transition-all mt-4 border border-purple-500/20"; 
        else activeDesktop.className = "nav-item active flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-accent bg-accent/10 dark:bg-accent/20 w-full text-left transition-all"; 
    }
    
    const activeMobile = document.querySelector(`.mobile-nav-item[data-tab="${tabId}"]`);
    if(activeMobile) { 
        if(tabId === 'admin') activeMobile.className = "mobile-nav-item flex flex-col items-center gap-0.5 text-purple-600 py-1 px-1"; 
        else activeMobile.className = "mobile-nav-item active flex flex-col items-center gap-0.5 text-accent py-1 px-1"; 
    }
    
    // Kalo user itu admin, paksa tombol admin tetep muncul
    if(window.isAdmin) { 
        document.getElementById('navAdminDesktop').classList.remove('hidden'); 
        document.getElementById('navAdminMobile').classList.remove('hidden'); 
        document.getElementById('navAdminMobile').classList.add('flex'); 
    }
    
    localStorage.setItem('activeTab', tabId);
}

// 3. Sistem Panggil Aksi Menu Transaksi
window.openAction = function(menuName) {
    if (menuName === 'Tambahkan Pemasukan') document.getElementById('pemasukanModal').classList.remove('hidden');
    else if (menuName === 'Catat Pengeluaran') { document.getElementById('pengeluaranModal').classList.remove('hidden'); if(window.resetExpenseFormRows) window.resetExpenseFormRows(); }
    else if (menuName === 'Transfer Saldo') document.getElementById('transferModal').classList.remove('hidden'); 
    else if (menuName === 'Edit Pemasukan') { document.getElementById('txListModal').classList.remove('hidden'); if(window.renderTransactionList) window.renderTransactionList('pemasukan', 'Ubah'); }
    else if (menuName === 'Edit Pengeluaran') { document.getElementById('txListModal').classList.remove('hidden'); if(window.renderTransactionList) window.renderTransactionList('pengeluaran', 'Ubah'); }
    else if (menuName === 'Hapus Pemasukan') { document.getElementById('txListModal').classList.remove('hidden'); if(window.renderTransactionList) window.renderTransactionList('pemasukan', 'Hapus'); }
    else if (menuName === 'Hapus Pengeluaran') { document.getElementById('txListModal').classList.remove('hidden'); if(window.renderTransactionList) window.renderTransactionList('pengeluaran', 'Hapus'); }
}

// 4. Sistem Tema & Kustomisasi Warna
window.toggleDarkMode = function() { 
    const html = document.documentElement; 
    if (html.classList.contains('dark')) { html.classList.remove('dark'); localStorage.setItem('theme', 'light'); } 
    else { html.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
}

window.setAccentPreset = function(p, h) { 
    document.documentElement.style.setProperty('--accent-color', p); 
    document.documentElement.style.setProperty('--accent-hover-color', h); 
    document.getElementById('customColorPicker').value = p; 
    localStorage.setItem('user_accent', p); 
    localStorage.setItem('user_accent_hover', h); 
}

window.renderCustomColorSlots = function() { 
    const colors = JSON.parse(localStorage.getItem('saved_custom_colors') || '[]'); 
    const container = document.getElementById('customColorSlots'); 
    if (colors.length === 0) { 
        container.innerHTML = `<span class="text-[10px] text-slate-400 italic">Belum ada history</span>`; 
    } else { 
        let html = ''; 
        colors.forEach(c => { html += `<button onclick="window.setAccentPreset('${c}', '${c}cc')" class="w-8 h-8 rounded-xl border-2 border-white shadow-sm transition-transform hover:scale-110" style="background-color: ${c}"></button>`; }); 
        container.innerHTML = html; 
    } 
}

window.handleColorPickerInput = function(v) { 
    window.setAccentPreset(v, v + "cc"); 
    let colors = JSON.parse(localStorage.getItem('saved_custom_colors') || '[]'); 
    if (!colors.includes(v)) { 
        colors.unshift(v); 
        if (colors.length > 3) colors.pop(); 
        localStorage.setItem('saved_custom_colors', JSON.stringify(colors)); 
        window.renderCustomColorSlots(); 
    } 
}

// 5. Toggles UI Lainnya (Step, Profile, Overdraft, Logout)
window.nextIncStep = function() { if (document.getElementById('incNominal').value) { document.getElementById('incStep1').classList.add('hidden'); document.getElementById('incStep2').classList.remove('hidden'); } }
window.prevIncStep = function() { document.getElementById('incStep2').classList.add('hidden'); document.getElementById('incStep1').classList.remove('hidden'); }
window.closeOverdraft = function(proceed) { document.getElementById('overdraftModal').classList.add('hidden'); if(proceed && window.submitExpense) window.submitExpense(null, true); }
window.openCustomLogout = function() { document.getElementById('customLogoutModal').classList.remove('hidden'); }
window.closeCustomLogout = function() { document.getElementById('customLogoutModal').classList.add('hidden'); }

window.toggleProfileEdit = function() { 
    const cont = document.getElementById('profileEditFormContainer'); 
    const icon = document.getElementById('profileEditIcon'); 
    if(cont.classList.contains('hidden')) { cont.classList.remove('hidden'); icon.classList.add('rotate-180'); } 
    else { cont.classList.add('hidden'); icon.classList.remove('rotate-180'); } 
}

// 6. Danger Zone Modal
window.openDangerModal = function(mode) { 
    const modal = document.getElementById('dangerZoneModal'); 
    const title = document.getElementById('dangerModalTitle'); 
    const btn = document.getElementById('dangerConfirmActionBtn'); 
    const vBox = document.getElementById('deleteAccVerificationBox'); 
    const vInput = document.getElementById('dangerUserVerifyInput'); 
    
    vInput.value = ""; 
    btn.className = "flex-1 py-2.5 rounded-xl text-white text-xs font-semibold bg-red-600"; 
    btn.disabled = false; 
    vBox.classList.add('hidden'); 
    
    if (mode === 'resetData') { 
        title.textContent = "Hapus Total Data"; 
        btn.onclick = () => { if(window.executeDangerAction) window.executeDangerAction('resetData'); }; 
    } else if (mode === 'deleteAccount') { 
        title.textContent = "Hapus Akun Selamanya"; 
        vBox.classList.remove('hidden'); 
        btn.disabled = true; 
        btn.className = "flex-1 py-2.5 rounded-xl text-white text-xs font-semibold bg-slate-300"; 
        vInput.oninput = (e) => { 
            if (e.target.value === window.cachedUsernameRaw) { 
                btn.disabled = false; 
                btn.className = "flex-1 py-2.5 rounded-xl text-white text-xs font-semibold bg-red-600 shadow"; 
            } else { 
                btn.disabled = true; 
                btn.className = "flex-1 py-2.5 rounded-xl text-white text-xs font-semibold bg-slate-300"; 
            } 
        }; 
        btn.onclick = () => { if(window.executeDangerAction) window.executeDangerAction('deleteAccount'); }; 
    } 
    modal.classList.remove('hidden'); 
}

// 7. Carousel Banners Logic
let autoSlideInterval; 
let isDragging = false; 
let startX = 0; 
let dragOffset = 0;

window.setSlide = function(index) { 
    window.currentSlide = index; 
    const carouselTrack = document.getElementById('carouselTrack'); 
    if (carouselTrack) { 
        carouselTrack.style.transition = "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)"; 
        carouselTrack.style.transform = `translateX(-${window.currentSlide * 100}%)`; 
    } 
    document.querySelectorAll('.carousel-dot').forEach((dot, idx) => {
        dot.className = idx === window.currentSlide ? "carousel-dot w-2 h-2 rounded-full bg-accent transition-all" : "carousel-dot w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 transition-all";
    });
}

window.startAutoSlideLoop = function() { 
    clearInterval(autoSlideInterval); 
    autoSlideInterval = setInterval(() => { window.setSlide((window.currentSlide + 1) % window.totalSlides); }, 6000); 
}

// ==========================================
// SISTEM MANAJEMEN DOMPET (E-WALLET & BANK)
// ==========================================
window.defaultDompet = [
    "Tunai (Cash)", "BCA", "Mandiri", "BNI", "BRI", "BSI", "CIMB Niaga", "Bank Jatim", 
    "GoPay", "OVO", "DANA", "ShopeePay", "LinkAja", "SeaBank", "Bank Jago", "Blu by BCA", "Allo Bank", "PayPal"
];
window.customDompet = [];

window.refreshDompetUI = function() {
    const allDompet = [...window.defaultDompet, ...window.customDompet];
    const selects = document.querySelectorAll('.dompet-select-sync');
    
    // Update Dropdown di Form
    let optionsHtml = '';
    allDompet.forEach(d => { optionsHtml += `<option value="${d}">${d}</option>`; });
    selects.forEach(select => { 
        const currentVal = select.value;
        select.innerHTML = optionsHtml; 
        if(allDompet.includes(currentVal)) select.value = currentVal;
    });

    // Update List Kustom di Settings (Nambahin Tombol Edit)
    const customListEl = document.getElementById('customDompetList');
    if(customListEl) {
        customListEl.innerHTML = window.customDompet.map((d, i) => 
            `<div class="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-semibold">
                <span class="text-slate-700 dark:text-slate-300">${d}</span>
                <button type="button" onclick="window.editCustomDompet(${i})" class="text-blue-500 hover:text-blue-700 ml-1" title="Edit Dompet"><i class="fa-solid fa-pen"></i></button>
                <button type="button" onclick="window.removeCustomDompet(${i})" class="text-red-500 hover:text-red-700" title="Hapus Dompet"><i class="fa-solid fa-xmark"></i></button>
            </div>`
        ).join('');
    }

    // Kalkulasi Saldo Per Dompet di Dashboard
    if (window.localTransactionsCache) {
        let balances = {};
        allDompet.forEach(d => balances[d] = 0);
        
        window.localTransactionsCache.forEach(tx => {
            const txDompet = tx.dompet || "Tunai (Cash)";
            if (balances[txDompet] !== undefined) {
                if (tx.type === 'pemasukan') balances[txDompet] += tx.nominal;
                else balances[txDompet] -= tx.nominal;
            }
        });

        const sliderEl = document.getElementById('dompetSliderContainer');
        if(sliderEl) {
            let sliderHtml = '';
            Object.keys(balances).forEach(key => {
                if(balances[key] !== 0 || key === "Tunai (Cash)") {
                    const isMin = balances[key] < 0;
                    sliderHtml += `
                    <div class="backdrop-blur-md bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 rounded-2xl min-w-[140px] p-3 shadow-sm flex-shrink-0 flex flex-col justify-between">
                        <span class="text-[10px] font-bold text-slate-500 truncate"><i class="fa-solid fa-wallet mr-1"></i> ${key}</span>
                        <span class="text-sm font-bold ${isMin ? 'text-red-500' : 'text-slate-800 dark:text-white'} mt-1 truncate">${isMin ? '-' : ''}Rp ${Math.abs(balances[key]).toLocaleString('id-ID')}</span>
                    </div>`;
                }
            });
            sliderEl.innerHTML = sliderHtml;
        }
    }
}

window.addCustomDompet = function() {
    const input = document.getElementById('newDompetInput');
    const val = input.value.trim();
    if(!val) return;
    if(window.defaultDompet.includes(val) || window.customDompet.includes(val)) {
        return window.showWarnModal ? window.showWarnModal("Gagal", "Nama dompet ini udah ada bro!") : alert("Udah ada!");
    }
    window.customDompet.push(val);
    input.value = '';
    window.saveCustomDompetToDB();
    window.refreshDompetUI();
}

// FITUR BARU: Edit Dompet & Auto Update Transaksi
window.editCustomDompet = async function(index) {
    const oldName = window.customDompet[index];
    const newName = prompt(`Ubah nama dompet "${oldName}" menjadi:`, oldName);
    
    if (!newName || newName.trim() === "" || newName === oldName) return;
    const val = newName.trim();
    
    if (window.defaultDompet.includes(val) || window.customDompet.includes(val)) {
        return window.showWarnModal ? window.showWarnModal("Gagal", "Nama dompet ini udah dipake!") : alert("Udah ada!");
    }
    
    window.customDompet[index] = val;
    await window.saveCustomDompetToDB();
    
    // Update semua riwayat transaksi yang tadinya pake dompet lama
    if(window.localTransactionsCache) {
        const txToUpdate = window.localTransactionsCache.filter(t => t.dompet === oldName);
        txToUpdate.forEach(async (tx) => {
            try { await updateDoc(doc(db, "transaksi", tx.id), { dompet: val }); } 
            catch (e) { console.error("Gagal update dompet di transaksi", e); }
        });
    }
    window.refreshDompetUI();
}

// FITUR BARU: Hapus Dompet & Kembalikan ke Tunai
window.pendingDeleteDompetIndex = null;
window.removeCustomDompet = function(index) {
    window.pendingDeleteDompetIndex = index;
    const oldName = window.customDompet[index];
    document.getElementById('deleteDompetConfirmText').innerHTML = `Yakin mau hapus dompet <b>"${oldName}"</b>?<br><br>Semua riwayat transaksi di dompet ini bakal otomatis dipindah ke "Tunai (Cash)".`;
    document.getElementById('deleteDompetConfirmModal').classList.remove('hidden');
}

window.executeRemoveCustomDompet = async function() {
    if (window.pendingDeleteDompetIndex === null) return;
    const index = window.pendingDeleteDompetIndex;
    const oldName = window.customDompet[index];
    
    window.customDompet.splice(index, 1);
    await window.saveCustomDompetToDB();
    
    if(window.localTransactionsCache) {
        const txToUpdate = window.localTransactionsCache.filter(t => t.dompet === oldName);
        txToUpdate.forEach(async (tx) => {
            try { await updateDoc(doc(db, "transaksi", tx.id), { dompet: "Tunai (Cash)" }); } 
            catch (e) { console.error("Gagal pindah dompet", e); }
        });
    }
    window.refreshDompetUI();
    window.closeModal('deleteDompetConfirmModal');
    window.pendingDeleteDompetIndex = null;
}

import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.saveCustomDompetToDB = async function() {
    if(!window.cachedUsernameRaw) return;
    try { await updateDoc(doc(db, "usernames", window.cachedUsernameRaw.toLowerCase()), { custom_dompet: window.customDompet }); } 
    catch(e) { console.error("Gagal simpan dompet", e); }
}

window.loadCustomDompetFromDB = async function() {
    if(!window.cachedUsernameRaw) return;
    try {
        const snap = await getDoc(doc(db, "usernames", window.cachedUsernameRaw.toLowerCase()));
        if(snap.exists() && snap.data().custom_dompet) {
            window.customDompet = snap.data().custom_dompet;
            window.refreshDompetUI();
        }
    } catch(e) { console.error("Gagal muat dompet", e); }
}

// ==========================================
// FITUR FOTO PROFIL & CROPPER
// ==========================================
window.uploadProfilePic = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    // Limit awal 5MB, ntar pas di crop bakal kekompres jadi KB doang
    if(file.size > 1024 * 1024 * 5) {
        if(window.showWarnModal) window.showWarnModal("Kegedean Bro", "Ukuran foto asli maksimal 5MB yak!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imgElement = document.getElementById('cropImagePreview');
        imgElement.src = e.target.result;
        document.getElementById('cropModal').classList.remove('hidden');

        // Hancurin cropper lama kalo ada, terus bikin engine baru
        if(window.cropperInstance) window.cropperInstance.destroy();
        window.cropperInstance = new Cropper(imgElement, {
            aspectRatio: 1, // Kunci rasio kotak 1:1 buat profil
            viewMode: 1,
            autoCropArea: 1,
            background: false
        });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input biar bisa upload foto yg sama 2x
}

// Eksekutor simpan hasil crop
window.executeCrop = async function() {
    if(!window.cropperInstance) return;

    // Ambil hasil crop dengan resolusi pas 300x300
    const canvas = window.cropperInstance.getCroppedCanvas({
        width: 300,
        height: 300
    });

    // MAGIC KOMPRESI: Ubah jadi JPG kualitas 70% biar database kaga ngamuk
    const base64Str = canvas.toDataURL('image/jpeg', 0.7);

    // Update UI langsung
    document.getElementById('profPicContainer').style.backgroundImage = `url(${base64Str})`;
    document.getElementById('profPicIcon').classList.add('hidden');

    // Save ke Firebase
    try {
        if(window.cachedUsernameRaw) {
            await updateDoc(doc(db, "usernames", window.cachedUsernameRaw.toLowerCase()), { photoURL: base64Str });
            window.sendUserNotification(window.cachedUsernameRaw, "Pembaruan Profil", "Foto profil Anda telah berhasil diperbarui di dalam sistem.", "system");
        }
    } catch (err) { 
        console.error("Gagal save foto", err); 
        if(window.showWarnModal) window.showWarnModal("Kesalahan Sistem", "Gagal mengunggah gambar ke database.");
    }

    // Bersihin layar
    window.closeModal('cropModal');
    window.cropperInstance.destroy();
    window.cropperInstance = null;
}

// Mesin Pemanggil Detail CS
window.openCSDetail = function(username, kategori, tanggal, elementPesanId) {
    // Pesannya kita akalin ditarik dari DOM id tersembunyi biar tanda kutip (') di dalem teks kaga bikin error JS
    const pesanAman = document.getElementById(elementPesanId).textContent;
    document.getElementById('csDetUser').textContent = username;
    window.currentCSUserTarget = username; // Simpan memori target user buat tombol balas
    document.getElementById('adminCSReplyInput').value = ""; // Bersihin kotak input
    document.getElementById('csDetCat').textContent = kategori;
    document.getElementById('csDetDate').textContent = new Date(tanggal).toLocaleString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'});
    document.getElementById('csDetMsg').textContent = pesanAman;
    document.getElementById('adminReportDetailModal').classList.remove('hidden');
}

// ==========================================
// 8. AUTO-INITIALIZATION VISUAL (RUN ON LOAD)
// ==========================================
const initUI = () => {
    // Jalankan memori tab dan warna kustom saat refresh
    const savedTabFromStorage = localStorage.getItem('activeTab') || 'dashboard';
    window.switchTab(savedTabFromStorage);
    
    const saMem = localStorage.getItem('user_accent'); 
    const sahMem = localStorage.getItem('user_accent_hover'); 
    if(saMem && sahMem) window.setAccentPreset(saMem, sahMem); 
    window.renderCustomColorSlots();
    
    // Setup listener geser untuk Carousel Banner
    const carouselContainerEl = document.getElementById('carouselContainer');
    if (carouselContainerEl) {
        carouselContainerEl.addEventListener('pointerdown', (e) => { 
            isDragging = true; 
            startX = e.clientX; 
            document.getElementById('carouselTrack').style.transition = "none"; 
            clearInterval(autoSlideInterval); 
            carouselContainerEl.setPointerCapture(e.pointerId); 
        });
        carouselContainerEl.addEventListener('pointermove', (e) => { 
            if (!isDragging) return; 
            dragOffset = e.clientX - startX; 
            document.getElementById('carouselTrack').style.transform = `translateX(${(-window.currentSlide * carouselContainerEl.offsetWidth) + dragOffset}px)`; 
        });
        carouselContainerEl.addEventListener('pointerup', (e) => { 
            if (!isDragging) return; 
            isDragging = false; 
            carouselContainerEl.releasePointerCapture(e.pointerId); 
            const threshold = carouselContainerEl.offsetWidth * 0.15; 
            if (dragOffset < -threshold) window.currentSlide = (window.currentSlide + 1) % window.totalSlides; 
            else if (dragOffset > threshold) window.currentSlide = (window.currentSlide - 1 + window.totalSlides) % window.totalSlides; 
            window.setSlide(window.currentSlide); 
            window.startAutoSlideLoop(); 
        });
        window.startAutoSlideLoop();
    }
};
window.openReportModal = function() { 
    document.getElementById('reportMessage').value = ''; 
    document.getElementById('reportModal').classList.remove('hidden'); 
}
window.closeReportModal = function() { 
    document.getElementById('reportModal').classList.add('hidden'); 
}

// ==========================================
// FITUR SCANNER STRUK AI (KAMERA & REAL-TIME)
// ==========================================
window.scannerStream = null;
window.aiScanInterval = null;
window.isTakingPicture = false;

window.openScannerModal = async function() {
    document.getElementById('scannerModal').classList.remove('hidden');
    await window.startScannerCamera();
}

window.closeScannerModal = function() {
    document.getElementById('scannerModal').classList.add('hidden');
    window.stopScannerCamera();
    window.isTakingPicture = false;
    
    // Reset UI ke awal pas ditutup
    window.setScannerUIReady(false);
    const btn = document.getElementById('captureBtn');
    btn.disabled = false;
    btn.innerHTML = `<div class="w-12 h-12 rounded-full bg-white transition-all group-hover:scale-95 group-active:scale-75"></div>`;
}

window.startScannerCamera = async function() {
    const video = document.getElementById('scannerVideo');
    window.isTakingPicture = false;
    try {
        window.scannerStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        video.srcObject = window.scannerStream;
        video.play();

        // Loop deteksi teks real-time (tiap 2.5 detik biar HP kaga meledak)
        window.aiScanInterval = setInterval(async () => {
            if(!window.scannerStream || window.isTakingPicture) return;
            
            // Pake canvas kecil resolusi rendah biar enteng buat cek real-time
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400 * (video.videoHeight / video.videoWidth);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = canvas.toDataURL('image/jpeg', 0.4);

            try {
                const result = await Tesseract.recognize(imgData, 'ind');
                const text = result.data.text.trim();
                
                // Kalo nemu lumayan banyak karakter & ada angkanya, asumsikan teks kebaca
                if(text.length > 15 && /\d/.test(text)) {
                    window.setScannerUIReady(true);
                } else {
                    window.setScannerUIReady(false);
                }
            } catch(e){}
        }, 2500); 

    } catch (err) {
        console.error("Kamera error:", err);
        if(window.showWarnModal) window.showWarnModal("Akses Ditolak", "Lu harus ngasih izin akses kamera browser.");
        window.closeScannerModal();
    }
}

window.stopScannerCamera = function() {
    if(window.scannerStream) {
        window.scannerStream.getTracks().forEach(track => track.stop());
        window.scannerStream = null;
    }
    if(window.aiScanInterval) clearInterval(window.aiScanInterval);
}

// Fungsi ngubah kotak merah/hijau
window.setScannerUIReady = function(isReady) {
    if(window.isTakingPicture) return; // Jangan ubah UI kalo lagi asik motret
    const box = document.getElementById('scannerBox');
    const line = document.getElementById('scannerLine');
    const txt = document.getElementById('scannerStatusText');
    
    if(isReady) {
        box.classList.replace('border-red-500', 'border-emerald-500');
        line.classList.replace('bg-red-500', 'bg-emerald-500');
        line.classList.replace('shadow-[0_0_12px_2px_rgba(239,68,68,0.8)]', 'shadow-[0_0_12px_2px_rgba(16,185,129,0.8)]');
        txt.classList.replace('text-red-400', 'text-emerald-400');
        txt.innerHTML = `<i class="fa-solid fa-check-circle"></i> Teks terdeteksi! Tahan posisi & jepret.`;
    } else {
        box.classList.replace('border-emerald-500', 'border-red-500');
        line.classList.replace('bg-emerald-500', 'bg-red-500');
        line.classList.replace('shadow-[0_0_12px_2px_rgba(16,185,129,0.8)]', 'shadow-[0_0_12px_2px_rgba(239,68,68,0.8)]');
        txt.classList.replace('text-emerald-400', 'text-red-400');
        txt.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fokuskan kamera ke teks struk...`;
    }
}

// Eksekutor Tangkap Gambar & Freeze Kamera
window.processReceiptScan = async function() {
    const video = document.getElementById('scannerVideo');
    const btn = document.getElementById('captureBtn');
    const txt = document.getElementById('scannerStatusText');

    if(!video || !window.scannerStream) return;

    // MATIIN DETEKSI REAL-TIME & FREEZE KAMERA (Biar user kaga capek nahan HP)
    window.isTakingPicture = true;
    if(window.aiScanInterval) clearInterval(window.aiScanInterval);
    video.pause();

    // Tangkap resolusi HD asli buat dikirim ke AI
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-white text-2xl"></i>`;
    txt.classList.replace('text-red-400', 'text-emerald-400');
    txt.innerHTML = `<i class="fa-solid fa-microchip fa-spin"></i> Gambar ditangkap! AI lagi bedah struk...`;

    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    if(typeof window.analyzeReceiptWithAI === 'function') {
        await window.analyzeReceiptWithAI(imageData);
    } else {
        alert("File transaksi.js belum di-update bro!");
    }
}

// ==========================================
// FITUR TUTUP PENGUMUMAN POP-UP (ANNOUNCEMENT)
// ==========================================
window.closeAnnouncement = function() {
    // 1. Tutup modalnya (Sembunyiin dari layar)
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.classList.add('hidden');
    } else {
        // Fallback kalo lu pake ID modal yang beda
        if (typeof window.closeModal === 'function') window.closeModal('announcementModal');
    }

    // 2. Simpan versi ke Local Storage biar kaga spam muncul mulu pas di-refresh
    if (window.appConfigData && window.appConfigData.announcement_version) {
        localStorage.setItem('fino_seen_announcement', window.appConfigData.announcement_version);
    }
}

// Jalankan init setelah HTML selesai di-render
// document.addEventListener('DOMContentLoaded', initUI);
// Panggil langsung fungsi initUI-nya
initUI();