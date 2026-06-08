# Al Fakhir Observation Dashboard 2026/2027

**Sistem Dashboard Observasi & Seleksi Calon Siswa Baru**  
SD/SMP Islam Modern Al Fakhir

---

## 🚀 Fitur Baru & Perubahan Arsitektur

Dashboard ini telah diperbarui ke arsitektur modern untuk performa dan skalabilitas yang lebih baik:
- 💾 **Database Modern** — Migrasi dari Google Sheets ke **PostgreSQL + Prisma ORM**.
- 🏢 **Multi-Unit Branding** — Logo dan tema dinamis otomatis (SD/SMP) berdasarkan role dan URL.
- 🧹 **Clean UI** — Antarmuka yang lebih bersih dengan penghapusan label unit yang redundan.
- ⚡ **Next.js 15+** — Menggunakan standar terbaru Next.js dengan App Router dan Server Components.
- 🔒 **Enhanced Auth** — Role-Based Access Control (RBAC) yang lebih ketat.

---

## 🛠️ Prasyarat

- Node.js 20+
- PostgreSQL Database (Local atau Cloud seperti Neon/Supabase)
- Akun Google Cloud (untuk Google OAuth)
- API Key Gemini (untuk Ringkasan AI)

---

## ⚙️ Langkah Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd observasi
npm install
```

### 2. Konfigurasi Environment
Salin `.env.example` ke `.env` dan isi variabel berikut:
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gunakan-openssl-rand-base64-32"

# Google Auth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# Gemini AI
GEMINI_API_KEY="AIza..."

# Admin Emails (Pisahkan dengan koma)
ADMIN_EMAILS="admin@alfakhir.sch.id,syarif@alfakhir.sch.id"
```

### 3. Setup Database (Prisma)
```bash
npx prisma generate
npx prisma db push
```

### 4. Jalankan Development
```bash
npm run dev
```

---

## 🌐 Deployment (Vercel)

Untuk menjalankan tes online:
1. Hubungkan repository ke Vercel.
2. Tambahkan seluruh Environment Variables di atas ke **Vercel Settings**.
3. **PENTING**: Pastikan `DATABASE_URL` menggunakan database yang bisa diakses oleh Vercel (misal: Neon PostgreSQL atau Supabase), bukan IP lokal (10.x.x.x).
4. Update **Authorized Redirect URIs** di Google Cloud Console ke:
   `https://your-domain.vercel.app/api/auth/callback/google`

---

## 📂 Struktur Data

| Tabel | Fungsi |
|-------|-----------|
| `User` | Data pengguna dan role |
| `Candidate` | Data calon siswa (Import via Webhook/Admin) |
| `InterviewerNote` | Catatan hasil observasi dari pewawancara |
| `FormAnswer` | Jawaban formulir dari orang tua/siswa |
| `AiSummary` | Hasil analisis AI terhadap jawaban formulir |

---

## 🎨 Branding Dinamis
Sistem akan otomatis mengganti logo di Header dan Sidebar:
- **Halaman SD** (`/sd`, `/admin/sd`, `/interviewer/sd`): Menggunakan emblem SD.
- **Halaman SMP** (`/smp`, `/admin/smp`, `/interviewer/smp`): Menggunakan emblem SMP.
- **Admin Pusat**: Menggunakan ikon Graduation Cap standard.

---

## 📞 Kontak & Developer
**Al Fakhir Modern Islamic School**  
Developer by **Feri**
