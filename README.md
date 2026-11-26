# Dashboard Kinerja Regional — Demo Portofolio

Aplikasi web **Dashboard Kinerja Regional** (versi **Demo Portofolio** menggunakan 100% data simulasi) untuk pemantauan capaian **Area → Cabang → Unit (UPC)**, dilengkapi halaman login terproteksi (**Google OAuth 2.0 & Kode OTP 6 Digit via Email**), kontrol akses berbasis wilayah, mode gelap/terang, serta ekspor laporan **Excel (CSV), PDF, dan JPEG**.

> **Catatan Privasi:** Seluruh angka, nama unit, dan statistik pada repository demo ini merupakan **data simulasi** untuk keperluan portofolio dan tidak memuat data internal perusahaan mana pun.

---

## Fitur Utama

- **Halaman Login Terproteksi + Akses Demo 1 Klik:** Halaman awal menampilkan layar autentikasi (**Google OAuth** & **Kode OTP 6 Digit via Email** berbasis Supabase Auth) beserta tombol **Masuk Demo (Data Simulasi)** dan **Demo Akses Terbatas Wilayah** untuk memudahkan peninjauan.
- **8 Modul / 16 Halaman Kinerja:** `Home`, `Outstanding Loan`, `Kinerja Nasabah`, `Omset Penyaluran`, `Kualitas Kredit` *(NPL, LaR, BJDPL)*, `Potensi Bisnis` *(akses terkunci per wilayah)*, `Key Performance Indicator`, dan `Rekap Kinerja Harian`.
- **Filter Bertingkat & Agregasi 3 Level:** Filter `Periode`, `Area`, `Cabang`, dan `Unit (UPC)` dengan rincian konsisten dari Unit → Cabang → Area → Grand Total.
- **Ekspor Laporan Resmi:** Unduh laporan dalam format **Excel (CSV)**, **PDF**, dan **JPEG**.
- **Responsif & Kustomisasi Tema:** Mendukung tampilan HP (kartu rincian khusus mobile), tablet, desktop, mode Terang/Gelap/Sistem, dan pengaturan tema warna.

## Tech Stack

- React 19, TypeScript, TanStack Start / Router, Tailwind CSS v4, Radix UI / shadcn/ui, Recharts
- Supabase Auth & PostgreSQL (Row Level Security)
- jsPDF + jspdf-autotable, html-to-image, Vitest, Vite 8

## Menjalankan di Lokal

```bash
npm install
npm run dev
```

Pengujian & build:

```bash
npx tsc --noEmit
npm test
npm run build
```
