import { db } from "./firebase-config.js";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// TRANSAKSI.JS - CORE MESIN PENCATATAN & HISTORY
// ==========================================

// 1. Inisialisasi Listener Transaksi Real-time (Dipanggil dari auth.js)
window.initTransactionListener = function (uid) {
    const q = query(collection(db, "transaksi"), where("uid", "==", uid));
    onSnapshot(q, (snapshot) => {
        window.globalTotalSaldo = 0;
        let pem = 0;
        let peng = 0;
        window.localTransactionsCache = [];
        window.kategoriStats = {}; // Reset memori statistik kategori
        const curM = new Date().getMonth();
        const curY = new Date().getFullYear();

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const nom = parseFloat(d.nominal || 0);
            const date = new Date(d.tanggal || Date.now());
            window.localTransactionsCache.push({ id: docSnap.id, ...d });

            // Filter cerdas buat nge-bypass kalkulasi kalo transaksinya cuma pindah brankas
            const isMutasi = (d.kategori && (d.kategori.toLowerCase().includes('transfer') || d.kategori.toLowerCase().includes('mutasi'))) ||
                (d.catatan && (d.catatan.toLowerCase().includes('mutasi') || d.catatan.toLowerCase().includes('transfer')));

            if (d.type === 'pemasukan') {
                window.globalTotalSaldo += nom;
                // Cuma hitung ke Pemasukan Bulanan kalo BUKAN mutasi
                if (date.getMonth() === curM && date.getFullYear() === curY && !isMutasi) pem += nom;
            } else if (d.type === 'pengeluaran') {
                window.globalTotalSaldo -= nom;
                // Cuma hitung ke Pengeluaran Bulanan & Kategori Terboncos kalo BUKAN mutasi
                if (date.getMonth() === curM && date.getFullYear() === curY && !isMutasi) {
                    peng += nom;
                    let kat = d.kategori || "Lainnya";
                    if (!window.kategoriStats[kat]) window.kategoriStats[kat] = 0;
                    window.kategoriStats[kat] += nom;
                }
            }
        });

        // Logic pencari Kategori Terboncos
        let topKategori = "Belum Ada";
        let maxVal = 0;
        Object.keys(window.kategoriStats).forEach(k => {
            if (window.kategoriStats[k] > maxVal) { maxVal = window.kategoriStats[k]; topKategori = k; }
        });
        const topKatDOM = document.getElementById('displayKategoriTerboncos');
        if (topKatDOM) topKatDOM.textContent = maxVal > 0 ? topKategori.replace(/[^a-zA-Z &]/g, '') : "Aman Bosku"; // Bersihin emoji buat display


        // Update tampilan DOM angka di Dashboard
        document.getElementById('displaySaldo').textContent = "Rp " + window.globalTotalSaldo.toLocaleString('id-ID');
        document.getElementById('displayPemasukan').textContent = "+ Rp " + pem.toLocaleString('id-ID');
        document.getElementById('displayPengeluaran').textContent = "- Rp " + peng.toLocaleString('id-ID');

        // Update State Global
        window.cachedPem = pem;
        window.cachedPeng = peng;

        // Render tabel & banner jika fungsinya sudah tersedia
        if (typeof window.renderTxHistoryPagination === 'function') window.renderTxHistoryPagination();
        if (typeof window.updateDynamicEvaluationBanner === 'function') window.updateDynamicEvaluationBanner();

        // FIX: Panggil refresh UI dompet setiap kali data transaksi selesai dimuat
        if (typeof window.refreshDompetUI === 'function') window.refreshDompetUI();

        // Trigger Render Grafik Statistik
        if (typeof window.renderCharts === 'function') window.renderCharts();
    });
}

// 2. Logika Banner Evaluasi Bulanan (Ngecek Surplus/Defisit)
window.updateDynamicEvaluationBanner = function () {
    const pem = window.cachedPem;
    const peng = window.cachedPeng;
    const slide = document.getElementById('dynamicEvalSlide');
    const badge = document.getElementById('evalBadge');
    const text = document.getElementById('evalText');

    if (!slide) return;

    if (pem === 0 && peng === 0) {
        badge.textContent = "Evaluasi Bulanan";
        text.textContent = "Belum ada catatan aktivitas transaksi.";
        slide.className = "min-w-full h-full flex flex-col justify-center px-6 md:px-10 bg-gradient-to-r from-slate-500/10 to-transparent pointer-events-none select-none";
    } else if (pem >= peng) {
        badge.textContent = "Evaluasi: Sehat 🍏";
        badge.className = "text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider";
        text.textContent = `Surplus. Pemasukan Anda mengungguli pengeluaran dengan selisih Rp ${(pem - peng).toLocaleString('id-ID')}.`;
        slide.className = "min-w-full h-full flex flex-col justify-center px-6 md:px-10 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none select-none";
    } else {
        badge.textContent = "Evaluasi: Defisit 🚨";
        badge.className = "text-xs font-bold text-red-500 uppercase tracking-wider";
        text.textContent = `Defisit. Pengeluaran membengkak melampaui pemasukan sebesar Rp ${(peng - pem).toLocaleString('id-ID')}.`;
        slide.className = "min-w-full h-full flex flex-col justify-center px-6 md:px-10 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none select-none";
    }
}

// 3. Tambah Pemasukan
window.submitIncome = async function (e) {
    const rawTgl = document.getElementById('incTanggal').value;
    const finalTgl = rawTgl ? new Date(rawTgl).toISOString() : new Date().toISOString();
    e.preventDefault();
    if (!window.currentUserUid) return;

    const nom = parseFloat(document.getElementById('incNominal').value);
    const cat = document.getElementById('incCatatan').value.trim();
    const btn = document.getElementById('incSubmitBtn');
    const dompet = document.getElementById('incDompet').value || "Tunai (Cash)";

    btn.textContent = "Menyimpan...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "transaksi"), {
            uid: window.currentUserUid,
            type: "pemasukan",
            dompet: dompet,
            nominal: nom,
            catatan: cat || "Pemasukan",
            // tanggal: new Date().toISOString() 
            tanggal: finalTgl
        });
        window.closeModal('pemasukanModal');
        document.getElementById('pemasukanForm').reset();
        document.getElementById('incTanggal').value = '';
        if (window.prevIncStep) window.prevIncStep();
    } catch (e) {
        if (window.showWarnModal) window.showWarnModal("Terjadi Kesalahan", "Pencatatan gagal dilakukan.");
    } finally {
        btn.textContent = "Konfirmasi";
        btn.disabled = false;
    }
}

// 4. Tambah Pengeluaran (Multi-Row / Barang)
window.addExpenseRow = function () {
    const container = document.getElementById('expenseRowsContainer');
    const rowId = 'row-' + Date.now();
    const rowDiv = document.createElement('div');
    rowDiv.id = rowId;
    
    // Class sakti shrink-0 biar kaga bantet
    rowDiv.className = "expense-row bg-white/40 dark:bg-slate-800/20 border p-4 rounded-2xl flex flex-col gap-3 relative shrink-0";
    
    // Cek config apakah voice diaktifin di admin
    const isVoiceEnabled = window.appConfigData && window.appConfigData.voice_enabled;

    rowDiv.innerHTML = `
        <div class="absolute top-3 right-3 flex gap-2">
            ${isVoiceEnabled ? `<button type="button" onclick="window.startVoiceInput('${rowId}')" class="voice-btn w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors shadow-sm"><i class="fa-solid fa-microphone text-[10px]"></i></button>` : ''}
            <button type="button" onclick="window.removeExpenseRow('${rowId}')" class="w-6 h-6 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
        </div>
        <div class="grid grid-cols-1 gap-1 pr-16">
            <label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">NAMA BARANG</label>
            <input type="text" required class="exp-item-name px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white focus:outline-none" placeholder="Cth: Nasi Goreng">
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">HARGA (RP)</label>
                <input type="number" required min="1" oninput="window.calculateTemporaryTotal()" class="exp-item-harga px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white focus:outline-none" placeholder="0">
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">JUMLAH</label>
                <input type="number" required min="1" value="1" oninput="window.calculateTemporaryTotal()" class="exp-item-jumlah px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white focus:outline-none" placeholder="1">
            </div>
        </div>`;
    container.appendChild(rowDiv);
    window.calculateTemporaryTotal();
}

window.removeExpenseRow = function (id) {
    const row = document.getElementById(id);
    if (row) { row.remove(); window.calculateTemporaryTotal(); }
}

// Modul Reset Form Pengeluaran
window.resetExpenseFormRows = function () {
    const container = document.getElementById('expenseRowsContainer');
    if (!container) return;

    container.innerHTML = "";
    if (typeof window.addExpenseRow === 'function') window.addExpenseRow();

    const totalDisplay = document.getElementById('expTotalSementara');
    if (totalDisplay) totalDisplay.textContent = "Rp 0";
    
    const expCatatan = document.getElementById('expCatatan');
    if (expCatatan) expCatatan.value = "";
    const expTanggal = document.getElementById('expTanggal');
    if (expTanggal) expTanggal.value = "";

    // FIX: Hapus memori foto yang batal diupload
    window.pendingExpenseReceipts = [];
    const previewContainer = document.getElementById('receiptPreviewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
    const uploadInput = document.getElementById('expReceiptUpload');
    if (uploadInput) uploadInput.value = '';
}

window.calculateTemporaryTotal = function () {
    let grandTotal = 0;
    document.querySelectorAll('.expense-row').forEach(row => {
        grandTotal += (parseFloat(row.querySelector('.exp-item-harga').value || 0) * parseFloat(row.querySelector('.exp-item-jumlah').value || 0));
    });
    document.getElementById('expTotalSementara').textContent = "Rp " + grandTotal.toLocaleString('id-ID');
}

window.submitExpense = async function (e, bypassOverdraft = false) {
    const rawTglExp = document.getElementById('expTanggal').value;
    const finalTglExp = rawTglExp ? new Date(rawTglExp).toISOString() : new Date().toISOString();
    if (e) e.preventDefault();
    if (!window.currentUserUid) return;

    const rows = document.querySelectorAll('.expense-row');
    const items = [];
    const dompet = document.getElementById('expDompet').value || "Tunai (Cash)";
    let total = 0;

    rows.forEach(row => {
        const nm = row.querySelector('.exp-item-name').value.trim();
        const h = parseFloat(row.querySelector('.exp-item-harga').value || 0);
        const j = parseFloat(row.querySelector('.exp-item-jumlah').value || 0);
        if (nm && h > 0 && j > 0) { total += (h * j); items.push({ nama: nm, harga: h, jumlah: j }); }
    });

    if (items.length === 0) {
        if (window.showWarnModal) window.showWarnModal("Daftar Kosong", "Minimal harus ada satu barang yang valid dicatat.");
        return;
    }

    let saldoDompetTerpilih = 0;
    if (window.localTransactionsCache) {
        window.localTransactionsCache.forEach(tx => {
            const txDompet = tx.dompet || "Tunai (Cash)";
            if (txDompet === dompet) {
                if (tx.type === 'pemasukan') saldoDompetTerpilih += tx.nominal;
                else saldoDompetTerpilih -= tx.nominal;
            }
        });
    }

    if (total > saldoDompetTerpilih && !bypassOverdraft) {
        document.getElementById('overdraftModal').classList.remove('hidden');
        return;
    }

    const cat = document.getElementById('expCatatan').value.trim();
    const kat = document.getElementById('expKategori').value || "Lainnya"; 
    const btn = document.getElementById('expSubmitBtn');
    
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengamankan Data...`;
    btn.disabled = true;

    try {
        // Langsung narik data string Base64 dari memori (tanpa upload ke storage)
        const lampiranData = window.pendingExpenseReceipts || [];

        // Simpen SEMUANYA langsung ke dalem Firestore
        await addDoc(collection(db, "transaksi"), {
            uid: window.currentUserUid,
            type: "pengeluaran",
            nominal: total,
            dompet: dompet,
            kategori: kat,
            catatan: cat || "Banyak Barang",
            items: items,
            lampiran: lampiranData, // Isinya murni string teks gambar
            tanggal: finalTglExp
        });
        
        document.getElementById('expTanggal').value = '';
        window.closeModal('pengeluaranModal');
        document.getElementById('pengeluaranForm').reset();
        if(window.resetExpenseFormRows) window.resetExpenseFormRows();
    } catch (e) {
        console.error(e);
        if (window.showWarnModal) window.showWarnModal("Terjadi Kesalahan", "Pencatatan gagal. Jika upload foto, pastikan ukuran tidak terlalu besar (Maks 1MB).");
    } finally {
        btn.textContent = "Konfirmasi";
        btn.disabled = false;
    }
}

// 5. Edit Transaksi (Pemasukan & Pengeluaran) TERMASUK DOMPET
window.openEditForm = function (id) {
    const targetTx = window.localTransactionsCache.find(t => t.id === id);
    if (!targetTx) return;

    document.getElementById('editTxId').value = id;
    document.getElementById('editTxType').value = targetTx.type;
    const container = document.getElementById('editTxDynamicContainer');
    container.innerHTML = "";

    // Tarik list dompet buat dimasukin ke dropdown edit
    const allDompet = [...(window.defaultDompet || []), ...(window.customDompet || [])];
    let dompetOptions = '';
    allDompet.forEach(d => {
        dompetOptions += `<option value="${d}" ${targetTx.dompet === d ? 'selected' : ''}>${d}</option>`;
    });
    const dompetHtml = `<div class="mb-1"><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Sumber Dana (Dompet)</label><select id="editTxDompet" class="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white outline-none">${dompetOptions}</select></div>`;
    const katOptions = ['Makanan & Minuman', 'Transportasi', 'Hiburan & Hobi', 'Belanja & Fashion', 'Tagihan & Utilitas', 'Kesehatan', 'Pendidikan', 'Lainnya'];
    let katSelect = `<div class="mb-1"><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori</label><select id="editExpKategori" class="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white outline-none">`;
    katOptions.forEach(k => { katSelect += `<option value="${k}" ${targetTx.kategori === k || (k === 'Lainnya' && !targetTx.kategori) ? 'selected' : ''}>${k}</option>`; });
    katSelect += `</select></div>`;

    if (targetTx.type === 'pemasukan') {
        container.innerHTML = `<div class="flex flex-col gap-4"><div><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Baru (Rp)</label><input type="number" id="editIncNominal" required min="1" value="${targetTx.nominal}" oninput="document.getElementById('editTxTotalDisplay').textContent = 'Rp ' + parseFloat(this.value || 0).toLocaleString('id-ID')" class="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>${dompetHtml}<div><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Catatan</label><input type="text" id="editIncCatatan" value="${targetTx.catatan}" class="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white"></div></div>`;
        document.getElementById('editTxTotalDisplay').textContent = 'Rp ' + targetTx.nominal.toLocaleString('id-ID');
    } else {
        let itemsHtml = `<div class="flex flex-col gap-3" id="editExpItemsSubContainer">`;
        const items = targetTx.items || [{ nama: targetTx.catatan, harga: targetTx.nominal, jumlah: 1 }];
        items.forEach((item, index) => {
            itemsHtml += `
            <div id="sub-edit-row-${index}-${Date.now()}" class="edit-expense-row bg-slate-100/40 dark:bg-slate-800/20 border p-3 rounded-xl relative flex flex-col gap-2">
                <button type="button" onclick="this.parentElement.remove(); window.calculateEditExpenseTotal();" class="absolute top-2 right-2 text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash-can text-[11px]"></i></button>
                <div class="grid grid-cols-1 gap-1 pr-4"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">NAMA BARANG</label><input type="text" required value="${item.nama}" class="edit-exp-name px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-0.5"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">HARGA</label><input type="number" required min="1" value="${item.harga}" oninput="window.calculateEditExpenseTotal()" class="edit-exp-harga px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
                    <div class="flex flex-col gap-0.5"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">JUMLAH</label><input type="number" required min="1" value="${item.jumlah}" oninput="window.calculateEditExpenseTotal()" class="edit-exp-jumlah px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
                </div>
            </div>`;
        });
        itemsHtml += `</div>`;
        container.innerHTML = `<div class="flex flex-col gap-3">${dompetHtml}${katSelect}<div><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Keterangan Ringkas</label><input type="text" id="editExpCatatan" value="${targetTx.catatan}" class="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white"></div><div class="flex justify-between items-center px-1"><span class="text-xs font-bold text-slate-700 dark:text-slate-300">Rincian Barang</span><button type="button" onclick="window.addBarisBaruDiModalEdit()" class="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-lg"><i class="fa-solid fa-plus text-[8px]"></i> Tambah</button></div>${itemsHtml}</div>`;
        window.calculateEditExpenseTotal();
    }
    document.getElementById('editTxModal').classList.remove('hidden');
}

// NOTE: Fungsi addBarisBaruDiModalEdit & calculateEditExpenseTotal BIARIN AJA UTUH

window.submitTxUpdate = async function (e) {
    e.preventDefault();
    const id = document.getElementById('editTxId').value;
    const type = document.getElementById('editTxType').value;
    const btn = document.getElementById('editTxSubmitBtn');

    // Ambil data dompet terbaru
    const dompetInput = document.getElementById('editTxDompet');
    const selectedDompet = dompetInput ? dompetInput.value : "Tunai (Cash)";

    let payload = {};
    btn.textContent = "Menyimpan...";
    btn.disabled = true;

    if (type === 'pemasukan') {
        payload = { nominal: parseFloat(document.getElementById('editIncNominal').value), catatan: document.getElementById('editIncCatatan').value.trim(), dompet: selectedDompet };
    } else {
        const rows = document.querySelectorAll('.edit-expense-row');
        const items = [];
        let calc = 0;
        rows.forEach(row => {
            const nm = row.querySelector('.edit-exp-name').value.trim();
            const h = parseFloat(row.querySelector('.edit-exp-harga').value || 0);
            const j = parseFloat(row.querySelector('.edit-exp-jumlah').value || 0);
            if (nm && h > 0 && j > 0) { calc += (h * j); items.push({ nama: nm, harga: h, jumlah: j }); }
        });
        if (items.length === 0) {
            if (window.showWarnModal) window.showWarnModal("Daftar Kosong", "Harap isi barang pengeluaran.");
            btn.textContent = "Simpan";
            btn.disabled = false;
            return;
        }
        const katInput = document.getElementById('editExpKategori');
        payload = { nominal: calc, items: items, catatan: document.getElementById('editExpCatatan').value.trim(), dompet: selectedDompet, kategori: katInput ? katInput.value : "Lainnya" };
    }

    try {
        await updateDoc(doc(db, "transaksi", id), payload);
        window.closeModal('editTxModal');
        window.closeModal('txListModal');
    } catch (e) {
        if (window.showWarnModal) window.showWarnModal("Terjadi Kesalahan", "Gagal memperbarui data.");
    } finally {
        btn.textContent = "Simpan";
        btn.disabled = false;
    }
}

// 6. List, Detail, Hapus Transaksi (DIPERBARUI PAKE GRUP TANGGAL)
window.renderTransactionList = function (type, action) {
    const container = document.getElementById('txListContainer');
    const title = document.getElementById('txListTitle');
    container.innerHTML = "";
    title.textContent = `${action} Data ${type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}`;

    // Filter dan urutkan dari terbaru ke terlama
    let filtered = window.localTransactionsCache.filter(t => t.type === type);
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada riwayat transaksi.</p>`;
        return;
    }

    // Grup transaksi berdasarkan tanggal
    let groupedData = {};
    filtered.forEach(t => {
        const dateStr = new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!groupedData[dateStr]) groupedData[dateStr] = [];
        groupedData[dateStr].push(t);
    });

    // Render per grup tanggal
    Object.keys(groupedData).forEach(date => {
        const dateHeader = document.createElement('div');
        dateHeader.className = "text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3 mb-1 px-1";
        dateHeader.textContent = date;
        container.appendChild(dateHeader);

        groupedData[date].forEach(t => {
            const itemRow = document.createElement('div');
            itemRow.className = "flex justify-between items-center bg-white/50 dark:bg-slate-800/40 border p-4 rounded-2xl shadow-sm mb-2";
            let btnHtml = action === "Ubah"
                ? `<button onclick="window.openEditForm('${t.id}')" class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"><i class="fa-solid fa-pen text-xs"></i></button>`
                : `<button onclick="window.confirmDeleteTx('${t.id}')" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><i class="fa-solid fa-trash-can text-xs"></i></button>`;

            let txDompet = t.dompet || "Tunai (Cash)";
            itemRow.innerHTML = `
                <div class="min-w-0 flex-1 pr-2">
                    <h5 class="text-xs font-bold text-slate-800 dark:text-white truncate">${t.catatan}</h5>
                    <span class="text-[10px] text-slate-400 mt-0.5"><i class="fa-solid fa-wallet mr-1 text-[9px]"></i> ${txDompet}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold ${type === 'pemasukan' ? 'text-emerald-500' : 'text-red-500'}">Rp ${t.nominal.toLocaleString('id-ID')}</span>
                    ${btnHtml}
                </div>`;
            container.appendChild(itemRow);
        });
    });
}
// window.openEditForm = function(id, nominal, catatan) { 
//     const targetTx = window.localTransactionsCache.find(t => t.id === id); 
//     if(!targetTx) return; 

//     document.getElementById('editTxId').value = id; 
//     document.getElementById('editTxType').value = targetTx.type; 
//     const container = document.getElementById('editTxDynamicContainer'); 
//     container.innerHTML = ""; 

//     if(targetTx.type === 'pemasukan') { 
//         container.innerHTML = `<div class="flex flex-col gap-4"><div><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal Baru (Rp)</label><input type="number" id="editIncNominal" required min="1" value="${targetTx.nominal}" oninput="document.getElementById('editTxTotalDisplay').textContent = 'Rp ' + parseFloat(this.value || 0).toLocaleString('id-ID')" class="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white"></div><div><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Catatan</label><input type="text" id="editIncCatatan" value="${targetTx.catatan}" class="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white"></div></div>`; 
//         document.getElementById('editTxTotalDisplay').textContent = 'Rp ' + targetTx.nominal.toLocaleString('id-ID'); 
//     } else { 
//         let itemsHtml = `<div class="flex flex-col gap-3" id="editExpItemsSubContainer">`; 
//         const items = targetTx.items || [{ nama: targetTx.catatan, harga: targetTx.nominal, jumlah: 1 }]; 
//         items.forEach((item, index) => { 
//             itemsHtml += `
//             <div id="sub-edit-row-${index}-${Date.now()}" class="edit-expense-row bg-slate-100/40 dark:bg-slate-800/20 border p-3 rounded-xl relative flex flex-col gap-2">
//                 <button type="button" onclick="this.parentElement.remove(); window.calculateEditExpenseTotal();" class="absolute top-2 right-2 text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash-can text-[11px]"></i></button>
//                 <div class="grid grid-cols-1 gap-1 pr-4"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">NAMA BARANG</label><input type="text" required value="${item.nama}" class="edit-exp-name px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
//                 <div class="grid grid-cols-2 gap-2">
//                     <div class="flex flex-col gap-0.5"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">HARGA</label><input type="number" required min="1" value="${item.harga}" oninput="window.calculateEditExpenseTotal()" class="edit-exp-harga px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
//                     <div class="flex flex-col gap-0.5"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">JUMLAH</label><input type="number" required min="1" value="${item.jumlah}" oninput="window.calculateEditExpenseTotal()" class="edit-exp-jumlah px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
//                 </div>
//             </div>`; 
//         }); 
//         itemsHtml += `</div>`; 
//         container.innerHTML = `<div class="flex flex-col gap-3"><div><label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Keterangan Ringkas</label><input type="text" id="editExpCatatan" value="${targetTx.catatan}" class="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border text-[11px] font-semibold text-slate-800 dark:text-white"></div><div class="flex justify-between items-center px-1"><span class="text-xs font-bold text-slate-700 dark:text-slate-300">Rincian Barang</span><button type="button" onclick="window.addBarisBaruDiModalEdit()" class="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-lg"><i class="fa-solid fa-plus text-[8px]"></i> Tambah</button></div>${itemsHtml}</div>`; 
//         window.calculateEditExpenseTotal(); 
//     } 
//     document.getElementById('editTxModal').classList.remove('hidden'); 
// }

window.addBarisBaruDiModalEdit = function () {
    const container = document.getElementById('editExpItemsSubContainer');
    const rowDiv = document.createElement('div');
    rowDiv.className = "edit-expense-row bg-slate-100/40 dark:bg-slate-800/20 border p-3 rounded-xl relative flex flex-col gap-2";
    rowDiv.innerHTML = `
        <button type="button" onclick="this.parentElement.remove(); window.calculateEditExpenseTotal();" class="absolute top-2 right-2 text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash-can text-[11px]"></i></button>
        <div class="grid grid-cols-1 gap-1 pr-4"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">NAMA BARANG</label><input type="text" required class="edit-exp-name px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white" placeholder="Barang baru"></div>
        <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-0.5"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">HARGA</label><input type="number" required min="1" value="0" oninput="window.calculateEditExpenseTotal()" class="edit-exp-harga px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
            <div class="flex flex-col gap-0.5"><label class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">JUMLAH</label><input type="number" required min="1" value="1" oninput="window.calculateEditExpenseTotal()" class="edit-exp-jumlah px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/40 border text-[11px] font-semibold text-slate-800 dark:text-white"></div>
        </div>`;
    container.appendChild(rowDiv);
    window.calculateEditExpenseTotal();
}

window.calculateEditExpenseTotal = function () {
    let total = 0;
    document.querySelectorAll('.edit-expense-row').forEach(row => {
        total += (parseFloat(row.querySelector('.edit-exp-harga').value || 0) * parseFloat(row.querySelector('.edit-exp-jumlah').value || 0));
    });
    document.getElementById('editTxTotalDisplay').textContent = 'Rp ' + total.toLocaleString('id-ID');
}

// window.submitTxUpdate = async function(e) { 
//     e.preventDefault(); 
//     const id = document.getElementById('editTxId').value; 
//     const type = document.getElementById('editTxType').value; 
//     const btn = document.getElementById('editTxSubmitBtn'); 
//     let payload = {}; 
//     btn.textContent = "Menyimpan..."; 
//     btn.disabled = true; 

//     if (type === 'pemasukan') { 
//         payload = { nominal: parseFloat(document.getElementById('editIncNominal').value), catatan: document.getElementById('editIncCatatan').value.trim() }; 
//     } else { 
//         const rows = document.querySelectorAll('.edit-expense-row'); 
//         const items = []; 
//         let calc = 0; 
//         rows.forEach(row => { 
//             const nm = row.querySelector('.edit-exp-name').value.trim(); 
//             const h = parseFloat(row.querySelector('.edit-exp-harga').value || 0); 
//             const j = parseFloat(row.querySelector('.edit-exp-jumlah').value || 0); 
//             if (nm && h > 0 && j > 0) { calc += (h * j); items.push({ nama: nm, harga: h, jumlah: j }); } 
//         }); 
//         if (items.length === 0) { 
//             if(window.showWarnModal) window.showWarnModal("Daftar Kosong", "Harap isi barang pengeluaran."); 
//             btn.textContent = "Simpan"; 
//             btn.disabled = false; 
//             return; 
//         } 
//         payload = { nominal: calc, items: items, catatan: document.getElementById('editExpCatatan').value.trim() }; 
//     } 

//     try { 
//         await updateDoc(doc(db, "transaksi", id), payload); 
//         window.closeModal('editTxModal'); 
//         window.closeModal('txListModal'); 
//     } catch (e) { 
//         if(window.showWarnModal) window.showWarnModal("Terjadi Kesalahan", "Gagal memperbarui data."); 
//     } finally { 
//         btn.textContent = "Simpan"; 
//         btn.disabled = false; 
//     } 
// }

// 6. List, Detail, Hapus Transaksi & Pagination
// window.renderTransactionList = function(type, action) { 
//     const container = document.getElementById('txListContainer'); 
//     const title = document.getElementById('txListTitle'); 
//     container.innerHTML = ""; 
//     const filtered = window.localTransactionsCache.filter(t => t.type === type); 
//     title.textContent = `${action} Data ${type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}`; 

//     if (filtered.length === 0) { 
//         container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Belum ada riwayat transaksi.</p>`; 
//         return; 
//     } 

//     filtered.forEach(t => { 
//         const itemRow = document.createElement('div'); 
//         itemRow.className = "flex justify-between items-center bg-white/50 dark:bg-slate-800/40 border p-4 rounded-2xl shadow-sm"; 
//         let btnHtml = action === "Ubah" 
//             ? `<button onclick="window.openEditForm('${t.id}', ${t.nominal}, '${t.catatan}')" class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"><i class="fa-solid fa-pen text-xs"></i></button>` 
//             : `<button onclick="window.confirmDeleteTx('${t.id}')" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><i class="fa-solid fa-trash-can text-xs"></i></button>`; 
//         itemRow.innerHTML = `
//             <div class="min-w-0 flex-1 pr-2">
//                 <h5 class="text-xs font-bold text-slate-800 dark:text-white truncate">${t.catatan}</h5>
//                 <span class="text-[10px] text-slate-400 mt-0.5">${new Date(t.tanggal).toLocaleDateString('id-ID')}</span>
//             </div>
//             <div class="flex items-center gap-3">
//                 <span class="text-xs font-bold ${type === 'pemasukan' ? 'text-emerald-500' : 'text-red-500'}">Rp ${t.nominal.toLocaleString('id-ID')}</span>
//                 ${btnHtml}
//             </div>`; 
//         container.appendChild(itemRow); 
//     }); 
// }

window.openTxDetail = function (id) {
        const tx = window.localTransactionsCache.find(t => t.id === id);
        if (!tx) return;

        const isInc = tx.type === 'pemasukan';
        const badge = document.getElementById('detailTxTypeBadge');
        if (badge) {
            badge.className = `text-[10px] px-2 py-1 rounded uppercase font-bold ${isInc ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`;
            badge.textContent = tx.type;
        }
        
        const dateEl = document.getElementById('detailTxDate');
        if (dateEl) dateEl.textContent = new Date(tx.tanggal).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        const nomEl = document.getElementById('detailTxNominal');
        if (nomEl) {
            nomEl.textContent = `Rp ${tx.nominal.toLocaleString('id-ID')}`;
            nomEl.className = `text-3xl font-bold tracking-tight ${isInc ? 'text-emerald-500' : 'text-red-500'} mt-1`;
        }
        
        const catEl = document.getElementById('detailTxCatatan');
        if (catEl) catEl.textContent = tx.catatan || '-';

        const dompetEl = document.getElementById('detailDompet');
        if (dompetEl) dompetEl.textContent = tx.dompet || 'Tunai (Cash)';

        const katEl = document.getElementById('detailKategori');
        if (katEl) katEl.textContent = tx.kategori || (isInc ? '-' : 'Lainnya');

        const itemsContainer = document.getElementById('detailTxItems');
        if (itemsContainer && tx.items && tx.items.length > 0) {
            itemsContainer.classList.remove('hidden');
            itemsContainer.classList.add('flex');
            let listHtml = '';
            tx.items.forEach(it => {
                listHtml += `<div class="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50"><span class="text-slate-600 dark:text-slate-300 font-medium">${it.nama} <span class="text-slate-400">(x${it.jumlah})</span></span><span class="font-bold text-slate-800 dark:text-slate-200">Rp ${(it.harga * it.jumlah).toLocaleString('id-ID')}</span></div>`;
            });
            document.getElementById('detailTxItemsList').innerHTML = listHtml;
        } else if (itemsContainer) {
            itemsContainer.classList.add('hidden');
            itemsContainer.classList.remove('flex');
        }

        // FOTO STRUK RENDER LOGIC
        const lampiranContainer = document.getElementById('detailTxLampiran');
        if (lampiranContainer) {
            if (tx.lampiran && tx.lampiran.length > 0) {
                lampiranContainer.classList.remove('hidden');
                lampiranContainer.classList.add('flex');
                
                const gridWadah = document.getElementById('detailTxLampiranGrid');
                let imgHtml = '';
                tx.lampiran.forEach(url => {
                    // Gambar dijaga biar ga meluber: w-full tapi dibatasi max-h-64
                    imgHtml += `<div class="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm bg-slate-100 dark:bg-slate-800/50 p-2">
                                    <img src="${url}" class="w-full h-auto object-contain max-h-64 mx-auto rounded-xl">
                                </div>`;
                });
                gridWadah.innerHTML = imgHtml;
            } else {
                lampiranContainer.classList.add('hidden');
                lampiranContainer.classList.remove('flex');
            }
        }

        // ANIMASI SHEET NAIK (BUKA)
        const modal = document.getElementById('txDetailModal');
        const backdrop = document.getElementById('txDetailBackdrop');
        const sheet = document.getElementById('txDetailSheet');
        
        // Munculin div-nya dulu dari hidden
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Trik reflow biar animasinya jalan kaga ngelag
        void modal.offsetWidth; 
        
        // Jalankan animasinya
        backdrop.classList.remove('opacity-0');
        sheet.classList.remove('translate-y-full', 'opacity-0');
    }

    // ANIMASI SHEET TURUN (TUTUP) - Taruh ini di mana aja di dalem transaksi.js
    window.closeTxSheet = function() {
        const modal = document.getElementById('txDetailModal');
        const backdrop = document.getElementById('txDetailBackdrop');
        const sheet = document.getElementById('txDetailSheet');
        
        // Hapus class biar geser turun
        backdrop.classList.add('opacity-0');
        sheet.classList.add('translate-y-full', 'opacity-0');
        
        // Tunggu 300ms (sesuai durasi animasi) baru sembunyiin total div-nya
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }

window.renderTxHistoryPagination = function () {
    const sortedTx = [...window.localTransactionsCache].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    const totalPages = Math.ceil(sortedTx.length / window.txPerPage) || 1;
    if (window.currentTxPage > totalPages) window.currentTxPage = totalPages;
    const startIdx = (window.currentTxPage - 1) * window.txPerPage;
    const paginatedData = sortedTx.slice(startIdx, startIdx + window.txPerPage);

    const tbody = document.getElementById('txHistoryTableBody');
    tbody.innerHTML = '';

    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 px-2 text-center text-slate-400 italic text-[11px]">Belum ada rekam transaksi keuangan.</td></tr>`;
    } else {
        paginatedData.forEach(tx => {
            const isIncome = tx.type === 'pemasukan';
            const colorClass = isIncome ? 'text-emerald-500' : 'text-red-500';
            const sign = isIncome ? '+' : '-';
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-200/20 text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all cursor-pointer";
            tr.onclick = () => window.openTxDetail(tx.id);
            tr.innerHTML = `
                <td class="py-3 px-2 text-[10px] text-slate-500 whitespace-nowrap">${new Date(tx.tanggal).toLocaleDateString('id-ID')}</td>
                <td class="py-3 px-2 text-[10px] font-bold ${colorClass} uppercase">${tx.type}</td>
                <td class="py-3 px-2 text-[11px] truncate max-w-[100px] sm:max-w-xs">${tx.catatan}</td>
                <td class="py-3 px-2 text-right text-[11px] font-bold ${colorClass} whitespace-nowrap">${sign} Rp ${tx.nominal.toLocaleString('id-ID')}</td>`;
            tbody.appendChild(tr);
        });
    }

    const pgContainer = document.getElementById('txPaginationControls');
    let pageBtns = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === window.currentTxPage) pageBtns += `<button class="w-6 h-6 rounded bg-accent text-white text-[10px] font-bold mx-0.5 shadow">${i}</button>`;
        else pageBtns += `<button onclick="window.changeTxPage(${i})" class="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] hover:bg-slate-300 transition-all mx-0.5">${i}</button>`;
    }
    pgContainer.innerHTML = `
        <button onclick="window.changeTxPage(window.currentTxPage - 1)" ${window.currentTxPage === 1 ? 'disabled' : ''} class="px-2 py-1 rounded border text-[10px] text-slate-500 disabled:opacity-30 transition-all font-semibold">Prev</button>
        <div class="flex">${pageBtns}</div>
        <button onclick="window.changeTxPage(window.currentTxPage + 1)" ${window.currentTxPage === totalPages ? 'disabled' : ''} class="px-2 py-1 rounded border text-[10px] text-slate-500 disabled:opacity-30 transition-all font-semibold">Next</button>`;
}

window.changeTxPage = function (newPage) {
    window.currentTxPage = newPage;
    window.renderTxHistoryPagination();
}

window.confirmDeleteTx = function (id) {
    window.pendingDeleteId = id;
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

window.executeDeleteTx = async function () {
    if (!window.pendingDeleteId) return;
    try {
        await deleteDoc(doc(db, "transaksi", window.pendingDeleteId));
        window.closeModal('confirmDeleteModal');
        window.closeModal('txListModal');
        window.pendingDeleteId = null;
    } catch (e) {
        if (window.showWarnModal) window.showWarnModal("Gagal", "Transaksi gagal dihapus dari sistem.");
    }
}

// 6. Sistem Kirim Laporan Bug / CS
window.submitReport = async function (e) {
    e.preventDefault();
    if (!window.currentUserUid) return window.showWarnModal ? window.showWarnModal("Akses Ditolak", "Anda harus login untuk mengirim laporan.") : alert("Login dulu!");

    const cat = document.getElementById('reportCategory').value;
    const msg = document.getElementById('reportMessage').value.trim();
    const btn = document.getElementById('reportSubmitBtn');

    if (!msg) return window.showWarnModal ? window.showWarnModal("Input Kosong", "Pesan laporan tidak boleh kosong.") : alert("Pesan kosong");

    btn.textContent = "Mengirim...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "laporan_bug"), {
            uid: window.currentUserUid,
            username: window.cachedUsernameRaw || "Unknown",
            kategori: cat,
            pesan: msg,
            tanggal: new Date().toISOString()
        });
        if (window.closeReportModal) window.closeReportModal();
        if (window.showSuccessModal) window.showSuccessModal("Laporan Terkirim", "Terima kasih! Pesan lu udah masuk ke sistem developer.");
    } catch (err) {
        console.error("🔥 ERROR FIREBASE:", err);
        if (window.showWarnModal) window.showWarnModal("Gagal Mengirim", "Error: " + err.message);
    } finally {
        btn.textContent = "Kirim Pesan";
        btn.disabled = false;
    }
}

// Modul Transfer / Mutasi Antar Dompet
window.submitTransfer = async function (e) {
    e.preventDefault();
    const nominal = parseInt(document.getElementById('tfNominal').value);
    const dompetAsal = document.getElementById('tfDompetAsal').value;
    const dompetTujuan = document.getElementById('tfDompetTujuan').value;
    const catatanUser = document.getElementById('tfCatatan').value;
    const rawTgl = document.getElementById('tfTanggal').value;
    const finalTgl = rawTgl ? new Date(rawTgl).toISOString() : new Date().toISOString();

    if (dompetAsal === dompetTujuan) {
        return window.showWarnModal ? window.showWarnModal("Transfer Ditolak", "Dompet asal dan dompet tujuan tidak boleh sama.") : alert("Dompet sama.");
    }
    if (!nominal || nominal <= 0) return;
    if (!window.currentUserUid) return;

    // Hitung saldo
    let saldoAsal = 0;
    if (window.localTransactionsCache) {
        window.localTransactionsCache.forEach(tx => {
            const txDompet = tx.dompet || "Tunai (Cash)";
            if (txDompet === dompetAsal) {
                if (tx.type === 'pemasukan') saldoAsal += tx.nominal;
                else saldoAsal -= tx.nominal;
            }
        });
    }

    // Cegat saldo kurang (Formal)
    if (nominal > saldoAsal) {
        if (window.showWarnModal) {
            window.showWarnModal("Saldo Tidak Mencukupi", `Saldo pada ${dompetAsal} Anda (Rp ${saldoAsal.toLocaleString('id-ID')}) tidak mencukupi untuk melakukan transfer sebesar Rp ${nominal.toLocaleString('id-ID')}.`);
        } else {
            alert("Saldo tidak mencukupi.");
        }
        return; 
    }
    // --------------------------------------

    try {
        // Kita import addDoc di sini biar kebal error scope
        const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { db } = await import("./firebase-config.js");

        // Bikin tombolnya ada efek loading biar user kaga spam klik
        const btn = document.querySelector('#transferForm button[type="submit"]');
        if(btn) { btn.textContent = "Memproses..."; btn.disabled = true; }

        // 1. Catat sebagai PENGELUARAN di dompet asal
        await addDoc(collection(db, "transaksi"), {
            uid: window.currentUserUid,
            type: "pengeluaran",
            nominal: nominal,
            dompet: dompetAsal,
            kategori: "Transfer Saldo", // Label sakti biar kedetek sama PDF & Dashboard
            catatan: catatanUser || `Mutasi keluar ke ${dompetTujuan}`,
            tanggal: finalTgl,
            items: [{ nama: `Transfer ke ${dompetTujuan}`, harga: nominal, jumlah: 1 }]
        });

        // 2. Catat sebagai PEMASUKAN di dompet tujuan
        await addDoc(collection(db, "transaksi"), {
            uid: window.currentUserUid,
            type: "pemasukan",
            nominal: nominal,
            dompet: dompetTujuan,
            kategori: "Transfer Saldo", // Label sakti biar kedetek sama PDF & Dashboard
            catatan: catatanUser || `Mutasi masuk dari ${dompetAsal}`,
            tanggal: finalTgl
        });

        document.getElementById('transferForm').reset();
        if (window.closeModal) window.closeModal('transferModal');
        if (window.showSuccessModal) window.showSuccessModal("Mutasi Berhasil", `Saldo Rp ${nominal.toLocaleString('id-ID')} berhasil dipindah dari ${dompetAsal} ke ${dompetTujuan}.`);

    } catch (err) {
        console.error("Gagal Transfer", err);
        if (window.showWarnModal) window.showWarnModal("Error", "Gagal memindahkan saldo. Coba lagi.");
    } finally {
        // Reset tombol jadi normal lagi
        const btn = document.querySelector('#transferForm button[type="submit"]');
        if(btn) { btn.textContent = "Transfer Sekarang"; btn.disabled = false; }
    }
}

// ==========================================
// FITUR AI SCANNER STRUK (PEMECAH ITEM)
// ==========================================
window.analyzeReceiptWithAI = async function(imageData) {
    try {
        if(typeof Tesseract === 'undefined') {
            if(window.showWarnModal) window.showWarnModal("Gagal", "Library AI Tesseract belum siap.");
            window.closeScannerModal();
            return;
        }

        // Tesseract narik data sambil nge-update UI persenan di modal kamera
        const result = await Tesseract.recognize(imageData, 'ind', {
            logger: m => {
                const txt = document.getElementById('scannerStatusText');
                if(txt && m.status === "recognizing text") {
                    txt.innerHTML = `<i class="fa-solid fa-microchip fa-spin"></i> Ekstrak: ${Math.round(m.progress * 100)}% - Sedang memecah data...`;
                }
            }
        });

        const text = result.data.text;
        console.log("Teks Mentah AI:\n", text);

        // LOGIKA PEMECAH STRUK PER BARIS
        const lines = text.split('\n');
        const parsedItems = [];
        
        // Daftar kata haram yang kaga boleh dimasukin sebagai nama barang
        const excludeWords = ['total', 'tunai', 'cash', 'kembali', 'kembalian', 'pajak', 'ppn', 'subtotal', 'diskon', 'card', 'debit', 'kredit', 'struk', 'bca', 'mandiri', 'qris', 'mastercard', 'visa', 'jl.', 'telp', 'rp', 'admin'];

        lines.forEach(line => {
            let lowerLine = line.toLowerCase();
            
            // Kalo baris ini ngandung kata haram (ex: "Total: 50.000"), langsung skip
            if (excludeWords.some(w => lowerLine.includes(w))) return;

            // Cari angka yang formatnya ribuan (ada koma atau titik, ex: 15.000)
            const priceMatch = line.match(/\b\d{1,3}(?:[.,]\d{3})+\b/g);
            if (priceMatch) {
                // Ambil angka terakhir di baris itu sebagai Harga Total Barang
                let priceStr = priceMatch[priceMatch.length - 1];
                let price = parseInt(priceStr.replace(/[.,]/g, ''));

                // Cari Jumlah (Qty) Barang (Contoh: "2x" atau "2 x" atau angka di awal baris)
                let qty = 1;
                const qtyMatch = line.match(/\b(\d+)\s*x\b/i) || line.match(/^(\d+)\s/);
                if (qtyMatch) {
                    qty = parseInt(qtyMatch[1]) || 1;
                }

                // Sisa teks di baris itu (setelah dikurangin angka harga & qty) = NAMA BARANG
                let name = line.replace(priceStr, '').replace(new RegExp(`\\b${qty}\\s*x`, 'i'), '').trim();
                // Bersihin dari simbol kaga jelas hasil typo AI
                name = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();

                // Validasi: Nama minimal 3 huruf & Harga kaga mungkin 0
                if (name.length > 2 && price > 0) {
                    // Harga satuan = Harga di struk dibagi Jumlah Qty
                    parsedItems.push({ nama: name, harga: Math.round(price/qty), jumlah: qty });
                }
            }
        });

        if(parsedItems.length === 0) {
            if(window.showWarnModal) window.showWarnModal("AI Bingung", "Gagal ngebaca rincian barang. Pastiin struk kaga lecek, kaga kepanjangan, dan fokus kameranya pas.");
            window.closeScannerModal();
            return;
        }

        // Kalo Sukses, tutup kamera, buka form pengeluaran
        window.closeScannerModal();
        document.getElementById('pengeluaranModal').classList.remove('hidden');

        // Bersihin baris bekas kemaren
        if(window.resetExpenseFormRows) window.resetExpenseFormRows();

        // Suntik item yang udah dipecah AI ke form (Pake setTimeout nunggu modalnya manggung dulu)
        setTimeout(() => {
            const container = document.getElementById('expenseRowsContainer');
            container.innerHTML = ""; // Bersihin 1 baris default

            parsedItems.forEach((item) => {
                window.addExpenseRow(); // Tambah UI baris baru
                
                // Isi inputannya dari belakang (karena addExpenseRow nambah di urutan akhir)
                const rows = document.querySelectorAll('.expense-row');
                const currentRow = rows[rows.length - 1];
                if(currentRow) {
                    currentRow.querySelector('.exp-item-name').value = item.nama;
                    currentRow.querySelector('.exp-item-harga').value = item.harga;
                    currentRow.querySelector('.exp-item-jumlah').value = item.jumlah;
                }
            });

            window.calculateTemporaryTotal();
            document.getElementById('expCatatan').value = "Hasil scan AI dari struk";
        }, 500);

        if(window.showSuccessModal) window.showSuccessModal("Berhasil Diekstrak!", `AI sukses mecah ${parsedItems.length} barang dari struk lu. Cek lagi ya, takutnya ada typo gara-gara struk burem!`);

    } catch (err) {
        console.error("AI Error:", err);
        if(window.showWarnModal) window.showWarnModal("Error AI", "Mesin AI gagal memproses gambar. Cek koneksi lu.");
        window.closeScannerModal();
    }
}

// ==========================================
// ENGINE KOMPRESI KE BASE64 (FIRESTORE ONLY)
// ==========================================
window.pendingExpenseReceipts = [];

window.handleReceiptSelection = async function(input) {
    if (!input.files || input.files.length === 0) return;
    
    // Validasi maksimal 3 foto biar kaga jebol limit 1MB Firestore
    if (input.files.length + window.pendingExpenseReceipts.length > 3) {
        if(window.showWarnModal) window.showWarnModal("Batas Maksimal", "Cukup maksimal 3 foto struk per transaksi bro.");
        input.value = '';
        return;
    }

    const previewContainer = document.getElementById('receiptPreviewContainer');
    
    for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        
        // Kompres jadi string teks (Base64)
        const base64String = await compressImageToBase64(file);
        window.pendingExpenseReceipts.push(base64String);
        
        // Render kotak preview di UI
        const div = document.createElement('div');
        div.className = "relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700/50 group";
        div.innerHTML = `
            <img src="${base64String}" class="w-full h-full object-cover">
            <button type="button" class="absolute top-1 right-1 w-6 h-6 bg-red-500/80 text-white rounded-lg flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-sm" onclick="this.parentElement.remove(); window.pendingExpenseReceipts.splice(${window.pendingExpenseReceipts.length - 1}, 1);">
                <i class="fa-solid fa-xmark"></i>
            </button>`;
        previewContainer.appendChild(div);
    }
    input.value = ''; // Reset input biar bisa milih foto yang sama lagi kalo dihapus
}

// Kompresi Brutal: Dimensi Maks 800px, Kualitas 50%
function compressImageToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                // Maksimal lebar/tinggi turunin jadi 800px aja
                const MAX_DIM = 800; 
                
                if (width > height && width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                } else if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Ubah gambar jadi string (Base64) pake kualitas 50%
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                resolve(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ==========================================
// MESIN VOICE COMMAND (SPEECH TO TEXT) - UPDATE ANTI BUG
// ==========================================
window.startVoiceInput = function(rowId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if(window.showWarnModal) window.showWarnModal("Tidak Mendukung", "Browser lu kaga support fitur rekam suara bro. Pake Google Chrome coba.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; 
    recognition.interimResults = false;
    
    const rowEl = document.getElementById(rowId);
    const btn = rowEl.querySelector('.voice-btn');
    const originalHtml = btn.innerHTML;
    
    // Animasi mic pas ngerekam
    btn.innerHTML = `<i class="fa-solid fa-microphone fa-beat-fade text-red-500"></i>`;
    btn.classList.replace('bg-blue-100', 'bg-red-100');

    recognition.start();

    recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Suara Asli Browser: ", transcript);

        // 1. Bersihin format bawaan browser (ilangin tulisan "rp", "rp.", titik, dan koma)
        transcript = transcript.replace(/rp\.?/g, '').replace(/\./g, '').replace(/,/g, '').trim();
        
        // 2. Ubah kata-kata angka jadi digit (karena kadang browser nulis "dua" bukannya "2")
        const angkaTeks = {
            'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
            'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'sepuluh': '10'
        };
        for (let kata in angkaTeks) {
            let regexKata = new RegExp('\\b' + kata + '\\b', 'g');
            transcript = transcript.replace(regexKata, angkaTeks[kata]);
        }
        
        // Hapus spasi ganda biar rapi
        transcript = transcript.replace(/\s+/g, ' ');
        console.log("Suara Sesudah Dibersihin: ", transcript);

        // 3. Regex Sakti Baru: Nangkep [Nama Barang] [Harga] [Jumlah (Opsional)]
        // Sekarang bisa ngebaca "pentol 5000 2" atau cuma "pentol 5000" (otomatis jumlahnya 1)
        const match = transcript.match(/(.+?)\s+(\d+)(?:\s+(\d+))?$/);
        
        const nameInput = rowEl.querySelector('.exp-item-name');
        const priceInput = rowEl.querySelector('.exp-item-harga');
        const qtyInput = rowEl.querySelector('.exp-item-jumlah');

        if (match) {
            // Nangkep nama barang
            nameInput.value = match[1].trim();
            
            // Nangkep dua angka di belakang
            let num1 = parseInt(match[2]);
            let num2 = match[3] ? parseInt(match[3]) : 1; // Kalo kaga ada angka kedua, anggep jumlahnya 1
            
            // LOGIKA SAKTI: Angka paling gede otomatis jadi HARGA, angka kecil otomatis jadi JUMLAH
            priceInput.value = Math.max(num1, num2);
            qtyInput.value = Math.min(num1, num2);
            
        } else {
            // Kalo user ngomongnya belibet parah, lempar aja semua teksnya ke kotak Nama Barang
            nameInput.value = transcript;
        }
        
        window.calculateTemporaryTotal();
    };

    recognition.onend = () => {
        btn.innerHTML = originalHtml;
        btn.classList.replace('bg-red-100', 'bg-blue-100');
    };
    
    recognition.onerror = () => {
        btn.innerHTML = originalHtml;
        btn.classList.replace('bg-red-100', 'bg-blue-100');
    };
}

// ==========================================
// ENGINE SINKRONISASI ADMIN CONFIG
// ==========================================
window.saveAdminConfig = function() {
    window.appConfigData = {
        pemasukan_enabled: document.getElementById('togglePemasukan').checked,
        pengeluaran_enabled: document.getElementById('togglePengeluaran').checked,
        edit_enabled: document.getElementById('toggleEdit').checked,
        voice_enabled: document.getElementById('toggleVoice').checked
    };
    
    localStorage.setItem('finoAdminConfig', JSON.stringify(window.appConfigData));
    window.applyAdminConfig();
}

window.applyAdminConfig = function() {
    const configStr = localStorage.getItem('finoAdminConfig');
    if (configStr) {
        window.appConfigData = JSON.parse(configStr);
    } else {
        window.appConfigData = { pemasukan_enabled: true, pengeluaran_enabled: true, edit_enabled: true, voice_enabled: false };
    }

    if(document.getElementById('togglePemasukan')) document.getElementById('togglePemasukan').checked = window.appConfigData.pemasukan_enabled;
    if(document.getElementById('togglePengeluaran')) document.getElementById('togglePengeluaran').checked = window.appConfigData.pengeluaran_enabled;
    if(document.getElementById('toggleEdit')) document.getElementById('toggleEdit').checked = window.appConfigData.edit_enabled;
    if(document.getElementById('toggleVoice')) document.getElementById('toggleVoice').checked = window.appConfigData.voice_enabled;

    // Nyalain / Matiin Tombol Utama di Dashboard (Berdasarkan urutan text tombol lu)
    const allButtons = document.querySelectorAll('#tab-dashboard button');
    allButtons.forEach(btn => {
        const text = btn.innerText;
        if(text.includes('Tambah Pemasukan')) {
            btn.style.display = window.appConfigData.pemasukan_enabled ? 'flex' : 'none';
        }
        if(text.includes('Catat Pengeluaran')) {
            btn.style.display = window.appConfigData.pengeluaran_enabled ? 'flex' : 'none';
        }
        if(text.includes('Edit Pengeluaran') || text.includes('Edit Pemasukan')) {
            btn.style.display = window.appConfigData.edit_enabled ? 'flex' : 'none';
        }
    });
}

// Pastiin config jalan pas web pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.applyAdminConfig();
    }, 500);
});

// ==========================================
// ENGINE SINKRONISASI ADMIN CONFIG
// ==========================================
window.saveAdminConfig = function() {
    try {
        window.appConfigData = {
            pemasukan_enabled: document.getElementById('togglePemasukan') ? document.getElementById('togglePemasukan').checked : true,
            pengeluaran_enabled: document.getElementById('togglePengeluaran') ? document.getElementById('togglePengeluaran').checked : true,
            edit_enabled: document.getElementById('toggleEdit') ? document.getElementById('toggleEdit').checked : true,
            voice_enabled: document.getElementById('toggleVoice') ? document.getElementById('toggleVoice').checked : false
        };
        
        localStorage.setItem('finoAdminConfig', JSON.stringify(window.appConfigData));
        
        // Pake delay dikit biar browser ga "nge-lock" animasi toggle Tailwind-nya
        setTimeout(() => {
            window.applyAdminConfig();
        }, 50);
    } catch (error) {
        console.error("Gagal nyimpen config admin:", error);
    }
}

window.applyAdminConfig = function() {
    try {
        let savedData = localStorage.getItem('finoAdminConfig');
        
        if (savedData) {
            let parsed = JSON.parse(savedData);
            
            // Obat anti bug: Kalo datanya kena double-string (corrupt), kita parse sekali lagi
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            
            // Pastiin semuanya murni boolean (true/false) biar toggle kaga nyangkut
            window.appConfigData = {
                pemasukan_enabled: parsed.pemasukan_enabled === true || parsed.pemasukan_enabled === "true",
                pengeluaran_enabled: parsed.pengeluaran_enabled === true || parsed.pengeluaran_enabled === "true",
                edit_enabled: parsed.edit_enabled === true || parsed.edit_enabled === "true",
                voice_enabled: parsed.voice_enabled === true || parsed.voice_enabled === "true"
            };
        } else {
            // Default pabrik
            window.appConfigData = { pemasukan_enabled: true, pengeluaran_enabled: true, edit_enabled: true, voice_enabled: false };
        }
    } catch (e) {
        // Kalo memori bener-bener hancur, kembalikan ke pengaturan pabrik otomatis
        console.error("Data admin corrupt, reset ke pabrik:", e);
        window.appConfigData = { pemasukan_enabled: true, pengeluaran_enabled: true, edit_enabled: true, voice_enabled: false };
        localStorage.removeItem('finoAdminConfig');
    }

    // 1. Update UI Toggle di Admin Panel
    if(document.getElementById('togglePemasukan')) document.getElementById('togglePemasukan').checked = window.appConfigData.pemasukan_enabled;
    if(document.getElementById('togglePengeluaran')) document.getElementById('togglePengeluaran').checked = window.appConfigData.pengeluaran_enabled;
    if(document.getElementById('toggleEdit')) document.getElementById('toggleEdit').checked = window.appConfigData.edit_enabled;
    if(document.getElementById('toggleVoice')) document.getElementById('toggleVoice').checked = window.appConfigData.voice_enabled;

    // 2. Terapkan efeknya ke Tombol Dashboard
    const allButtons = document.querySelectorAll('#tab-dashboard button');
    allButtons.forEach(btn => {
        const text = btn.innerText;
        if(text.includes('Tambah Pemasukan')) {
            btn.style.display = window.appConfigData.pemasukan_enabled ? 'flex' : 'none';
        }
        if(text.includes('Catat Pengeluaran')) {
            btn.style.display = window.appConfigData.pengeluaran_enabled ? 'flex' : 'none';
        }
        if(text.includes('Edit Pengeluaran') || text.includes('Edit Pemasukan')) {
            btn.style.display = window.appConfigData.edit_enabled ? 'flex' : 'none';
        }
    });
}

// Eksekusi tiap web dibuka
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.applyAdminConfig();
    }, 300);
});