# 📖 Guidebook & Dokumentasi Sistem Pelaporan Kinerja Bulanan

Selamat datang di dokumentasi resmi **Sistem Pelaporan Kinerja Bulanan**. Dokumen ini berisi informasi lengkap mengenai spesifikasi sistem (SRS), panduan pengguna, panduan administrator, serta panduan instalasi.

---

## 📑 Daftar Isi
1. [Software Requirements Specification (SRS)](#1-software-requirements-specification-srs)
2. [Daftar Fitur (Features List)](#2-daftar-fitur-features-list)
3. [Panduan Pengguna (User Guide)](#3-panduan-pengguna-user-guide)
4. [Panduan Administrator (Admin Guide)](#4-panduan-administrator-admin-guide)
5. [Panduan Konfigurasi & Deployment](#5-panduan-konfigurasi--deployment)

---

## 1. Software Requirements Specification (SRS)

### 1.1. Deskripsi Umum
Aplikasi ini adalah sebuah *Single Page Application* (SPA) berbasis web yang dirancang untuk mendigitalisasi proses pembuatan, penyimpanan, dan perekapan laporan kinerja bulanan karyawan dari berbagai divisi (misalnya: Divisi Humas, Multimedia, IT, dll).

### 1.2. Tech Stack
*   **Frontend:** murni menggunakan HTML5, CSS3 (Custom Variables, Flexbox/Grid, Glassmorphism UI), dan Vanilla JavaScript (ES6+).
*   **Backend & Database:** Supabase (PostgreSQL, Auth, Row Level Security).
*   **Hosting:** Vercel (Static Deployment).
*   **Library Eksternal:**
    *   `FileSaver.js` (untuk export DOCX).
    *   `Phosphor Icons` (untuk aset ikon UI).

### 1.3. Arsitektur Data
Sistem ini menggunakan dua mode penyimpanan:
1.  **Online Mode (Supabase):** Mode utama. Semua data akun dan laporan disimpan di *cloud*. Terlindungi oleh *Row Level Security* (RLS).
2.  **Fallback Mode (LocalStorage):** Jika *URL* dan *API Key* Supabase tidak dikonfigurasi, aplikasi secara otomatis masuk ke mode *offline* di mana semua data disimpan di dalam *browser*.

---

## 2. Daftar Fitur (Features List)

### 2.1. Fitur Utama (Core)
*   **Autentikasi Aman:** Sistem *Login* dan *Register* terintegrasi dengan Supabase Auth.
*   **Role-Based Access Control (RBAC):** Memisahkan hak akses antara `writer` (pengguna biasa) dan `admin`.
*   **Auto-Save Draft:** Laporan yang sedang diketik akan tersimpan sementara di `localStorage` secara otomatis agar data tidak hilang saat *browser* tertutup.
*   **CRUD Laporan:** Kemampuan untuk Membuat (*Create*), Membaca (*Read*), Mengubah (*Update*), dan Menghapus (*Delete*) laporan bulanan.
*   **Export DOCX:** Ekspor laporan ke dalam format Microsoft Word (.doc) yang rapi dan terstruktur dalam satu kali klik.
*   **Print / PDF Ready:** CSS khusus (*print media query*) yang mengoptimalkan tampilan laporan saat dicetak ke kertas atau di-*Save as PDF*.

### 2.2. Antarmuka (UI/UX)
*   **Modern SaaS Design (2026 Style):** Menggunakan efek *glassmorphism*, bayangan (*shadows*) yang lembut, dan animasi transisi yang mulus.
*   **Dark Mode Toggle:** Tersedia mode gelap yang preferensinya akan disimpan secara otomatis.
*   **Responsive Layout:** Tampilan optimal di perangkat *Desktop*, *Tablet*, dan *Smartphone*.
*   **Live Search & Filter:** Pencarian laporan secara *real-time* berdasarkan nama atau filter berdasarkan bulan.

---

## 3. Panduan Pengguna (User Guide)

Panduan ini ditujukan untuk karyawan/staff (Role: `writer`).

### 3.1. Cara Membuat Akun & Login
1.  Buka *link* aplikasi.
2.  Jika Anda belum punya akun, klik **Daftar di sini** pada *form* yang muncul.
3.  Masukkan Nama Lengkap, Email, dan Password (minimal 6 karakter), lalu klik **Daftar**.
4.  Setelah berhasil, silakan **Login** menggunakan Email dan Password tersebut.

### 3.2. Cara Membuat Laporan
1.  Di menu sebelah kiri, klik **Buat Laporan**.
2.  Isi **Identitas** (Jabatan, Divisi, Periode Laporan).
3.  Pada bagian **Uraian Tugas & Kegiatan**, jelaskan pelaksanaan tugas utama dan tambahan Anda.
4.  Pada tabel **Target dan Pencapaian** serta **Kendala**, Anda bisa mengklik tombol **+ Tambah** untuk menambah baris tabel.
5.  *(Aplikasi akan otomatis menyimpan ketikan Anda sebagai draft setiap beberapa detik).*
6.  Setelah semua terisi, klik tombol **Simpan Laporan** di paling bawah.

### 3.3. Mengedit & Menghapus Laporan
*   **Edit:** Di halaman Dashboard, temukan laporan Anda dan klik ikon **Pensil**.
*   **Hapus:** Klik ikon **Tempat Sampah** warna merah. (Tindakan ini permanen).

### 3.4. Export & Cetak (Print)
Di Dashboard, pada kartu laporan yang sudah Anda buat:
*   Klik ikon **Printer** untuk mencetak laporan atau menyimpannya sebagai PDF.
*   Klik ikon **Dokumen (DOCX)** untuk mengunduh laporan dalam format Microsoft Word.

---

## 4. Panduan Administrator (Admin Guide)

Admin memiliki hak istimewa untuk melihat seluruh data perusahaan.

### 4.1. Cara Mengakses Admin Panel
*   Secara otomatis, pendaftar pertama di Supabase adalah `writer`.
*   Untuk menjadikan akun Anda sebagai Admin:
    1.  Buka *dashboard* Supabase Anda.
    2.  Pilih menu **Table Editor** > tabel `profiles`.
    3.  Cari nama/email Anda, lalu ubah nilai di kolom `role` dari `writer` menjadi `admin`.
*   Refresh aplikasi Anda. Menu **Admin Panel** akan muncul di sidebar sebelah kiri.

### 4.2. Manajemen Role Pengguna
1.  Masuk ke menu **Admin Panel**.
2.  Pada tabel "Manajemen Role Pengguna", Anda akan melihat daftar semua karyawan yang terdaftar.
3.  Gunakan *dropdown* di kolom "Ubah Role" untuk menaikkan jabatan seseorang menjadi **Admin** atau menurunkannya menjadi **Writer**.

### 4.3. Memantau Laporan Seluruh Divisi
*   Scroll ke bawah pada halaman Admin Panel untuk melihat tabel **Semua Laporan**.
*   Tabel ini berisi laporan dari seluruh pengguna.
*   Anda bisa mengklik ikon **Mata (View)** untuk membaca detail isi laporan karyawan tersebut, serta melakukan *print* atau *export* DOCX dari laporan mereka.

---

## 5. Panduan Konfigurasi & Deployment

### 5.1. Setup Supabase (Database Utama)
1.  Buat akun di [Supabase.com](https://supabase.com).
2.  Buat *Project* baru.
3.  Buka menu **SQL Editor**, buat *New Query*, lalu *copy-paste* seluruh isi file `supabase_schema.sql` dari *repository* ini. Klik **Run**.
4.  Buka menu **Project Settings > API**. Copy `Project URL` dan `anon public key`.
5.  Buka file `app.js` pada *source code*, lalu *paste* kode tersebut ke:
    ```javascript
    const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    ```

### 5.2. Deployment ke Vercel (Online Gratis)
1.  Pastikan *source code* (beserta file `app.js` yang sudah berisi API Key Supabase) sudah Anda *push* ke GitHub/GitLab.
2.  Buka [Vercel.com](https://vercel.com/dashboard) dan *Login* menggunakan GitHub.
3.  Klik **Add New...** > **Project**.
4.  Pilih *repository* Anda, lalu klik **Import**.
5.  Vercel akan otomatis membaca file `vercel.json` dan melakukan *deploy*.
6.  Website Anda kini sudah *online* secara publik!
