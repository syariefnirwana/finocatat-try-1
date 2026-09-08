// ==========================================
// STATISTIK.JS - MESIN GRAFIK (APEXCHARTS)
// ==========================================

window.dashboardBarChart = null;
window.statistikDonutChart = null;

// Fungsi Utama: Dipanggil waktu data dari Firebase udah siap
window.renderCharts = function() {
    if (!window.localTransactionsCache) return;
    
    // Ambil nilai dari dropdown HTML (Default ke 30 Hari kalo baru buka)
    const valDash = document.getElementById('filterChartDashboard') ? document.getElementById('filterChartDashboard').value : '30';
    const valStat = document.getElementById('filterChartStatistik') ? document.getElementById('filterChartStatistik').value : '30';
    
    window.renderDashboardChart(valDash);
    window.renderStatistikChart(valStat);
}

// ----------------------------------------------------
// GRAFIK 1: DASHBOARD (ARUS KAS BAR CHART)
// ----------------------------------------------------
window.updateDashboardChartFilter = function() {
    const val = document.getElementById('filterChartDashboard').value;
    window.renderDashboardChart(val);
}

window.renderDashboardChart = function(filterStr) {
    if(!document.getElementById('dashboardBarChart') || !window.localTransactionsCache) return;
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#94a3b8' : '#64748b';

    const now = new Date();
    let cutoffDate = new Date(0); // Default ke tahun 1970 (Semua Waktu)
    let isDaily = false;

    // Set batas tanggal mundur
    if (filterStr !== 'all') {
        const days = parseInt(filterStr);
        cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        cutoffDate.setHours(0,0,0,0);
        if (days <= 31) {
            isDaily = true; // Kalo milih 7 atau 30 hari, grafiknya pake format Harian
        }
    }

    const groupedData = {};

    window.localTransactionsCache.forEach(tx => {
        const txDate = new Date(tx.tanggal);
        
        // Cuma proses data yang lebih baru dari tanggal batas cutoff
        if (txDate >= cutoffDate) {
            // Filter biar mutasi antar dompet kaga ikut ngerusak grafik
            const isMutasi = (tx.kategori && (tx.kategori.toLowerCase().includes('transfer') || tx.kategori.toLowerCase().includes('mutasi'))) || 
                             (tx.catatan && (tx.catatan.toLowerCase().includes('mutasi') || tx.catatan.toLowerCase().includes('transfer')));
            
            if (!isMutasi) {
                let key;
                // Format Tampilan Sumbu X
                if (isDaily) {
                    key = txDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); // Cth: 27 Jul
                } else {
                    key = txDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }); // Cth: Jul 2026
                }

                // Pake string (YYYY-MM-DD atau YYYY-MM) murni buat sorting biar posisinya kaga mundur
                let sortKey = isDaily ? 
                              `${txDate.getFullYear()}-${String(txDate.getMonth()+1).padStart(2,'0')}-${String(txDate.getDate()).padStart(2,'0')}` : 
                              `${txDate.getFullYear()}-${String(txDate.getMonth()+1).padStart(2,'0')}`;

                if (!groupedData[key]) {
                    groupedData[key] = { masuk: 0, keluar: 0, sortKey: sortKey };
                }

                if (tx.type === 'pemasukan') groupedData[key].masuk += tx.nominal;
                else if (tx.type === 'pengeluaran') groupedData[key].keluar += tx.nominal;
            }
        }
    });

    // Urutkan data berdasarkan waktu (kronologis)
    const sortedKeys = Object.keys(groupedData).sort((a, b) => groupedData[a].sortKey.localeCompare(groupedData[b].sortKey));

    let labels = sortedKeys;
    let dataMasuk = sortedKeys.map(k => groupedData[k].masuk);
    let dataKeluar = sortedKeys.map(k => groupedData[k].keluar);

    // Kalo di periode itu bener-bener miskin data
    if (labels.length === 0) {
        labels = ['Belum Ada Transaksi'];
        dataMasuk = [0];
        dataKeluar = [0];
    }

    const barOptions = {
        series: [
            { name: 'Pemasukan', data: dataMasuk }, 
            { name: 'Pengeluaran', data: dataKeluar }
        ],
        chart: { type: 'bar', height: 280, toolbar: { show: false }, background: 'transparent', animations: { speed: 400 } },
        colors: ['#10b981', '#ef4444'], // Hijau Emerald & Merah Ruby
        plotOptions: { bar: { horizontal: false, columnWidth: '50%', borderRadius: 4 } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: labels, labels: { style: { colors: textColor } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: textColor }, formatter: (value) => "Rp " + value.toLocaleString('id-ID') } },
        legend: { labels: { colors: textColor } },
        grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
        tooltip: { theme: isDarkMode ? 'dark' : 'light', y: { formatter: function (val) { return "Rp " + val.toLocaleString('id-ID') } } }
    };

    // Render atau Update tanpa numpuk grafik
    if (window.dashboardBarChart) {
        window.dashboardBarChart.updateOptions(barOptions);
        window.dashboardBarChart.updateSeries(barOptions.series);
    } else {
        const chartDom = document.querySelector("#dashboardBarChart");
        if(chartDom) {
            window.dashboardBarChart = new ApexCharts(chartDom, barOptions);
            window.dashboardBarChart.render();
        }
    }
}

// ----------------------------------------------------
// GRAFIK 2: ANALISIS & STATISTIK (DONUT CHART)
// ----------------------------------------------------
window.updateStatistikChartFilter = function() {
    const val = document.getElementById('filterChartStatistik').value;
    window.renderStatistikChart(val);
}

window.renderStatistikChart = function(filterStr) {
    if(!document.getElementById('statistikDonutChart') || !window.localTransactionsCache) return;
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#94a3b8' : '#64748b';

    const now = new Date();
    let cutoffDate = new Date(0); 

    if (filterStr !== 'all') {
        const days = parseInt(filterStr);
        cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        cutoffDate.setHours(0,0,0,0);
    }

    const kategoriStats = {};

    window.localTransactionsCache.forEach(tx => {
        const txDate = new Date(tx.tanggal);
        if (txDate >= cutoffDate) {
            const isMutasi = (tx.kategori && (tx.kategori.toLowerCase().includes('transfer') || tx.kategori.toLowerCase().includes('mutasi'))) || 
                             (tx.catatan && (tx.catatan.toLowerCase().includes('mutasi') || tx.catatan.toLowerCase().includes('transfer')));
            
            if (tx.type === 'pengeluaran' && !isMutasi) {
                const kat = tx.kategori || 'Lainnya';
                kategoriStats[kat] = (kategoriStats[kat] || 0) + tx.nominal;
            }
        }
    });

    let donutLabels = [];
    let donutSeries = [];
    let rincianHtml = '';

    if (Object.keys(kategoriStats).length === 0) {
        donutLabels = ['Belum Ada Data'];
        donutSeries = [1];
        rincianHtml = `<p class="text-xs text-slate-400 italic text-center py-4">Belum ada catatan pengeluaran di periode waktu ini.</p>`;
    } else {
        // Urutkan dari pengeluaran paling boncos ke paling dikit
        const sortedKategori = Object.entries(kategoriStats).sort((a, b) => b[1] - a[1]);
        const totalSemua = sortedKategori.reduce((sum, item) => sum + item[1], 0);
        // Palette warna seger ala Tailwind
        const palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

        sortedKategori.forEach(([kat, total], idx) => {
            donutLabels.push(kat);
            donutSeries.push(total);
            const percent = ((total / totalSemua) * 100).toFixed(1);
            const wRna = palette[idx % palette.length];
            
            // Generate list rincian UI-nya sekalian
            rincianHtml += `
            <div class="flex justify-between items-center bg-slate-100/50 dark:bg-slate-800/50 p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${wRna}"></div>
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">${kat}</span>
                </div>
                <div class="text-right">
                    <span class="block text-xs font-bold text-slate-800 dark:text-white">Rp ${total.toLocaleString('id-ID')}</span>
                    <span class="block text-[10px] text-slate-500">${percent}%</span>
                </div>
            </div>`;
        });
    }

    const donutOptions = {
        series: donutSeries,
        labels: donutLabels,
        chart: { type: 'donut', height: 320, background: 'transparent', animations: { speed: 400 } },
        stroke: { show: false },
        colors: donutLabels[0] === 'Belum Ada Data' ? ['#cbd5e1'] : ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
        legend: { position: 'bottom', labels: { colors: textColor } },
        plotOptions: {
            pie: {
                donut: { 
                    size: '70%', 
                    labels: { show: true, name: { show: true, color: textColor }, value: { show: true, color: textColor, formatter: (val) => donutLabels[0] === 'Belum Ada Data' ? "-" : "Rp " + parseInt(val).toLocaleString('id-ID') } } 
                }
            }
        },
        tooltip: { theme: isDarkMode ? 'dark' : 'light', y: { formatter: function (val) { return donutLabels[0] === 'Belum Ada Data' ? "-" : "Rp " + val.toLocaleString('id-ID') } } }
    };

    if (window.statistikDonutChart) {
        window.statistikDonutChart.updateOptions(donutOptions);
        window.statistikDonutChart.updateSeries(donutSeries);
    } else {
        const donutDom = document.querySelector("#statistikDonutChart");
        if(donutDom) {
            window.statistikDonutChart = new ApexCharts(donutDom, donutOptions);
            window.statistikDonutChart.render();
        }
    }

    // Tembak HTML List Kategori ke UI
    const listContainer = document.getElementById('kategoriListContainer');
    if(listContainer) listContainer.innerHTML = rincianHtml;
}