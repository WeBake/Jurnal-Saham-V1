# Jurnal Saham

Jurnal trading saham peribadi untuk **Bursa Malaysia** dan **US Stocks**. Satu fail HTML (Alpine.js + Tailwind + Chart.js) dengan backend **Google Apps Script + Google Sheets**. Setiap pengguna guna Google Sheet sendiri, jadi data setiap orang berasingan dan peribadi.

**Buka aplikasi:** https://webake.github.io/Jurnal-Saham-V1/
**Cara pasang untuk pengguna baharu:** lihat [PANDUAN-PEMASANGAN.md](PANDUAN-PEMASANGAN.md)

## Ciri utama
- Dashboard: modal, Cash Balance, Net P/L, Win Rate, Equity Curve, P/L bulanan, prestasi ikut setup, analisis kesilapan, pendedahan sektor
- Journal: tambah, tutup dan padam trade, DCA (tambah belian, purata harga automatik)
- Waiting List, IPO (Bursa MY), Study & Backtest, Perpustakaan Ilmu
- Money Management: kalkulator position size dengan harga TP, R:R dan untung vs rugi
- Mod US berasingan (US$), mod gelap, mesra telefon
- Nama pemilik boleh diubah di Settings → Profil

## Privasi
URL Apps Script **tidak** disimpan dalam kod. Setiap pengguna tampal URL sendiri di Settings, dan ia disimpan dalam pelayar sahaja. Data trade berada dalam Google Sheet pengguna sendiri.

## Fail
| Fail | Fungsi |
|---|---|
| `index.html` | Aplikasi (dibuka oleh GitHub Pages) |
| `Code.gs` | Backend Google Apps Script |
| `src/src.html` | Sumber frontend tanpa CSS terkompil |
| `tools/` | Bina semula CSS Tailwind dan `index.html` |
| `tests/` | Ujian Node (`runtests.sh`) dan ujian pelayar (`browser_test.js`) |
| `prompt_master_ai_studio.md`, `HANDOFF_SAHAM.md` | Dokumentasi pembangunan |

## Pembangunan
```bash
cp src/src.html Code.gs tests/*.js .
tools/build.sh .          # jana CSS + index.html + _app.js
tests/runtests.sh         # semua suite mesti LULUS
```
