<div align="center">

# Al Fakhir Observation Dashboard

**Sistem observasi dan seleksi penerimaan siswa baru**<br>
SD & SMP Islam Modern Al Fakhir · Tahun Ajaran 2026/2027

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)

</div>

Aplikasi web untuk mengelola proses PPDB dari pendaftaran sampai surat hasil: orang tua dan siswa mengisi formulir lewat QR, siswa SMP mengerjakan tes akademik, pewawancara mencatat hasil observasi, lalu admin menerbitkan raport PDF.

## Daftar isi

- [Fitur](#fitur)
- [Alur kerja](#alur-kerja)
- [Teknologi](#teknologi)
- [Memulai](#memulai)
- [Variabel lingkungan](#variabel-lingkungan)
- [Peran dan hak akses](#peran-dan-hak-akses)
- [Raport PDF](#raport-pdf)
- [Keamanan](#keamanan)
- [Struktur proyek](#struktur-proyek)
- [Model data](#model-data)
- [Deployment](#deployment)
- [Pemecahan masalah](#pemecahan-masalah)

## Fitur

**Admin**
- **Ringkasan**: statistik, grafik aktivitas 7 hari, dan target observasi.
- **Daftar siswa**: cari dan filter, tambah, edit, hapus, impor Excel, kode QR formulir, ubah ruangan, pewawancara, dan gelombang langsung di tabel. Data terbaru tampil lebih dulu dan data lama bisa dibuka lewat filter periode.
- **Observasi dan Akademik**: kelola soal wawancara orang tua dan siswa per jenjang, serta bank soal tes akademik.
- **Catatan** dan **Monitor Pewawancara**: pantau progres setiap pewawancara dari data sebenarnya.
- **Pengguna**: tambah akun, ganti password, hapus akun.
- **Riwayat aktivitas**: log siapa melakukan apa, kapan, dan dari IP mana. Disimpan 1 tahun.
- **Rekap Hasil**: tabel seperti Excel, satu baris per nama dan satu kolom per pertanyaan atau indikator. SD: jawaban orang tua dan raport observasi (23 indikator). SMP: jawaban orang tua dan jawaban siswa. Ada filter periode, guru, status pengisian, dan pencarian (termasuk isi jawaban), serta baris ringkasan di bawah tabel. Admin dan pewawancara sama-sama dapat melihatnya.
- **Raport PDF**: unduh satuan atau massal (zip), dikunci dengan NIM siswa.

**Pewawancara**
- Hanya melihat siswa yang ditugaskan kepadanya.
- Mengisi catatan observasi. Setelah dikirim, catatan terkunci.
- Siswa SD: mengisi dan menyimpan penilaian raport (23 indikator), dapat diedit kembali kapan saja.
- **Rekap Hasil**: melihat hasil **semua siswa** (bukan hanya miliknya) dalam tabel seperti Excel. Detail siswa guru lain tidak bisa dibuka.
- Ringkasan profil siswa oleh Gemini AI, dibuat saat pewawancara menekan tombolnya di halaman detail siswa.

**Publik (tanpa akun)**
- Orang tua dan siswa mengisi formulir lewat tautan atau QR siswa.
- Siswa SMP mengerjakan tes akademik.

## Alur kerja

```mermaid
flowchart LR
    A[Admin menambah<br/>atau impor siswa] --> B[QR formulir<br/>dibagikan]
    B --> C[Orang tua dan siswa<br/>mengisi formulir]
    C -.-> D[Ringkasan AI<br/>opsional, lewat tombol]
    B --> E[Siswa SMP<br/>mengerjakan tes]
    C --> F[Pewawancara<br/>mengisi catatan]
    E --> F
    F --> G[Catatan terkunci]
    G --> H[Admin mengunduh<br/>raport PDF]
```

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions), React 19 |
| Bahasa | TypeScript |
| Database | PostgreSQL (Neon) lewat Prisma 6 |
| Autentikasi | NextAuth v5 (beta), login username dan password |
| UI | Tailwind CSS 4, Recharts, Framer Motion, lucide-react |
| Dokumen | jsPDF (raport), JSZip, SheetJS (impor Excel) |
| AI | Google Gemini 2.5 Flash |
| Validasi | Zod |

> Next.js 16 punya perubahan API dan konvensi. Baca panduan di `node_modules/next/dist/docs/` sebelum mengubah routing atau pengambilan data.

## Memulai

### Prasyarat

- Node.js 20.9 atau lebih baru (disarankan 22 LTS)
- Database PostgreSQL, lokal atau cloud seperti [Neon](https://neon.tech)
- API key [Gemini](https://aistudio.google.com/apikey) (untuk ringkasan AI)

### 1. Pasang dependensi

```bash
git clone https://github.com/AlfakhirSchool/ObservasiSDSMP.git
cd ObservasiSDSMP
npm install
```

### 2. Siapkan environment

Buat file `.env` di akar proyek. Prisma CLI hanya membaca `.env`, sedangkan Next.js membaca `.env` dan `.env.local`.

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
NEXTAUTH_SECRET="isi-dengan-hasil-openssl-rand-base64-32"
GEMINI_API_KEY="AIza..."
```

Daftar lengkap ada di [Variabel lingkungan](#variabel-lingkungan).

### 3. Siapkan database

```bash
npx prisma generate
npx prisma db push
```

Proyek ini memakai `prisma db push`. Folder `prisma/migrations` adalah sisa dari SQLite dan tidak dipakai, jadi jangan menjalankan `prisma migrate dev`.

### 4. Buat admin pertama

Tidak ada akun bawaan. Buat dengan skrip:

```bash
node prisma/set-user.cjs <username> <ROLE> "<Nama Tampilan>" [password]

# contoh
node prisma/set-user.cjs admin ADMIN "Nama Admin" "PasswordKuat123"
```

- `ROLE`: `ADMIN`, `ADMIN_SD`, `ADMIN_SMP`, atau `INTERVIEWER`.
- Kalau password dikosongkan, skrip membuat password acak dan mencetaknya.
- Untuk `INTERVIEWER`, nama tampilan **harus sama persis** dengan nama di kolom Pewawancara pada data siswa. Itu yang menentukan siswa mana yang terlihat.
- Akun berikutnya bisa dibuat dari halaman **Pengguna** di dashboard.

> `prisma/seed.ts` adalah skrip lama yang membuat admin tanpa username dan password, jadi akun itu tidak bisa dipakai login. Gunakan `set-user.cjs`.

### 5. Jalankan

```bash
npm run dev
```

Buka <http://localhost:3000> lalu login.

### Skrip npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | `prisma generate` lalu `next build` |
| `npm start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Pemeriksaan tipe (tidak ada skrip khusus) |

## Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi PostgreSQL. Untuk Vercel gunakan database yang bisa dijangkau dari internet. |
| `NEXTAUTH_SECRET` | Ya | Kunci acak untuk sesi login. Dipakai juga untuk membuat token QR siswa, jadi mengganti nilainya membatalkan token yang sudah dicetak. |
| `GEMINI_API_KEY` | Untuk AI | Ringkasan AI. Tanpa ini tombol ringkasan gagal, bagian lain tetap jalan. |
| `NEXTAUTH_URL` | Tidak | URL publik aplikasi. |
| `WEBHOOK_SECRET` | Tidak | Rahasia untuk `/api/webhook/form-submission`. |
| `EXTERNAL_API_KEY` | Tidak | Kunci untuk `/api/external/candidates`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_SHEET_ID` | Tidak | Peninggalan integrasi Google Sheets. Hanya dipakai ekspor lama. |

Jangan pernah meng-commit `.env*` atau file JSON service account. Keduanya sudah ada di `.gitignore`.

## Peran dan hak akses

Login memakai **username dan password**, bukan akun Google. Pemeriksaan peran dilakukan di server (halaman, API route, dan Server Action), bukan hanya di tampilan.

| Kemampuan | Admin Pusat | Admin SD / SMP | Pewawancara | Publik |
|---|:-:|:-:|:-:|:-:|
| Dashboard admin | ✅ | ✅ | ❌ | ❌ |
| Kelola siswa dan soal | ✅ | ✅ | ❌ | ❌ |
| Pengguna dan Monitor Pewawancara | ✅ | ❌ | ❌ | ❌ |
| Unduh raport PDF | ✅ | ✅ | ❌ | ❌ |
| Lihat **Rekap Hasil** (semua siswa, tanpa NIM) | ✅ | ✅ | ✅ | ❌ |
| Buka detail siswa dari rekap | ✅ (semua) | ✅ (semua) | hanya siswa miliknya | ❌ |
| Isi catatan observasi | ✅ | ✅ | ✅ (siswa miliknya) | ❌ |
| Ringkasan AI | ✅ | ✅ | ✅ (siswa miliknya) | ❌ |
| Isi formulir dan tes siswa | ✅ | ✅ | ✅ | ✅ (hanya tahu ID siswa) |

Pewawancara tidak bisa mengunduh apa pun. Mereka hanya mengisi catatan observasi.

## Raport PDF

Surat "Hasil Observasi dan Asesmen PPDB" dibuat di browser dengan jsPDF mengikuti template sekolah (font Noto Serif, A4 satu halaman).

- **Satuan**: ikon dokumen di baris siswa membuka halaman `/surat/<id>`. Semua isian bisa diubah sebelum diunduh, dan pratinjau berubah langsung.
- **Massal**: tombol **Unduh Raport** di Daftar Siswa. Pilih gelombang, periksa NIM dan data kembar, pilih siswa, lalu unduh satu zip. Nomor surat disusun dari format seperti `{no}/B-{unit}/AL-FAKHIR/II/2026`.
- **Kunci PDF**: kata sandi untuk membuka setiap PDF adalah **NIM siswa**. Siswa tanpa NIM tidak bisa dibuatkan raport, jadi isi NIM lewat dialog Edit atau langsung di dialog unduh.
- **Keputusan** diisi dari rekomendasi pewawancara (Terima, Pertimbangkan, Tolak).
- **Raport SD** berbeda bentuk dari surat SMP, lihat bagian berikutnya.

### Raport observasi SD

PDF dua bahasa (Inggris dan Indonesia, sekitar 8 halaman): deskripsi umum, lalu tabel hasil 23 indikator di 4 aspek (Kognitif, Motorik Halus, Motorik Kasar, Al-Qur'an) dengan catatan tiap aspek, keputusan, dan tanda tangan Kepala Sekolah serta Ketua Pelaksana.

- **Guru mengisi, admin mengunduh.** Di halaman detail siswa SD, kartu **Raport Observasi SD** berisi asal sekolah, penilaian tiap indikator (Berkembang / Belum Berkembang; untuk Al-Qur'an Berkembang Baik / Berkembang), dan catatan per aspek. Guru menekan **Simpan** dan boleh mengubahnya lagi kapan saja. Isian ini tidak ikut terkunci seperti catatan observasi.
- **Predikat aspek** dihitung otomatis: "Belum Berkembang" bila setidaknya separuh indikator aspek itu belum berkembang. Catatan aspek terisi otomatis sesuai predikat; guru bisa menulis sendiri (Indonesia). Versi Inggris selalu dari templat, admin dapat mengubahnya di editor.
- **Admin**: ikon dokumen di daftar siswa membuka editor dengan pratinjau PDF asli. Untuk massal, buka **Unduh Raport** lalu pilih tab **Raport SD**. Siswa hanya "Siap" bila NIM, keputusan pewawancara, dan ke-23 indikator sudah terisi. PDF dikunci dengan NIM seperti raport SMP.
- **Tanda tangan dan stempel** tidak disimpan di repo (repo ini publik, siapa pun bisa mengunduh dan memalsukannya). Gambar PNG disimpan di tabel `RaportAsset` dan hanya dimuat admin lewat `/api/raport-assets/<key>`. Pasang atau ganti dengan:

  ```bash
  node prisma/set-asset.cjs sd-ttd-kepsek  tanda-tangan-kepala-sekolah.png
  node prisma/set-asset.cjs sd-stempel     stempel.png
  node prisma/set-asset.cjs sd-ttd-ketua   tanda-tangan-ketua-pelaksana.png
  ```

  Bila belum dipasang, raport tetap terbuat dengan ruang tanda tangan kosong.
- Huruf "ā" pada "Alhamdulillāh" tercetak "a" karena font yang disematkan tidak memuatnya.

## Keamanan

- Password disimpan sebagai hash scrypt dengan salt. Perbandingan berjalan dalam waktu konstan.
- Login dibatasi: 5 percobaan gagal per username dalam 15 menit, dan 100 per IP (longgar karena banyak guru memakai satu Wi-Fi sekolah). Sesi berlaku 12 jam.
- Semua Server Action dan API route memeriksa peran. Pewawancara hanya bisa mengakses siswa yang ditugaskan kepadanya.
- Endpoint publik (formulir, tes akademik) memvalidasi input dengan Zod, dibatasi lajunya per IP, dan menolak pengiriman setelah observasi selesai. Hasil tes pertama tidak bisa ditimpa. **Belum ada otentikasi pengirim**: lihat catatan di bawah.
- Kunci jawaban tes tidak pernah dikirim ke browser.
- Header keamanan dipasang (anti-iframe, anti-sniffing, HSTS, dan lainnya).
- Semua aktivitas penting masuk ke **Riwayat aktivitas**. Password dan NIM tidak pernah dicatat.

> **Catatan akses formulir dan tes publik.** Token QR dan pencocokan nomor HP orang tua sudah ada di `src/lib/candidate-auth.ts`, tetapi `/api/form/submit` dan `/api/academic/submit` saat ini tidak memeriksanya (verifikasi nomor HP dihapus pada commit `0694124`). Artinya siapa pun yang mengetahui ID siswa dapat mengirim formulir atau tes atas namanya, selama observasinya belum selesai dan tesnya belum pernah dikirim. ID siswa acak dan sulit ditebak, tetapi tidak rahasia bila tautan atau QR tersebar. Jika ini perlu ditutup, wajibkan `verifyCandidateToken` di kedua route.

## Struktur proyek

```
src/
├── app/
│   ├── (auth)/login            Halaman login
│   ├── (dashboard)/admin/      Ringkasan, siswa, observasi, akademik,
│   │                           catatan, monitor, pengguna, riwayat
│   ├── interviewer/            Dashboard dan catatan pewawancara
│   ├── form/  academic/        Formulir dan tes siswa (publik)
│   ├── surat/[id]/             Raport PDF
│   └── api/                    Route handler
├── components/                 Komponen UI dan layout
├── lib/
│   ├── auth.ts                 NextAuth (login, sesi, peran)
│   ├── actions.ts              Server Action siswa dan soal
│   ├── user-actions.ts         Server Action pengguna
│   ├── guards.ts               assertAdmin, perbandingan rahasia
│   ├── rate-limit.ts           Pembatas laju berbasis database
│   ├── activity*.ts            Riwayat aktivitas
│   ├── surat*.ts               Data dan pembuat PDF surat SMP
│   ├── raport-sd*.ts           Data, aturan, dan pembuat PDF raport SD
│   ├── candidate-auth.ts       Token akses siswa (dibuat, belum diperiksa di API publik)
│   └── gemini.ts               Ringkasan AI
prisma/
├── schema.prisma               Skema database
├── set-user.cjs                Buat atau ubah akun login
└── set-asset.cjs               Simpan tanda tangan/stempel raport SD ke database
public/fonts/                   Noto Serif untuk PDF
```

## Model data

| Model | Fungsi |
|---|---|
| `User` | Akun login (username, hash password, peran) |
| `Candidate` | Calon siswa: jenjang, ruangan, pewawancara, tahun ajaran, gelombang, NIM |
| `FormQuestion`, `FormAnswer` | Soal wawancara dan jawaban orang tua atau siswa |
| `AcademicQuestion`, `AcademicResponse`, `AcademicTestResult` | Bank soal, jawaban, dan nilai tes SMP |
| `InterviewerNote` | Catatan observasi (satu per siswa, terkunci setelah dikirim) |
| `AiSummary` | Ringkasan AI per siswa |
| `ActivityLog` | Riwayat aktivitas |
| `RateLimitHit` | Penghitung pembatas laju |
| `RaportAsset` | Gambar tanda tangan dan stempel raport SD (disimpan di database, bukan di repo) |

## Deployment

Target yang dipakai adalah Vercel dengan database Neon.

1. Hubungkan repository ke Vercel.
2. Isi environment variable di **Settings → Environment Variables** (minimal `DATABASE_URL`, `NEXTAUTH_SECRET`, `GEMINI_API_KEY`).
3. `DATABASE_URL` harus mengarah ke database yang bisa dijangkau dari internet, bukan IP lokal.
4. Build memakai `npm run build` (sudah menjalankan `prisma generate`).
5. Perubahan skema tidak ikut otomatis. Jalankan `npx prisma db push` ke database produksi secara sadar, lalu deploy.

Branch `main` adalah cabang yang tayang. Commit ke `main` bisa langsung memicu deploy, jadi pastikan `npx tsc --noEmit` bersih sebelum push.

## Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Halaman error `Cannot read properties of undefined` untuk model baru | Prisma Client di memori server dev sudah usang setelah `db push`. Hentikan dan jalankan ulang `npm run dev`. |
| Login ditolak "Terlalu banyak percobaan gagal" | Pembatas laju aktif. Tunggu 15 menit. |
| Tombol raport tidak menghasilkan PDF | NIM siswa masih kosong, atau siswa belum punya tes (SMP) atau keputusan pewawancara. Dialog Unduh Raport menandai alasannya per siswa. |
| Pewawancara tidak melihat siswa | Nama akunnya tidak sama persis dengan nama di kolom Pewawancara pada data siswa. |
| QR atau tautan lama berhenti bekerja | `NEXTAUTH_SECRET` diganti. Token lama tidak berlaku lagi, bagikan QR baru. |
| `npm` memperingatkan versi Node | Hanya peringatan jika Node 20 dengan npm terbaru. Aplikasi tetap berjalan. Gunakan Node 22 LTS untuk menghilangkannya. |
| Banyak halaman gagal dengan `P2024: Timed out fetching a new connection from the connection pool` | Kolam koneksi Prisma habis (biasanya karena database jauh dan banyak pengguna bersamaan). Kolam sudah dilebarkan di `src/lib/prisma.ts` (30 koneksi, tunggu 45 dtk) bila belum diatur di `DATABASE_URL`; tambahkan `connection_limit` dan `pool_timeout` di URL untuk mengubahnya. Setelah macet, mulai ulang server. |

## Lisensi

Proyek internal sekolah. Belum ada lisensi open-source, sehingga semua hak dilindungi.

---

<div align="center">

**Al Fakhir Modern Islamic School**<br>
Dikembangkan oleh Feri

</div>
