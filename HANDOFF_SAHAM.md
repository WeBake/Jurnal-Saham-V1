# SAHAM — Jurnal Trading Saham Taufiq (dokumen serah-terima projek)

Dokumen ini untuk memindahkan projek ke akaun Claude lain. Muat naik fail dalam pek ini ke Project baharu, dan tampal bahagian "Custom Instructions" di bawah.

## 1. Apa projek ini
Aplikasi jurnal trading saham **satu fail HTML** (`index.html`) dengan backend **Google Apps Script + Google Sheets**. Pemilik menulis dalam **Bahasa Malaysia**; istilah trader lazim dalam English (Entry, Stop Loss, Cash Balance, R:R, dll.). Zon masa Asia/Kuala_Lumpur.

Stack frontend: Alpine.js 3 (CDN), Tailwind (dikompil dan dibenam dalam `<style id="tw-compiled">`), Chart.js 4 (CDN). Tema Modern FinTech, mod gelap melalui kelas `dark` pada `<html>`. Tiada `alert()`/`confirm()`; semua modal custom.

## 2. Fail dalam pek
| Fail | Fungsi |
|---|---|
| `index.html` | Aplikasi siap (sumber + CSS terkompil). Ini yang di-deploy. |
| `Code.gs` | Backend Google Apps Script (tampal dalam Apps Script pada Sheet). |
| `prompt_master_ai_studio.md` | Dokumen induk: arahan sistem, senarai ciri, peraturan, dan KOD PENUH frontend + backend. |
| `src/src.html` | Sumber frontend TANPA CSS terkompil (edit fail ini, kemudian bina semula). |
| `tools/` | `tw.config.js`, `in.css`, `build.sh` untuk jana CSS Tailwind dan bina `index.html`. |
| `tests/` | 22 suite ujian Node (logic.js–logic13.js untuk frontend, gas_test*.js untuk backend + `gas_mock.js`; tiada gas_test2.js), `runtests.sh` (jalankan semua), `browser_test.js` (ujian Chromium sebenar). |

## 3. Ciri-ciri (ringkas)
1. Dashboard: modal semasa, kad hero (Starting Capital, Deposits, Cash Balance, Invested Capital), KPI (Net P/L, Win Rate + Avg R:R, Final Goal Progress, Open Positions), carta (Equity Curve, Monthly P/L, Win/Loss), penapis bulan/tahun, 3 prinsip ilmu, kotak Total Profit MY + US.
2. Journal: CRUD trade, tutup trade (dengan catatan pelajaran), butiran, carian.
3. Plans (Waiting List): pelan entry sebelum beli, tukar ke trade bila harga capai entry.
4. IPO (Bursa MY sahaja): permohonan, ballot, peruntukan, jual. Tiada yuran beli.
5. Study & Backtest: rekod sesi belajar.
6. Money: kalkulator saiz posisi (lot 100 untuk MY, 1 saham untuk US), deposit/withdraw, target bulanan/tahunan/akhir + progress bar.
7. Settings: parameter, URL GAS, perpustakaan ilmu (nota + gambar ke Google Drive), profil saham (sektor + fundamental pilihan + tarikh laporan suku tahun), Senarai Saham Bursa (849 saham terbina + tambah manual + import), eksport CSV, reset demo.
8. Cash Balance = `currentCapital − openCost`; beli ditolak jika dana tidak cukup (boleh dimatikan di Settings).
9. Mod saham US berasingan (suis Bursa MY / US Stocks; lalai sentiasa MY): data, modal, yuran, target, mata wang (US$), sektor berasingan; kotak gabungan guna kadar manual `usdMyr`.
10. Mod demo: tanpa URL GAS, data disimpan dalam `localStorage`.

## 4. Model data
- Sheet GAS: TRADES (27 lajur, hujung = `lesson`, `market`, `buyLog`), SETTINGS, SETUPS, EXIT_REASONS, MISTAKES, PLANS, IPOS, CAPITAL, STUDIES, KNOWLEDGE, STOCKS, COUNTERS (`code, name, updatedDate, sector, manual`).
- Lajur baharu HANYA ditambah di hujung (`migrateColumns` tambah header pada sheet lama; baris tanpa `market` = MY).
- Net P/L = gross − `buyFees` − `fees` (IPO: buyFees = 0). Yuran lalai Bursa MY RM4 beli + RM4 jual; US lalai 0.
- Tetapan per pasaran: modal awal, yuran, target. Dikongsi: minRR, maxRiskTrade, cashCheck, usdMyr. Kunci US di pelayar/pelayar-ke-pelayan berawalan `us` (cth `usBuyFee`).

## 5. Peraturan kod penting (jangan langgar)
- Kekal satu fail HTML; Alpine untuk interaktiviti; CSS Tailwind WAJIB dijana semula jika kelas berubah, dan blok `tw-compiled` kekal SELEPAS `<style>` custom.
- Pengiraan lot: bundarkan jarak SL ke 1e-6 dan tambah 1e-9 sebelum `Math.floor`.
- `x-model` pada `<select>` + `x-for` perlu `:selected`; jangan guna `r2` (pemalar modul) dalam ungkapan HTML.
- `loadLocal()`: muat semua lain SEBELUM trade (kerana `saveLocal()` dipanggil pada pelancaran pertama).
- Tatasusunan aktif (`trades`, `plans`, `capitalLog`) = data pasaran aktif; gunakan `allOf()` untuk merentas pasaran, `setMarket()` untuk tukar, `srvKeys()` untuk kunci tetapan ke pelayan.
- Gambar ilmu: jangan simpan data URL dalam sel Sheets; server simpan ke Drive "SAHAM Ilmu"; paparkan hanya melalui `safeImg()`.
- Jangan taip senarai kaunter syariah dari ingatan; senarai terbina hanya dijana daripada fail pengguna (kini `saham_patuh_syariah_mei2026.csv`), kemas kini seterusnya melalui import.
- Formula net P/L mesti sama di klien dan `Code.gs`.
- POST ke GAS sebagai `text/plain` (elak preflight CORS).

## 6. Pemasangan (ringkas)
1. Cipta Google Sheet → Extensions > Apps Script → tampal `Code.gs` → Save.
2. Jalankan `initDatabase()` sekali (beri kebenaran).
3. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone) → salin URL `/exec`.
4. Buka `index.html` → Settings → tampal URL → Uji Sambungan → Simpan & Sambung.
5. Selepas ubah `Code.gs`: Manage deployments → New version.
Hosting frontend: buka terus dari komputer, atau Netlify Drop / GitHub Pages untuk telefon.

## 7. Aliran kerja pembangunan
1. Edit `src/src.html` dan/atau `Code.gs`.
2. Bina: `tools/build.sh <folder ada src.html>` (jana CSS Tailwind v3.4.17 melalui `tools/tailwindcss` standalone atau `npx`, sisip ke `index.html`, ekstrak skrip ke `_app.js` untuk ujian). Tiada laluan tetap lagi.
3. Ujian: `tests/runtests.sh` (Node) + `node browser_test.js index.html` (Playwright + Chromium; perlu `npm i playwright alpinejs@3 chart.js@4`). `logic*.js` eval `_app.js` dengan stub `localStorage`/`document`; `gas_test*.js` guna `gas_mock.js` (mock Sheets/Drive). Semua mesti cetak "SEMUA LULUS" (logic.js hanya cetak FAIL jika gagal).
4. Kemas kini `prompt_master_ai_studio.md` (senarai ciri, peraturan, blok kod penuh) selepas setiap ciri.

## 8. Status semasa dan perkara tertangguh
- 03/11/2026: semua ciri lulus ujian automatik DAN ujian Chromium headless sebenar (Alpine 3.17.5, Chart.js 4.6.1): 7 tab, carta, MY/US, eksport CSV, mod gelap, telefon 390px, tiada ralat JS. Belum diuji: sambungan sebenar ke Google Apps Script (hanya mock), Safari/iPhone sebenar.
- 05/11/2026: nama pemilik boleh diubah di Settings (ownerName); Code.gs berubah, perlu deploy New version.
- 05/11/2026: kalkulator kini terima harga TP terus (R:R + untung vs rugi dikira automatik).
- 05/11/2026: ciri DCA / Tambah Beli (purata harga automatik, lajur `buyLog`). Code.gs berubah: deploy New version. Lulus 19 suite + ujian Chromium.
- 04/11/2026: ditambah kad Prestasi ikut Setup, Analisis Kesilapan, Pendedahan Sektor; penapis telefon satu baris. Lulus 17 suite + ujian Chromium.
- Dibetulkan 03/11/2026: eksport CSV semua pasaran + lajur market; label kalkulator ikut mata wang; senarai Exit/Mistake dari Sheet; limpahan 2px kad Plan/IPO di telefon.
- 06/11/2026: Senarai Saham Bursa dibenamkan (849 saham, SC Mei 2026, dengan sektor) + carian combobox + sektor automatik + tambah manual. Code.gs berubah (COUNTERS + sector, manual): deploy New version. Lulus 24 suite + ujian Chromium.
- Cadangan belum dibuat: pin versi Alpine/Chart.js (diuji dengan Alpine 3.17.5, Chart.js 4.6.1), kadar USD/MYR automatik.

## 9. Custom Instructions (tampal dalam Project baharu)
```
Anda membantu Taufiq membangunkan "Jurnal Saham": aplikasi satu fail HTML (Alpine.js + Tailwind terkompil + Chart.js) dengan backend Google Apps Script + Google Sheets. Jawab dalam Bahasa Malaysia; guna istilah trader lazim (English untuk istilah seperti Entry, Stop Loss, Cash Balance, R:R). Baca HANDOFF_SAHAM.md dan prompt_master_ai_studio.md dahulu. Ikut peraturan kod dalam dokumen itu. Sebelum serah kod: jalankan semua ujian, jana semula CSS Tailwind, kemas kini prompt_master_ai_studio.md, dan terus terang bahawa aplikasi belum diuji dalam pelayar sebenar jika memang begitu.
```
