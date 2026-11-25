# Dashboard Kinerja — PT Pegadaian Kantor Wilayah Manado

Aplikasi web **Dashboard Kinerja** untuk pemantauan capaian **Area → Cabang → Unit (UPC)** di lingkungan PT Pegadaian Kantor Wilayah Manado, dilengkapi autentikasi **Google OAuth & Kode OTP 6 Digit via Email** (Supabase Auth) serta pembatasan akses per wilayah untuk modul **Potensi Bisnis**.

---

## Fitur Utama

- **8 Modul / 16 Halaman Kinerja:**
  - `Home`, `Outstanding Loan`, `Kinerja Nasabah`, `Omset Penyaluran`
  - `Kualitas Kredit` *(NPL, LaR, BJDPL)*
  - `Potensi Bisnis` *(Potensi Nasabah, Potensi Gadai, Potensi Emas, Potensi Wilayah)* — **khusus user terdaftar & terkunci sesuai wilayah/area**
  - `Key Performance Indicator` *(KPI Realisasi, KPI Komitmen, KPI Area, KPI Outlet)*
  - `Rekap Kinerja Harian`
- **Filter Bertingkat & Rincian 3 Level:** Filter `Periode`, `Area`, `Cabang`, `Unit (UPC)` dengan tampilan rincian per **Area**, **Cabang**, dan **Unit** beserta status capaian formal (`Melampaui Target`, `Mencapai Target`, `Perlu Peningkatan`, `Belum Mencapai Target`).
- **Ekspor Laporan Resmi:** Unduh tabel laporan dalam format **Excel (CSV)**, **PDF**, dan **JPEG** (lengkap dengan kop laporan & waktu cetak).
- **Login Tanpa Password (Supabase Auth):**
  - **Google OAuth 2.0** (1 klik akun Google)
  - **Kode OTP 6 Digit** dikirim langsung ke email (mendukung Gmail maupun email kantor)
  - **Whitelist Email & Hak Akses Wilayah** (`user_access` + Row Level Security) yang dapat dikelola Admin Kanwil langsung dari menu **Pengaturan → Akun & Akses**.
- **Tema & Responsif:** Mode **Terang / Gelap / Ikuti Sistem**, kustomisasi palet warna & logo (**Pengaturan → Tema & Branding**), serta tampilan responsif untuk HP, tablet, dan desktop.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, TanStack Start / Router, Tailwind CSS v4, Radix UI / shadcn/ui, Recharts
- **Auth & Database:** Supabase Auth + PostgreSQL (Row Level Security)
- **Ekspor Dokumen:** `jsPDF` + `jspdf-autotable`, `html-to-image`
- **Testing & Build:** Vitest, Vite 8
- **Deployment:** Vercel (otomatis tersinkron dari branch `main` GitHub)

---

## Menjalankan Proyek di Lokal

Prasyarat: **Node.js 20+** dan **npm**.

```bash
# 1. Clone repository
git clone https://github.com/febbyyyyh/web-app-pegadaian.git
cd web-app-pegadaian

# 2. Pasang dependensi
npm install

# 3. Salin contoh environment variables
cp .env.example .env.local
# Lalu isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local

# 4. Jalankan server pengembangan (http://localhost:8080)
npm run dev
```

### Perintah Penting Lainnya

```bash
npx tsc --noEmit   # Cek tipe TypeScript
npm test           # Jalankan seluruh unit test (Vitest)
npm run build      # Build produksi
```

> **Catatan Mode Demo Lokal:** Jika `.env.local` belum diisi, aplikasi tetap dapat dijalankan dalam **Mode Demo Lokal** (menggunakan penyimpanan browser) untuk keperluan preview/pengembangan offline.

---

## Environment Variables

Tambahkan variabel berikut di `.env.local` (untuk lokal) dan di **Vercel → Project Settings → Environment Variables** (untuk produksi):

| Variabel | Keterangan |
| :--- | :--- |
| `VITE_SUPABASE_URL` | URL project Supabase (mis. `https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable / Anon public key Supabase (atau `VITE_SUPABASE_ANON_KEY`) |

> **Keamanan:** Jangan pernah commit `.env.local` atau `service_role` key ke GitHub. File `.env.local` sudah masuk `.gitignore`.

---

## Struktur File Penting

| File | Fungsi |
| :--- | :--- |
| `src/lib/formkanwil/kinerja.ts` | Daftar halaman/modul (`KINERJA_PAGES`), hierarki Area/Cabang/Unit, kalkulasi rollup, dan aturan akses Potensi Bisnis |
| `src/lib/formkanwil/navigation.ts` | Susunan menu & submenu sidebar (`buildAdminNavigation`) |
| `src/components/fk/KinerjaDashboardView.tsx` | Komponen utama tampilan dashboard (filter, kartu KPI, grafik tren, rincian Area/Cabang/Unit, ekspor) |
| `src/routes/admin/kinerja/$slug.tsx` | Route dinamis untuk seluruh halaman modul kinerja (`/admin/kinerja/<slug>`) |
| `src/lib/supabase.ts` | Inisialisasi klien Supabase |
| `src/lib/formkanwil/auth.ts` | Logika login Google OAuth, Kode OTP 6 digit, sinkronisasi sesi, dan pengelolaan tabel `user_access` |
| `src/components/fk/access/LoginDialog.tsx` | Popup login Google + input OTP 6 digit |
| `src/routes/admin/users.tsx` | Halaman **Pengaturan → Akun & Akses** (kelola whitelist email Admin & User Wilayah) |
| `src/routes/admin/settings/theme.tsx` | Halaman **Pengaturan → Tema & Branding** |
| `src/lib/formkanwil/report-export.ts` | Utilitas ekspor laporan Excel (CSV), PDF, dan JPEG |

---

## Panduan Menambah atau Mengubah Menu Sidebar

Menu sidebar dan halaman modul sudah bersifat terpusat (*schema-driven*), sehingga **tidak perlu membuat file route baru** untuk menambah halaman kinerja standar. Cukup edit **2 file**:

### 1. Daftarkan halaman di `src/lib/formkanwil/kinerja.ts`
Tambahkan entri baru pada objek `KINERJA_PAGES`:

```ts
"nama-slug-baru": {
  slug: "nama-slug-baru",
  title: "Judul Halaman Baru",
  groupTitle: "Nama Grup (opsional)",
  description: "Deskripsi singkat indikator pada halaman ini.",
  baseMultiplier: 1.0,
  groupRestricted: false, // ubah ke true jika hanya boleh diakses sesuai wilayah
},
```

### 2. Tambahkan menu di `src/lib/formkanwil/navigation.ts`
Tambahkan item pada `buildAdminNavigation` (sebagai menu utama atau submenu di dalam `children`):

```ts
{
  id: "kinerja-nama-slug-baru",
  label: "Judul Menu Baru",
  icon: BarChart3,
  link: { to: "/admin/kinerja/$slug", params: { slug: "nama-slug-baru" } },
},
```

### 3. Verifikasi & Deploy
```bash
npx tsc --noEmit
npm test
git add .
git commit -m "Tambah menu baru di sidebar"
git push origin main
```
Vercel akan otomatis mendeteksi commit baru di branch `main` dan menayangkan perubahannya dalam ±1 menit.

---

## Autentikasi, Hak Akses & Catatan Produksi

1. **Whitelist Email (`public.user_access`):**
   - Hanya email yang terdaftar dan berstatus `active = true` di tabel `user_access` yang dapat masuk.
   - **Admin Kanwil** (`role = 'admin'`) memiliki akses penuh ke semua wilayah serta menu **Pengaturan**.
   - **User Wilayah** (`role = 'user'`) memiliki akses **Potensi Bisnis** yang terkunci khusus pada `assigned_area`-nya (`Manado`, `Gorontalo`, `Palu`, `Kendari`, atau `Makassar`).
   - Penambahan/perubahan Admin maupun User Wilayah dapat dilakukan langsung dari menu **Pengaturan → Akun & Akses** tanpa perlu menjalankan SQL manual.
2. **Custom SMTP (untuk pemakaian operasional banyak pegawai):**
   - Pengirim email bawaan Supabase dibatasi untuk pengujian (±2 email/jam).
   - Untuk operasional rutin seluruh pegawai, aktifkan **Custom SMTP** di **Supabase → Project Settings → Authentication → SMTP Settings** menggunakan server SMTP kantor Pegadaian atau layanan SMTP seperti **Brevo / Resend**.
3. **Google OAuth Production:**
   - Saat siap digunakan seluruh pegawai, lengkapi halaman **Branding** di **Google Cloud Console → Google Auth Platform** lalu klik **Publish app** di menu **Audience**.
