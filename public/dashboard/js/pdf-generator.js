// ==========================================
// PDF-GENERATOR.JS - MESIN CETAK LAPORAN 
// ==========================================
window.openPrintModal = function () {
    if (!window.appConfigData.pdf_enabled) return;
    document.getElementById('printModal').classList.remove('hidden');
    window.backToPrintStep1();
}

let currentPrintFilter = '';

window.preparePrint = function (filterMode) {
    currentPrintFilter = filterMode;
    document.getElementById('printStep1').classList.add('hidden');
    document.getElementById('printStep2').classList.remove('hidden');

    document.getElementById('printInputHarian').classList.add('hidden');
    const mingguanContainer = document.getElementById('printInputMingguan');
    mingguanContainer.classList.add('hidden');
    mingguanContainer.classList.remove('flex');
    document.getElementById('printInputBulanan').classList.add('hidden');
    document.getElementById('printInputTahunan').classList.add('hidden');

    const now = new Date();
    const labelEl = document.getElementById('printStep2Label');

    if (filterMode === 'harian') {
        labelEl.textContent = "Pilih Tanggal Laporan";
        const input = document.getElementById('printInputHarian');
        input.classList.remove('hidden');
        input.value = now.toISOString().split('T')[0];
    }
    else if (filterMode === 'mingguan') {
        labelEl.textContent = "Pilih Bulan & Minggu";
        mingguanContainer.classList.remove('hidden');
        mingguanContainer.classList.add('flex');
        document.getElementById('printMingguanBulan').value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        let currentWeek = Math.ceil(now.getDate() / 7);
        if (currentWeek > 5) currentWeek = 5;
        document.getElementById('printMingguanPekan').value = currentWeek;
    }
    else if (filterMode === 'bulanan') {
        labelEl.textContent = "Pilih Bulan & Tahun";
        const input = document.getElementById('printInputBulanan');
        input.classList.remove('hidden');
        input.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    else if (filterMode === 'tahunan') {
        labelEl.textContent = "Ketik Tahun";
        const input = document.getElementById('printInputTahunan');
        input.classList.remove('hidden');
        input.value = now.getFullYear();
    }
    else if (filterMode === 'seluruhnya') {
        labelEl.textContent = "Cetak Semua Riwayat";
    }
}

window.backToPrintStep1 = function () {
    document.getElementById('printStep1').classList.remove('hidden');
    document.getElementById('printStep2').classList.add('hidden');
}

window.executePrint = function (exportType = 'pdf') {
    if (!window.jspdf && exportType === 'pdf') {
        return window.showWarnModal ? window.showWarnModal("Sistem Sibuk", "Library PDF sedang dimuat. Coba beberapa detik lagi.") : alert("Sistem Sibuk");
    }

    const filterMode = currentPrintFilter || 'seluruhnya';
    let selectedDateText = "Seluruh Waktu";
    const listTransaksi = window.localTransactionsCache || [];
    let filteredData = [];

    if (filterMode === 'harian') {
        const val = document.getElementById('printInputHarian').value;
        if (!val) return alert("Pilih tanggal dulu!");
        const targetDate = new Date(val).toDateString();
        filteredData = listTransaksi.filter(t => new Date(t.tanggal).toDateString() === targetDate);
        selectedDateText = new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    else if (filterMode === 'mingguan') {
        const bulanVal = document.getElementById('printMingguanBulan').value;
        const pekanVal = parseInt(document.getElementById('printMingguanPekan').value);
        if (!bulanVal) return alert("Pilih bulan dulu!");
        const [year, month] = bulanVal.split('-');
        let startDay = (pekanVal - 1) * 7 + 1;
        let endDay = pekanVal * 7;
        const lastDayOfMonth = new Date(year, parseInt(month), 0).getDate();
        if (endDay > lastDayOfMonth) endDay = lastDayOfMonth;
        if (startDay > lastDayOfMonth) return alert(`Kaga ada Minggu ke-${pekanVal} di bulan yang dipilih!`);
        const startDate = new Date(year, parseInt(month) - 1, startDay);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, parseInt(month) - 1, endDay);
        endDate.setHours(23, 59, 59, 999);
        filteredData = listTransaksi.filter(t => {
            const txDate = new Date(t.tanggal).getTime();
            return txDate >= startDate.getTime() && txDate <= endDate.getTime();
        });
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        selectedDateText = `Minggu ke-${pekanVal} ${monthNames[parseInt(month) - 1]} ${year}`;
    }
    else if (filterMode === 'bulanan') {
        const val = document.getElementById('printInputBulanan').value;
        if (!val) return alert("Pilih bulan dulu!");
        const [year, month] = val.split('-');
        filteredData = listTransaksi.filter(t => {
            const txDate = new Date(t.tanggal);
            return txDate.getFullYear() == year && (txDate.getMonth() + 1) == parseInt(month);
        });
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        selectedDateText = `Bulan ${monthNames[parseInt(month) - 1]} ${year}`;
    }
    else if (filterMode === 'tahunan') {
        const val = document.getElementById('printInputTahunan').value;
        if (!val) return alert("Ketik tahun dulu!");
        filteredData = listTransaksi.filter(t => new Date(t.tanggal).getFullYear() == val);
        selectedDateText = `Tahun ${val}`;
    }
    else if (filterMode === 'seluruhnya') {
        filteredData = listTransaksi;
    }

    if (filteredData.length === 0) {
        return window.showWarnModal ? window.showWarnModal("Riwayat Kosong", `Tidak ada data transaksi untuk periode ${selectedDateText}.`) : alert("Kosong");
    }

    const now = new Date();
    let grandTotalPemasukan = 0;
    let grandTotalPengeluaran = 0;
    filteredData.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    const lampiranPDF = [];

    // FIX: Tarik saldo dompet & saldo keseluruhan murni dari total data
    const dompetBalances = {};
    let totalSaldoKeseluruhan = 0;

    listTransaksi.forEach(t => {
        let txDompet = t.dompet || 'Tunai (Cash)';
        if (dompetBalances[txDompet] === undefined) dompetBalances[txDompet] = 0;
        
        if (t.type === 'pemasukan') {
            dompetBalances[txDompet] += t.nominal;
            totalSaldoKeseluruhan += t.nominal;
        } else {
            dompetBalances[txDompet] -= t.nominal;
            totalSaldoKeseluruhan -= t.nominal;
        }
    });

    // =========================================
    // EXPORT EXCEL (SHEETJS)
    // =========================================
    if (exportType === 'excel') {
        if (typeof XLSX === 'undefined') return alert("Library Excel belum ke-load bro!");

        const wsData = [
            ["FINOCATAT SECURE REPORT - TRANSAKSI KEUANGAN"],
            [`Periode: ${selectedDateText}`],
            [`Dicetak: ${now.toLocaleString('id-ID')}`],
            [],
            ['No', 'Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Rincian', 'Nominal (Rp)', 'Bukti Lampiran']
        ];

        filteredData.forEach((t, i) => {
            const isMutasi = t.kategori && (t.kategori.toLowerCase().includes('transfer') || t.kategori.toLowerCase().includes('mutasi'));
            let tipeText = t.type === 'pemasukan' ? (isMutasi ? '[+] Mutasi Masuk' : 'Pemasukan') : (isMutasi ? '[-] Mutasi Keluar' : 'Pengeluaran');
            let txDompet = t.dompet || 'Tunai (Cash)';

            if (t.type === 'pemasukan') {
                if (!isMutasi) grandTotalPemasukan += t.nominal;
            } else {
                if (!isMutasi) grandTotalPengeluaran += t.nominal;
            }

            let rincian = t.catatan || '-';
            if (t.items && t.items.length > 0) {
                rincian += " (" + t.items.map(item => `${item.nama} [${item.jumlah}x @${item.harga}]`).join(', ') + ")";
            }

            let buktiTeks = (t.lampiran && t.lampiran.length > 0) ? `Terlampir (${t.lampiran.length} Foto)` : "-";
            let kategoriTeks = t.kategori || '-';
            
            wsData.push([(i + 1), new Date(t.tanggal).toLocaleDateString('id-ID'), tipeText, kategoriTeks, txDompet, rincian, t.nominal, buktiTeks]);
        });

        wsData.push([]);
        wsData.push(['', '', '', 'TOTAL PEMASUKAN PERIODE INI', '', grandTotalPemasukan]);
        wsData.push(['', '', '', 'TOTAL PENGELUARAN PERIODE INI', '', grandTotalPengeluaran]);
        wsData.push(['', '', '', 'TOTAL SALDO KESELURUHAN', '', totalSaldoKeseluruhan]);

        wsData.push([]);
        wsData.push(['', '', '', 'RINCIAN SALDO AKTIF PER DOMPET']);
        Object.keys(dompetBalances).forEach(w => {
            wsData.push(['', '', '', w, '', dompetBalances[w]]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 22 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan_Keuangan");

        const safePeriodName = selectedDateText.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
        const fileN = `Excel_Laporan_${safePeriodName}_byFinoCatat.xlsx`;

        XLSX.writeFile(wb, fileN);
        if (window.closeModal) window.closeModal('printModal');
        return;
    }

    // =========================================
    // EXPORT PDF (JSPDF)
    // =========================================
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const renderWatermark = () => {
        doc.setTextColor(230, 230, 230);
        doc.setFontSize(38);
        doc.setFont("Helvetica", "bold");
        for (let p = 1; p <= 3; p++) doc.text("FINOCATAT SECURE REPORT", 20, 80 * p, { angle: 30, opacity: 0.1 });
        doc.setTextColor(40, 40, 40); 
    };

    renderWatermark();

    doc.setFontSize(18);
    doc.setFont("Helvetica", "bold");
    doc.text("LAPORAN TRANSAKSI KEUANGAN", 14, 20);
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`Periode: ${selectedDateText}`, 14, 26);
    doc.text(`Dicetak: ${now.toLocaleString('id-ID')}`, 14, 31);
    doc.line(14, 35, 196, 35);

    const tableRows = [];
    filteredData.forEach((t, i) => {
        const isMutasi = t.kategori && (t.kategori.toLowerCase().includes('transfer') || t.kategori.toLowerCase().includes('mutasi'));
        let tipeText = t.type === 'pemasukan' ? (isMutasi ? 'Mutasi Masuk' : 'Pemasukan') : (isMutasi ? 'Mutasi Keluar' : 'Pengeluaran');
        let txDompet = t.dompet || 'Tunai (Cash)';

        if (t.type === 'pemasukan') {
            if (!isMutasi) grandTotalPemasukan += t.nominal;
        } else {
            if (!isMutasi) grandTotalPengeluaran += t.nominal;
        }

        let rincian = t.catatan || '-';
        if (t.items && t.items.length > 0) {
            rincian += " (" + t.items.map(item => `${item.nama} [${item.jumlah}x @Rp ${item.harga.toLocaleString('id-ID')}]`).join(', ') + ")";
        }
        
        let buktiTeks = "-";
        if (t.lampiran && t.lampiran.length > 0) {
            buktiTeks = "Ada Bukti";
            lampiranPDF.push(t); 
        }

        tableRows.push([(i + 1), new Date(t.tanggal).toLocaleDateString('id-ID'), tipeText, (t.kategori || '-'), txDompet, rincian, `Rp ${t.nominal.toLocaleString('id-ID')}`, buktiTeks]);
    });

    doc.autoTable({
        startY: 40,
        head: [['No', 'Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Rincian', 'Nominal', 'Bukti']],
        body: tableRows,
        theme: 'grid', 
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        didParseCell: function (data) {
            if (data.section === 'body') {
                const tipeText = data.row.raw[2];
                if (tipeText.includes('Mutasi')) {
                    data.cell.styles.fillColor = [254, 249, 195]; 
                    data.cell.styles.textColor = [133, 77, 14];
                } else if (tipeText === 'Pemasukan') {
                    data.cell.styles.fillColor = [220, 252, 231]; 
                    data.cell.styles.textColor = [22, 101, 52];
                } else if (tipeText === 'Pengeluaran') {
                    data.cell.styles.fillColor = [254, 226, 226]; 
                    data.cell.styles.textColor = [153, 27, 27];
                }
            }
        }
    });

    const finalYAfterMainTable = doc.lastAutoTable.finalY + 10;
    const walletRows = [];
    Object.keys(dompetBalances).forEach(w => { walletRows.push([w, `Rp ${dompetBalances[w].toLocaleString('id-ID')}`]); });
    doc.autoTable({ startY: finalYAfterMainTable, head: [['Rincian Saldo Aktif Per Dompet Saat Ini', 'Total Saldo']], body: walletRows, theme: 'plain', headStyles: { fillColor: [241, 245, 249], textColor: [40, 40, 40] } });
    
    const finalYAfterWalletTable = doc.lastAutoTable.finalY + 10;
    doc.autoTable({
        startY: finalYAfterWalletTable,
        body: [['TOTAL PEMASUKAN PERIODE INI', `Rp ${grandTotalPemasukan.toLocaleString('id-ID')}`], ['TOTAL PENGELUARAN PERIODE INI', `Rp ${grandTotalPengeluaran.toLocaleString('id-ID')}`], ['TOTAL SALDO KESELURUHAN', `Rp ${totalSaldoKeseluruhan.toLocaleString('id-ID')}`]],
        theme: 'plain', styles: { fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 90 } }
    });

    // =========================================
    // INJEKSI HALAMAN BELAKANG (LAMPIRAN BUKTI)
    // =========================================
    if (lampiranPDF.length > 0) {
        doc.addPage();
        renderWatermark();

        doc.setFontSize(16);
        doc.setFont("Helvetica", "bold");
        doc.text("LAMPIRAN BUKTI TRANSAKSI", 14, 20);
        doc.setFontSize(10);
        doc.setFont("Helvetica", "normal");
        doc.text("Dokumentasi struk dan bukti fisik dari transaksi pada periode ini.", 14, 26);
        doc.line(14, 30, 196, 30);
        
        let yPos = 40;
        
        lampiranPDF.forEach((tx) => {
            if (yPos > 240) {
                doc.addPage();
                renderWatermark();
                yPos = 20;
            }
            
            doc.setFont("Helvetica", "bold");
            doc.text(`Tgl: ${new Date(tx.tanggal).toLocaleDateString('id-ID')} | Nominal: Rp ${tx.nominal.toLocaleString('id-ID')}`, 14, yPos);
            doc.setFont("Helvetica", "normal");
            doc.text(`Catatan: ${tx.catatan || '-'}`, 14, yPos + 5);
            
            let xPos = 14;
            let currentImgY = yPos + 10;
            let maxHeightInRow = 0;
            
            tx.lampiran.forEach(base64 => {
                if (xPos + 45 > 196) {
                    xPos = 14;
                    currentImgY += 65; 
                    if (currentImgY > 240) {
                        doc.addPage();
                        renderWatermark();
                        currentImgY = 20;
                    }
                }
                
                try {
                    doc.addImage(base64, 'JPEG', xPos, currentImgY, 45, 60);
                    maxHeightInRow = 60;
                } catch(e) {
                    console.error("Gagal nyetak foto ke PDF", e);
                }
                xPos += 50; 
            });
            
            yPos = currentImgY + maxHeightInRow + 15; 
        });
    }

    const safePeriodName = selectedDateText.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
    const fileN = `PDF_Laporan_${safePeriodName}_byFinoCatat.pdf`;

    doc.save(fileN);
    if (window.closeModal) window.closeModal('printModal');
}