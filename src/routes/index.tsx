import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinoCatat — Catat Pemasukan & Pengeluaran Harian" },
      {
        name: "description",
        content:
          "FinoCatat bantu kamu mencatat pemasukan dan pengeluaran dalam hitungan detik, lihat ringkasan saldo, dan unduh laporan PDF atau Excel kapan saja.",
      },
      { property: "og:title", content: "FinoCatat — Catat Pemasukan & Pengeluaran Harian" },
      {
        property: "og:description",
        content:
          "Pencatatan keuangan pribadi yang sederhana: saldo jelas, riwayat rapi, laporan siap unduh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const fitur = [
  {
    ikon: "＋",
    judul: "Catat dalam 2 ketukan",
    isi: "Tombol pemasukan dan pengeluaran ada paling depan. Isi nominal, pilih kategori, selesai.",
  },
  {
    ikon: "≡",
    judul: "Saldo & riwayat jelas",
    isi: "Saldo utama tampil besar di atas, riwayat transaksi tersusun rapi dengan garis pemisah yang terlihat.",
  },
  {
    ikon: "✎",
    judul: "Bisa diperbaiki kapan saja",
    isi: "Salah nominal atau tanggal? Edit pemasukan dan pengeluaran langsung dari daftar riwayat.",
  },
  {
    ikon: "↓",
    judul: "Laporan PDF & Excel",
    isi: "Unduh rekap per periode untuk arsip pribadi, pengajuan, atau sekadar evaluasi bulanan.",
  },
  {
    ikon: "◔",
    judul: "Pengingat tiap malam",
    isi: "Notifikasi otomatis jam 20:00 mengingatkan mencatat, jadi tidak ada transaksi yang terlewat.",
  },
  {
    ikon: "⚙",
    judul: "Panel pengelola",
    isi: "Pengumuman, pengguna, dan laporan dikelola di satu panel khusus untuk peran admin.",
  },
];

const langkah = [
  { no: "01", judul: "Buat akun", isi: "Daftar dengan email dan username, tanpa biaya." },
  { no: "02", judul: "Catat transaksi", isi: "Masukkan pemasukan dan pengeluaran harianmu." },
  { no: "03", judul: "Baca ringkasannya", isi: "Lihat saldo, grafik, lalu unduh laporannya." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink antialiased">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <a href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent-strong bg-accent text-sm font-bold text-accent-ink">
              F
            </span>
            <span className="text-base font-bold tracking-tight">FinoCatat</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
            <a className="transition-colors hover:text-accent" href="#fitur">
              Fitur
            </a>
            <a className="transition-colors hover:text-accent" href="#cara">
              Cara pakai
            </a>
            <a className="transition-colors hover:text-accent" href="#tanya">
              Tanya jawab
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/auth.html"
              className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas-2 active:translate-y-px"
            >
              Masuk
            </a>
            <a
              href="/auth.html"
              className="rounded-xl border border-accent-strong bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink shadow-accent transition-colors hover:bg-accent-strong active:translate-y-px"
            >
              Daftar gratis
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-12 md:pt-20">
          <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center rounded-full border border-line bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                Pencatatan keuangan pribadi
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
                Tahu ke mana uangmu pergi, setiap hari.
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                FinoCatat mencatat pemasukan dan pengeluaran dengan tampilan yang tenang dan mudah
                dibaca. Saldo di depan, riwayat rapi, laporan siap unduh kapan pun kamu butuh.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="/auth.html"
                  className="rounded-xl border border-accent-strong bg-accent px-5 py-3 text-sm font-semibold text-accent-ink shadow-accent transition-colors hover:bg-accent-strong active:translate-y-px"
                >
                  Mulai mencatat
                </a>
                <a
                  href="/dashboard.html"
                  className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold transition-colors hover:bg-canvas-2 active:translate-y-px"
                >
                  Lihat dasbor
                </a>
              </div>
              <p className="mt-4 text-xs text-ink-soft">
                Gratis untuk pemakaian pribadi · Data tersimpan aman di akunmu
              </p>
            </div>

            {/* Pratinjau kartu saldo */}
            <div className="grid gap-4">
              <div className="rounded-2xl border border-accent-strong bg-gradient-accent p-6 shadow-accent">
                <p className="text-xs font-medium text-accent-ink/80">Saldo saat ini</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-accent-ink">
                  Rp 4.820.000
                </p>
                <div className="mt-5 flex gap-2">
                  <span className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-accent-ink">
                    + Pemasukan
                  </span>
                  <span className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-accent-ink">
                    − Pengeluaran
                  </span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <p className="text-xs text-ink-soft">Pemasukan bulan ini</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-up">Rp 7.150.000</p>
                </div>
                <div className="rounded-2xl border border-line bg-surface p-5">
                  <p className="text-xs text-ink-soft">Pengeluaran bulan ini</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-down">Rp 2.330.000</p>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="mb-3 text-xs font-semibold text-ink-soft">Riwayat terakhir</p>
                <ul className="text-sm">
                  {[
                    ["Gaji bulanan", "+ 6.500.000", "text-up"],
                    ["Belanja dapur", "− 312.000", "text-down"],
                    ["Transportasi", "− 48.000", "text-down"],
                  ].map(([nama, nilai, warna]) => (
                    <li
                      key={nama}
                      className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0 last:pb-0"
                    >
                      <span className="text-ink-soft">{nama}</span>
                      <span className={`font-semibold tabular-nums ${warna}`}>{nilai}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" className="border-y border-line bg-surface py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Semua yang dibutuhkan untuk disiplin mencatat
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] text-ink-soft">
              Setiap bagian dibuat supaya langsung terbaca fungsinya — tanpa istilah rumit, tanpa
              menu bertingkat.
            </p>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {fitur.map((f) => (
                <article
                  key={f.judul}
                  className="rounded-2xl border border-line bg-canvas p-6 transition-colors hover:border-line-strong"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-accent-soft text-base font-bold text-accent">
                    {f.ikon}
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{f.judul}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.isi}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Cara pakai */}
        <section id="cara" className="py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Tiga langkah saja</h2>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {langkah.map((l) => (
                <div key={l.no} className="rounded-2xl border border-line bg-surface p-6">
                  <span className="text-xs font-bold tabular-nums tracking-[0.15em] text-accent">
                    {l.no}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{l.judul}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{l.isi}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tanya jawab */}
        <section id="tanya" className="border-y border-line bg-surface py-16">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Tanya jawab singkat</h2>
            <div className="mt-8 grid gap-4">
              {[
                [
                  "Apakah gratis?",
                  "Ya, pencatatan pribadi bisa dipakai gratis. Kamu hanya perlu membuat akun.",
                ],
                [
                  "Bisa dipakai di ponsel?",
                  "Bisa. Tampilannya menyesuaikan layar ponsel, tablet, maupun komputer, dan bisa dipasang di layar utama.",
                ],
                [
                  "Bagaimana pengingat hariannya?",
                  "Aktifkan pengingat dari dasbor, lalu notifikasi akan dikirim setiap jam 20:00 ke perangkat yang kamu daftarkan.",
                ],
                [
                  "Apakah datanya bisa diunduh?",
                  "Bisa. Laporan tersedia dalam bentuk PDF dan Excel per periode yang kamu pilih.",
                ],
              ].map(([t, j]) => (
                <details key={t} className="group rounded-2xl border border-line bg-canvas p-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {t}
                      <span className="text-ink-soft transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{j}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Penutup */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="rounded-2xl border border-accent-strong bg-gradient-accent p-8 text-center shadow-accent md:p-12">
              <h2 className="text-2xl font-bold tracking-tight text-accent-ink md:text-3xl">
                Mulai catat malam ini
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-accent-ink/85">
                Butuh kurang dari satu menit untuk membuat akun dan mencatat transaksi pertamamu.
              </p>
              <a
                href="/auth.html"
                className="mt-7 inline-block rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink transition-transform hover:bg-canvas-2 active:translate-y-px"
              >
                Buat akun gratis
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} FinoCatat. Catat keuangan dengan tenang.</p>
          <div className="flex gap-5">
            <a className="hover:text-accent" href="/auth.html">
              Masuk
            </a>
            <a className="hover:text-accent" href="/dashboard.html">
              Dasbor
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
