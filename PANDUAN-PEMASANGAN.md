# Panduan Pemasangan Jurnal Saham (pengguna baharu)

Masa diperlukan: lebih kurang 10 minit. Anda perlukan akaun Google sahaja.

Setiap pengguna ada **Google Sheet sendiri**. Data anda tidak dikongsi dengan sesiapa, termasuk orang yang beri link aplikasi ini.

---

## Langkah 1: Buat Google Sheet

1. Buka https://sheets.new (Google Sheet kosong akan dibuka).
2. Tukar nama fail di kiri atas, contohnya **Jurnal Saham**.

## Langkah 2: Pasang Apps Script

1. Dalam Sheet tadi, tekan menu **Extensions → Apps Script**.
2. Padam semua kod yang ada (`function myFunction() {...}`).
3. Buka fail [`Code.gs`](Code.gs) dalam repo ini, tekan butang **Copy raw file** (ikon salin), dan tampal ke dalam Apps Script.
4. Tekan ikon **Save** (disket).

## Langkah 3: Cipta tab database

1. Di bar atas Apps Script, pilih fungsi **`initDatabase`**, kemudian tekan **Run**.
2. Google akan minta kebenaran:
   - Tekan **Review permissions** dan pilih akaun Google anda.
   - Jika keluar "Google hasn't verified this app", tekan **Advanced → Go to (nama projek) (unsafe)**, kemudian **Allow**. Ini normal kerana skrip ini milik anda sendiri.
3. Kembali ke Google Sheet. Anda patut nampak tab baharu seperti **TRADES, SETTINGS, PLANS, IPOS, CAPITAL**.

## Langkah 4: Deploy sebagai Web App

1. Dalam Apps Script, tekan **Deploy → New deployment**.
2. Tekan ikon gear di sebelah "Select type" dan pilih **Web app**.
3. Tetapkan:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Tekan **Deploy**. Salin **Web app URL** yang berakhir dengan `/exec`.

> Simpan URL ini untuk diri sendiri. Sesiapa yang ada URL ini boleh membaca dan mengubah data dalam Sheet anda, jadi jangan kongsi.

## Langkah 5: Sambung aplikasi

1. Buka aplikasi: **https://webake.github.io/Jurnal-Saham-V1/**
2. Pergi ke **Settings**.
3. Di bahagian URL Web App, tampal URL `/exec` tadi, tekan **Uji Sambungan** (patut keluar "Sambungan OK"), kemudian **Simpan & Sambung**.
4. Di kad **Profil**, taip nama anda dan tekan **Simpan Nama**.
5. Di **Trading Parameters**, isi **Starting Capital** dan yuran anda, kemudian **Simpan Parameter**. Untuk saham US, tukar ke **US Stocks** dahulu dan isi semula (modal dan yuran US berasingan).

Selesai. Sebelum disambung, aplikasi berjalan dalam **Mod Demo** dengan data contoh. Data demo tidak dipindah ke Sheet anda.

## Guna di telefon

Buka link aplikasi di telefon, kemudian:
- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** menu ⋮ → **Add to Home screen**

URL Apps Script perlu ditampal **sekali bagi setiap peranti atau pelayar** (telefon dan laptop masing-masing sekali). Nama dan data akan ikut kerana ia disimpan dalam Sheet anda.

## Bila ada versi baharu

- Jika hanya aplikasi (`index.html`) berubah: tiada apa perlu dibuat, cuma muat semula halaman.
- Jika `Code.gs` berubah: tampal `Code.gs` baharu dalam Apps Script, **Save**, kemudian **Deploy → Manage deployments → ikon pensel → Version: New version → Deploy**. URL tidak berubah.

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| "Sambungan gagal" | Pastikan **Who has access = Anyone** dan URL berakhir dengan `/exec` (bukan `/dev`). |
| Perubahan `Code.gs` tidak berkesan | Anda perlu buat **New version** dalam Manage deployments. |
| Gambar dalam Perpustakaan Ilmu gagal disimpan | Kali pertama, Google minta kebenaran Google Drive. Jalankan `initDatabase` sekali lagi dalam Apps Script dan beri kebenaran, kemudian deploy New version. |
| Data hilang di telefon | URL belum ditampal di telefon tersebut. Tampal URL yang sama di Settings. |
