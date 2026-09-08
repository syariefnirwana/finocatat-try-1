# Rombak FinoCatat: tampilan modern gaya BRImo + notifikasi diperbaiki

Kode kamu dipertahankan (logika transaksi, admin, cetak PDF/Excel, Firebase kamu sendiri). Yang dirombak adalah tampilan, penataan, dan bagian pengiriman notifikasi.

## Cara kerja setelah pindah ke Lovable

- Aplikasi kamu tetap berupa halaman HTML + JavaScript seperti sekarang, dijalankan di Lovable:
  - Halaman depan (beranda/landing) baru di alamat `/`
  - Halaman masuk & daftar di `/auth/`
  - Dashboard di `/dashboard/` — semua file JS kamu (transaksi, admin, statistik, PDF) tetap dipakai
- Database tetap Firebase milikmu. Semua kunci dipindah ke file `.env` dan `.env` dimasukkan ke `.gitignore`.
- File kunci Firebase Admin yang tadinya tertulis langsung di dalam kode dihapus dari kode dan dibaca dari `.env`. Kunci lamamu sudah terekspos, jadi sebaiknya kamu buat kunci baru di Firebase lalu tempel sekali ke `.env`.

## Bahasa desain (patokan SKILL.md + rasa BRImo)

- Satu warna aksen saja (biru tenang, saturasi dijaga), latar netral hangat—tidak ada gradasi ungu/biru khas template AI.
- Font berkarakter (Outfit/Geist) untuk judul, angka memakai angka tabular supaya rapi dan mudah dibaca.
- Setiap kartu punya jarak (gap) jelas dan garis batas 1px yang terlihat di semua sisi — ini keluhan utama dari roasting kemarin.
- Sudut membulat konsisten, bayangan lembut bernuansa warna latar (bukan hitam pekat).
- Semua tombol punya keadaan hover, ditekan (sedikit mengecil), dan cincin fokus untuk keyboard.
- Ada tampilan kosong ("belum ada catatan"), tampilan sedang memuat (kerangka abu, bukan spinner), dan pesan error di dalam form — tidak lagi memakai pop-up bawaan browser.

## Yang dirombak

1. **Beranda / landing** — baru: penjelasan singkat aplikasi, cara pakai 3 langkah, tombol masuk/daftar, ikon dan meta sosial.
2. **Masuk & daftar** — form bersih satu kolom, validasi langsung di kolom, tombol lihat kata sandi, pesan salah yang jelas.
3. **Dashboard** — dirombak total dengan pola BRImo:
   - Kartu saldo utama di atas (angka besar, bisa disembunyikan)
   - Baris aksi cepat berikon: Pemasukan, Pengeluaran, Cetak, Statistik — user langsung paham fungsinya
   - Ringkasan pemasukan/pengeluaran bulan ini sebagai dua kartu terpisah bergaris
   - Riwayat transaksi sebagai daftar baris (bukan tabel padat) dengan ikon kategori, tanggal, nominal berwarna; tetap ada halaman berikutnya (pagination)
   - Tab bawah untuk HP, navigasi atas untuk layar lebar
4. **Statistik** — grafik tetap, dibungkus kartu bergaris, filter dibuat berupa pil pilihan.
5. **Profil & pengaturan** — dikelompokkan jadi daftar baris rapi, bukan tumpukan kartu tanpa jarak.
6. **Panel admin (khusus admin)** — semua fitur dipertahankan (pengaturan aplikasi, pengumuman, banner, co-admin, daftar user, laporan, broadcast, pusat notifikasi), ditata ulang jadi beberapa bagian bertajuk dengan jarak jelas.

Fitur yang dijaga tetap jalan: pemasukan, pengeluaran, edit pemasukan, edit pengeluaran, cetak PDF/Excel, panel admin.

## Perbaikan notifikasi (penyebab gagal kemarin)

Penyebabnya: pendaftaran notifikasi salah tempat, jadi HP/laptop user tidak pernah terdaftar, sehingga tidak ada yang bisa dikirimi.

- Menambahkan file penerima notifikasi di akar situs (`/firebase-messaging-sw.js`) dan mendaftarkannya saat user menekan "Aktifkan Notifikasi".
- Kode notifikasi yang lama (di dalam folder `js`) tidak pernah aktif — diganti dengan pendaftaran yang benar, plus kunci VAPID dibaca dari `.env`.
- Token perangkat user disimpan ke Firebase, dan token mati otomatis dihapus saat gagal kirim.
- Izin notifikasi tidak bisa muncul di dalam jendela pratinjau Lovable; jadi ditambahkan pesan yang meminta user membuka aplikasi di tab sendiri.
- Tombol "Blast ke semua user" di panel admin dihubungkan ke pengirim baru di Lovable, dan menampilkan hasil: berapa terkirim, berapa gagal.
- Notifikasi otomatis jam 20:00 (WIB): endpoint harian disiapkan di `/api/public/broadcast` dengan kunci rahasia. Karena Lovable tidak punya penjadwal bawaan, aku siapkan endpointnya lalu beri kamu langkah singkat mendaftarkan jadwal gratis (cron-job.org) satu kali; judul dan isi pesannya tetap diatur dari panel admin.

## Catatan teknis

- Pengirim notifikasi dibuat sebagai server route Lovable (`src/routes/api/public/broadcast.ts`) yang memanggil FCM HTTP v1. `firebase-admin` tidak dipakai karena tidak jalan di runtime Lovable; token akses dibuat dengan menandatangani JWT service account memakai Web Crypto.
- Variabel: `FIREBASE_SA_EMAIL`, `FIREBASE_SA_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`, `BROADCAST_SECRET`, plus `VITE_FIREBASE_*` untuk sisi browser. Semua di `.env`, `.env` masuk `.gitignore`.
- File JS lama (`state.js`, `ui.js`, `transaksi.js`, `admin.js`, `statistik.js`, `pdf-generator.js`, `auth.js`) dipertahankan; perubahan hanya pada bagian yang menyentuh tampilan dan notifikasi.
- Folder `beta/` dan `vercel.json` tidak dipakai lagi setelah pindah; `api/broadcast.js` versi Vercel diganti server route di atas.
