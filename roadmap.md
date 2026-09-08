# FinoCatat — daftar pekerjaan

## Selesai
- [x] Halaman depan baru di alamat utama (`/`) dengan penjelasan fitur, cara pakai, tanya jawab.
- [x] Halaman masuk/daftar dirombak: kartu putih, garis batas jelas, satu warna aksen biru.
- [x] Dasbor dirombak: tema terang jadi bawaan, saldo utama jadi kartu besar,
      semua kartu punya garis 1px + jarak, urutan tombol aksi harian di depan.
- [x] Semua fitur lama dipertahankan: pemasukan, pengeluaran, edit keduanya,
      cetak PDF/Excel, statistik, panel admin.
- [x] Notifikasi push diperbaiki: penerima notifikasi didaftarkan dari akar situs
      (`/firebase-messaging-sw.js`), token disimpan ke akun, pesan status tanpa `alert()`.
- [x] Pengiriman notifikasi manual/uji dari panel admin memakai token login admin,
      bukan kata sandi di dalam kode.
- [x] Semua kunci rahasia pindah ke `.env` dan penyimpanan rahasia; `.env` masuk `.gitignore`.
- [x] Alamat halaman: `/`, `/auth.html`, `/dashboard.html` (mode offline ikut diperbaiki).

## Menunggu tindakan pemilik proyek
- [ ] Ganti kunci layanan Firebase yang lama (kunci itu sempat ikut di dalam arsip yang diunggah,
      jadi harus dicabut di Firebase Console lalu diganti yang baru).
- [ ] Pasang pemicu harian jam 20:00 WIB (mis. cron-job.org) ke
      `https://<alamat-aplikasi>/api/public/broadcast?secret=<BROADCAST_SECRET>` — Lovable tidak
      punya penjadwal bawaan.
- [ ] Uji notifikasi sungguhan dari perangkat sendiri: buka aplikasi di tab terpisah
      (bukan jendela pratinjau), tekan "Aktifkan Pengingat", lalu kirim uji dari panel admin.
