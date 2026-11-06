/**
 * JOURNAL SAHAM - Backend (Google Apps Script)
 *
 * CARA PASANG:
 * 1. Buka Google Sheet kosong > Extensions > Apps Script. Tampal kod ini (ganti semua).
 * 2. (Pilihan) Isi SPREADSHEET_ID di bawah. Jika dibiarkan kosong, skrip guna sheet tempat ia dilampirkan.
 * 3. Run fungsi initDatabase() sekali (beri kebenaran bila diminta) untuk cipta semua tab.
 *    (Pemasangan sedia ada: tab PLANS akan dicipta automatik bila Waiting List pertama kali digunakan.)
 * 4. Deploy > New deployment > Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 *    Salin URL berakhir /exec dan tampal dalam Settings aplikasi.
 * 5. Setiap kali ubah kod, buat "New version" dalam Manage deployments supaya perubahan berkesan.
 */

var SPREADSHEET_ID = ""; // kosong = guna spreadsheet yang dilampirkan
var TZ = "Asia/Kuala_Lumpur";

var SHEETS = {
  TRADES: "TRADES",
  SETTINGS: "SETTINGS",
  SETUPS: "SETUPS",
  EXIT_REASONS: "EXIT_REASONS",
  MISTAKES: "MISTAKES",
  PLANS: "PLANS",
  IPOS: "IPOS",
  CAPITAL: "CAPITAL",
  STUDIES: "STUDIES",
  KNOWLEDGE: "KNOWLEDGE",
  STOCKS: "STOCKS",
  COUNTERS: "COUNTERS"
};

// Susunan lajur TRADES (WAJIB sama dengan medan frontend)
var TRADE_COLS = [
  "tradeId", "openDate", "stockName", "status", "buyPrice", "quantity", "stopLoss",
  "tp1", "tp2", "tp3", "setup", "notes", "closeDate", "sellPrice", "fees",
  "grossPL", "netPL", "result", "realizedRR", "exitReason", "mistake",
  "tradeType", "buyFees", "ipoId", "lesson", "market", // lajur baharu (ditambah di hujung supaya data lama kekal)
  "buyLog" // DCA: JSON [{date,price,qty,fee}] setiap belian; kosong = satu belian sahaja
];
var MAX_BUY_LOTS = 200;
var DATE_COLS = ["openDate", "closeDate"];
var NUM_COLS = ["buyPrice", "quantity", "stopLoss", "tp1", "tp2", "tp3", "sellPrice", "fees", "grossPL", "netPL", "realizedRR", "buyFees"];

// Susunan lajur PLANS (Waiting List) - WAJIB sama dengan medan frontend
var PLAN_COLS = [
  "planId", "createdDate", "stockName", "entryType", "entryPrice", "stopLoss",
  "tp1", "tp2", "tp3", "quantity", "riskPct", "currentPrice", "setup", "notes",
  "status", "executedTradeId", "updatedDate", "market"
];
var PLAN_DATE_COLS = ["createdDate", "updatedDate"];
var PLAN_NUM_COLS = ["entryPrice", "stopLoss", "tp1", "tp2", "tp3", "quantity", "riskPct", "currentPrice"];

// Susunan lajur IPOS (permohonan IPO / ballot) - WAJIB sama dengan medan frontend
var IPO_COLS = [
  "ipoId", "appliedDate", "stockName", "ipoPrice", "appliedQty", "status",
  "ballotDate", "listingDate", "allottedQty", "tradeId", "notes", "updatedDate"
];
var IPO_DATE_COLS = ["appliedDate", "ballotDate", "listingDate", "updatedDate"];
var IPO_NUM_COLS = ["ipoPrice", "appliedQty", "allottedQty"];

// buyFee/sellFee = yuran lalai Bursa Malaysia (RM4 beli + RM4 jual). IPO: tiada yuran beli.
var DEFAULT_SETTINGS = { initialCapital: 10000, minRR: 1.5, maxRiskTrade: 2, buyFee: 4, sellFee: 4, targetMonthly: 0, targetYearly: 0, targetFinal: 0, cashCheck: 1,
  // Pasaran US (USD): tetapan berasingan; usdMyr = kadar manual untuk kotak jumlah gabungan
  usdMyr: 4.5, usInitialCapital: 5000, usBuyFee: 0, usSellFee: 0, usTargetMonthly: 0, usTargetYearly: 0, usTargetFinal: 0 };
// Tetapan teks (bukan nombor). ownerName = nama pemilik dipaparkan di dashboard (kosong = tiada nama)
var TEXT_SETTINGS = { ownerName: "" };
var MAX_OWNER_NAME = 40;
function allSettingKeys() { return Object.keys(DEFAULT_SETTINGS).concat(Object.keys(TEXT_SETTINGS)); }
// Nama selamat: buang < > dan aksara kawalan, buang awalan = + - @ (elak formula dalam Sheets), maks 40 aksara
function cleanText(v, max) {
  return String(v === null || v === undefined ? "" : v).replace(/[<>\u0000-\u001f]/g, "").replace(/^[=+\-@\s]+/, "").replace(/\s+/g, " ").trim().slice(0, max || MAX_OWNER_NAME);
}

// Lajur CAPITAL (modal tambahan / pengeluaran) & STUDIES (study / backtest) - WAJIB sama dengan frontend
var CAPITAL_COLS = ["capId", "date", "type", "amount", "notes", "updatedDate", "market"];
var CAPITAL_DATE_COLS = ["date", "updatedDate"];
var CAPITAL_NUM_COLS = ["amount"];
var STUDY_COLS = ["studyId", "studyDate", "stockName", "setup", "timeframe", "rangeFrom", "rangeTo", "tradesTested", "wins", "losses", "totalR",
  "minutes", "understanding", "lessons", "mistakes", "chartLink", "updatedDate"];
var STUDY_DATE_COLS = ["studyDate", "rangeFrom", "rangeTo", "updatedDate"];
// Lajur KNOWLEDGE (perpustakaan ilmu). imageUrl = pautan Google Drive (gambar disimpan dalam Drive, bukan dalam sel)
var KNOW_COLS = ["knId", "date", "title", "category", "content", "imageUrl", "pinned", "updatedDate"];
var KNOW_DATE_COLS = ["date", "updatedDate"];
var KNOW_NUM_COLS = ["pinned"];
// Profil saham: sektor + analisis fundamental (semua pilihan). Kunci = stockName (huruf besar)
var STOCK_COLS = ["stockName", "sector", "revenue", "netProfit", "eps", "debtCashflow", "valuation", "dividend", "dividendNote", "nextReportDate", "updatedDate"];
var STOCK_DATE_COLS = ["nextReportDate", "updatedDate"];
var STOCK_NUM_COLS = [];
var STOCK_TEXT_COLS = ["revenue", "netProfit", "eps", "debtCashflow", "valuation", "dividendNote"];
var SECTORS = ["Financial Services", "Technology", "Industrial Products & Services", "Consumer Products & Services", "Energy", "Construction", "Property", "Plantation", "Healthcare", "Telecommunications & Media", "Transportation & Logistics", "Utilities", "Real Estate Investment Trusts (REITs)",
  // sektor pasaran US
  "Financials", "Consumer Discretionary", "Consumer Staples", "Communication Services", "Industrials", "Real Estate", "Materials"];
// Senarai kaunter (cadangan nama saham). Hanya saham biasa (kod 4 digit); waran dan kod lain ditolak.
// sector & manual ditambah 06/11/2026 (lajur baharu hanya di hujung)
var COUNTER_COLS = ["code", "name", "updatedDate", "sector", "manual"];
var COUNTER_DATE_COLS = ["updatedDate"];
var MAX_COUNTERS = 3000;
var MAX_PINNED = 3;
var IMAGE_FOLDER = "SAHAM Ilmu";
var MAX_IMAGE_BYTES = 1500000;
var STUDY_NUM_COLS = ["tradesTested", "wins", "losses", "totalR", "minutes", "understanding"];
var DEFAULT_SETUPS = ["Breakout", "Pullback", "Trend Following", "Reversal", "Support Bounce", "Earnings Play", "IPO", "Lain-lain"];
var DEFAULT_EXITS = ["Target TP1", "Target TP2", "Target TP3", "Stop Loss", "Trailing Stop", "Isyarat Lemah", "Tutup Manual"];
var DEFAULT_MISTAKES = ["Tiada", "FOMO", "Masuk Terlalu Awal", "Tiada Stop Loss", "Keluar Terlalu Awal", "Saiz Posisi Terlalu Besar", "Langgar Plan"];

/* ===================== UTIL ===================== */

function getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Tiada spreadsheet. Isi SPREADSHEET_ID atau lampirkan skrip pada Google Sheet.");
  return ss;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ok(extra) {
  var o = { status: "success" };
  for (var k in (extra || {})) o[k] = extra[k];
  return json(o);
}

function fail(msg) {
  return json({ status: "error", message: String(msg) });
}

function toDateStr(v) {
  if (v === "" || v === null || v === undefined) return "";
  if (Object.prototype.toString.call(v) === "[object Date]") return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  return String(v).slice(0, 10);
}

function toNum(v) {
  if (v === "" || v === null || v === undefined) return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ===================== DATABASE ===================== */

function ensureSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight("bold").setBackground("#1d4ed8").setFontColor("#ffffff");
    sh.setFrozenRows(1);
  }
  return sh;
}

function fillList(sh, items) {
  if (sh.getLastRow() <= 1) {
    sh.getRange(2, 1, items.length, 1).setValues(items.map(function (i) { return [i]; }));
  }
}

function initDatabase() {
  var ss = getSpreadsheet();

  var trades = ensureSheet(ss, SHEETS.TRADES, TRADE_COLS);
  // Simpan tarikh sebagai teks supaya kekal yyyy-MM-dd
  DATE_COLS.forEach(function (c) {
    var col = TRADE_COLS.indexOf(c) + 1;
    trades.getRange(2, col, trades.getMaxRows() - 1, 1).setNumberFormat("@");
  });
  trades.getRange(2, TRADE_COLS.indexOf("tradeId") + 1, trades.getMaxRows() - 1, 1).setNumberFormat("@");

  var settings = ensureSheet(ss, SHEETS.SETTINGS, ["key", "value"]);
  if (settings.getLastRow() <= 1) {
    var rows = Object.keys(DEFAULT_SETTINGS).map(function (k) { return [k, DEFAULT_SETTINGS[k]]; })
      .concat(Object.keys(TEXT_SETTINGS).map(function (k) { return [k, TEXT_SETTINGS[k]]; }));
    settings.getRange(2, 1, rows.length, 2).setNumberFormat("@").setValues(rows);
  }

  getIposSheet();

  var plans = ensureSheet(ss, SHEETS.PLANS, PLAN_COLS);
  plans.getRange(2, 1, plans.getMaxRows() - 1, PLAN_COLS.length).setNumberFormat("@");
  PLAN_NUM_COLS.forEach(function (c) {
    plans.getRange(2, PLAN_COLS.indexOf(c) + 1, plans.getMaxRows() - 1, 1).setNumberFormat("General");
  });

  fillList(ensureSheet(ss, SHEETS.SETUPS, ["setup"]), DEFAULT_SETUPS);
  fillList(ensureSheet(ss, SHEETS.EXIT_REASONS, ["exitReason"]), DEFAULT_EXITS);
  fillList(ensureSheet(ss, SHEETS.MISTAKES, ["mistake"]), DEFAULT_MISTAKES);

  var def = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1") || ss.getSheetByName("Helaian1");
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  return "Database sedia.";
}

// Pemasangan sedia ada: tambah lajur baharu (tradeType, buyFees, ipoId) tanpa mengganggu data lama
function migrateTradesColumns(sh) {
  if (sh.getMaxColumns() < TRADE_COLS.length) sh.insertColumnsAfter(sh.getMaxColumns(), TRADE_COLS.length - sh.getMaxColumns());
  var hdr = sh.getRange(1, 1, 1, TRADE_COLS.length).getValues()[0];
  for (var i = 0; i < TRADE_COLS.length; i++) {
    if (String(hdr[i]).trim() === "") {
      sh.getRange(1, i + 1).setValue(TRADE_COLS[i]).setFontWeight("bold").setBackground("#1d4ed8").setFontColor("#ffffff");
      if (NUM_COLS.indexOf(TRADE_COLS[i]) < 0) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat("@");
    }
  }
}

// Tambah lajur baharu di HUJUNG sheet sedia ada (data lama kekal). Selamat dipanggil berulang kali.
function migrateColumns(sh, cols, numCols) {
  if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
  var hdr = sh.getRange(1, 1, 1, cols.length).getValues()[0];
  for (var i = 0; i < cols.length; i++) {
    if (String(hdr[i]).trim() === "") {
      sh.getRange(1, i + 1).setValue(cols[i]).setFontWeight("bold").setBackground("#1d4ed8").setFontColor("#ffffff");
      sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat(numCols.indexOf(cols[i]) < 0 ? "@" : "General");
    }
  }
}

function normMarket(v) { return String(v || "").toUpperCase() === "US" ? "US" : "MY"; }

function getTradesSheet() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(SHEETS.TRADES);
  if (!sh) { initDatabase(); sh = ss.getSheetByName(SHEETS.TRADES); }
  migrateTradesColumns(sh);
  return sh;
}

/* ===================== TRADES ===================== */

function rowToTrade(row) {
  var t = {};
  TRADE_COLS.forEach(function (c, i) {
    var v = row[i];
    if (DATE_COLS.indexOf(c) > -1) t[c] = toDateStr(v);
    else if (NUM_COLS.indexOf(c) > -1) t[c] = toNum(v);
    else t[c] = (v === null || v === undefined) ? "" : String(v);
  });
  t.market = normMarket(t.market); // baris lama tanpa market = Bursa MY
  return t;
}

function tradeToRow(t) {
  return TRADE_COLS.map(function (c) {
    var v = t[c];
    if (DATE_COLS.indexOf(c) > -1) return toDateStr(v);
    if (NUM_COLS.indexOf(c) > -1) return (v === "" || v === null || v === undefined) ? "" : toNum(v);
    return (v === null || v === undefined) ? "" : String(v);
  });
}

function getTrades() {
  var sh = getTradesSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, TRADE_COLS.length).getValues();
  return values
    .filter(function (r) { return String(r[0]).trim() !== ""; })
    .map(rowToTrade);
}

function findTradeRow(sh, tradeId) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(tradeId)) return i + 2;
  }
  return -1;
}

function generateUniqueTradeId(dateStr) {
  var sh = getTradesSheet();
  var d = dateStr ? toDateStr(dateStr) : Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  var prefix = "TRD-" + d.replace(/-/g, "") + "-";
  var last = sh.getLastRow();
  var n = 0;
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    ids.forEach(function (r) { if (String(r[0]).indexOf(prefix) === 0) n++; });
  }
  var id;
  do {
    n++;
    id = prefix + ("00" + n).slice(-3);
  } while (findTradeRow(sh, id) > -1);
  return id;
}

function validateTradeData(d, isClosed) {
  if (!d) throw new Error("Data kosong");
  if (!String(d.stockName || "").trim()) throw new Error("Nama saham diperlukan");
  if (!toDateStr(d.openDate)) throw new Error("Tarikh beli diperlukan");
  if (!(toNum(d.buyPrice) > 0)) throw new Error("Harga beli tidak sah");
  if (!(toNum(d.quantity) > 0)) throw new Error("Kuantiti tidak sah");
  if (!(toNum(d.stopLoss) > 0) || toNum(d.stopLoss) >= toNum(d.buyPrice)) throw new Error("Stop loss mesti lebih rendah daripada harga beli");
  if (isClosed) {
    if (!toDateStr(d.closeDate)) throw new Error("Tarikh jual diperlukan");
    if (!(toNum(d.sellPrice) > 0)) throw new Error("Harga jual tidak sah");
    if (toDateStr(d.closeDate) < toDateStr(d.openDate)) throw new Error("Tarikh jual sebelum tarikh beli");
  }
}

// DCA: bersihkan log belian. Pulangkan [] jika kosong/tidak sah.
function parseBuyLog(v) {
  if (v === "" || v === null || v === undefined) return [];
  var a;
  try { a = typeof v === "string" ? JSON.parse(v) : v; } catch (e) { throw new Error("Log belian (DCA) tidak sah"); }
  if (!Array.isArray(a)) throw new Error("Log belian (DCA) tidak sah");
  if (a.length > MAX_BUY_LOTS) throw new Error("Maksimum " + MAX_BUY_LOTS + " belian bagi satu posisi");
  return a.map(function (l) {
    var o = { date: toDateStr(l && l.date), price: Math.round(toNum(l && l.price) * 1e6) / 1e6, qty: toNum(l && l.qty), fee: Math.round(toNum(l && l.fee) * 100) / 100 };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw new Error("Tarikh belian DCA tidak sah");
    if (!(o.price > 0) || !(o.qty > 0) || o.fee < 0) throw new Error("Harga/kuantiti/yuran belian DCA tidak sah");
    return o;
  });
}

// DCA: purata harga = jumlah (harga x unit) / jumlah unit, dibundarkan 6 perpuluhan (WAJIB sama dengan klien avgFromLots)
function applyBuyLog(t) {
  var lots = parseBuyLog(t.buyLog);
  if (lots.length < 2) { t.buyLog = lots.length ? JSON.stringify(lots) : ""; return t; }
  var qty = 0, cost = 0, fee = 0;
  lots.forEach(function (l) { qty += l.qty; cost += l.price * l.qty; fee += l.fee; });
  t.quantity = qty;
  t.buyPrice = Math.round(cost / qty * 1e6) / 1e6;
  t.buyFees = Math.round(fee * 100) / 100;
  t.openDate = lots.map(function (l) { return l.date; }).sort()[0];
  t.buyLog = JSON.stringify(lots);
  return t;
}

// Pengiraan dilakukan di server supaya Sheet sentiasa konsisten
function computeClosed(t) {
  var gross = (toNum(t.sellPrice) - toNum(t.buyPrice)) * toNum(t.quantity);
  var net = gross - toNum(t.buyFees) - toNum(t.fees); // buyFees = 0 untuk IPO; fees = yuran jual
  var risk = (toNum(t.buyPrice) - toNum(t.stopLoss)) * toNum(t.quantity);
  t.grossPL = Math.round(gross * 100) / 100;
  t.netPL = Math.round(net * 100) / 100;
  t.result = t.netPL > 0 ? "WIN" : (t.netPL < 0 ? "LOSS" : "BE");
  t.realizedRR = risk > 0 ? Math.round((t.netPL / risk) * 100) / 100 : 0;
  return t;
}

function createTrade(p) {
  validateTradeData(p, false);
  var sh = getTradesSheet();
  var t = {};
  TRADE_COLS.forEach(function (c) { t[c] = p[c] !== undefined ? p[c] : ""; });
  t.status = "OPEN";
  t.openDate = toDateStr(t.openDate);
  t.stockName = String(t.stockName).trim().toUpperCase();
  if (!t.tradeId || findTradeRow(sh, t.tradeId) > -1) t.tradeId = generateUniqueTradeId(t.openDate);
  t.tradeType = t.tradeType === "IPO" ? "IPO" : "NORMAL";
  t.buyFees = (t.tradeType === "IPO") ? 0 : toNum(t.buyFees);
  t.ipoId = String(t.ipoId || "");
  t.market = normMarket(t.market);
  applyBuyLog(t);
  t.closeDate = ""; t.sellPrice = ""; t.fees = ""; t.grossPL = ""; t.netPL = ""; t.result = ""; t.realizedRR = ""; t.exitReason = ""; t.mistake = "";
  var row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, TRADE_COLS.length).setNumberFormat("@"); // elak auto-convert tarikh
  sh.getRange(row, 1, 1, TRADE_COLS.length).setValues([tradeToRow(t)]);
  NUM_COLS.forEach(function (c) { sh.getRange(row, TRADE_COLS.indexOf(c) + 1).setNumberFormat("General"); });
  return rowToTrade(tradeToRow(t));
}

function closeTrade(p) {
  if (!p || !p.tradeId) throw new Error("tradeId diperlukan");
  var sh = getTradesSheet();
  var row = findTradeRow(sh, p.tradeId);
  if (row < 0) throw new Error("Trade tidak dijumpai: " + p.tradeId);
  var existing = rowToTrade(sh.getRange(row, 1, 1, TRADE_COLS.length).getValues()[0]);
  var t = {};
  TRADE_COLS.forEach(function (c) { t[c] = existing[c]; });
  t.closeDate = toDateStr(p.closeDate);
  t.sellPrice = toNum(p.sellPrice);
  t.fees = toNum(p.fees);
  t.exitReason = p.exitReason || "";
  t.mistake = p.mistake || "";
  t.lesson = String(p.lesson || "").slice(0, 1000);
  validateTradeData(t, true);
  t.status = "CLOSED";
  computeClosed(t);
  sh.getRange(row, 1, 1, TRADE_COLS.length).setNumberFormat("@");
  sh.getRange(row, 1, 1, TRADE_COLS.length).setValues([tradeToRow(t)]);
  NUM_COLS.forEach(function (c) { sh.getRange(row, TRADE_COLS.indexOf(c) + 1).setNumberFormat("General"); });
  return t;
}

function updateTrade(p) {
  if (!p || !p.tradeId) throw new Error("tradeId diperlukan");
  var sh = getTradesSheet();
  var row = findTradeRow(sh, p.tradeId);
  if (row < 0) throw new Error("Trade tidak dijumpai: " + p.tradeId);
  var t = rowToTrade(sh.getRange(row, 1, 1, TRADE_COLS.length).getValues()[0]);
  TRADE_COLS.forEach(function (c) { if (c !== "tradeId" && p[c] !== undefined) t[c] = p[c]; });
  var closed = String(t.status).toUpperCase() === "CLOSED";
  if (closed && p.buyLog !== undefined && String(p.buyLog) !== String(existingLog(sh, row))) throw new Error("Trade sudah ditutup; belian DCA tidak boleh diubah");
  applyBuyLog(t);
  validateTradeData(t, closed);
  if (closed) computeClosed(t);
  sh.getRange(row, 1, 1, TRADE_COLS.length).setNumberFormat("@");
  sh.getRange(row, 1, 1, TRADE_COLS.length).setValues([tradeToRow(t)]);
  NUM_COLS.forEach(function (c) { sh.getRange(row, TRADE_COLS.indexOf(c) + 1).setNumberFormat("General"); });
  return t;
}

function existingLog(sh, row) { return sh.getRange(row, TRADE_COLS.indexOf("buyLog") + 1).getValue() || ""; }

function deleteTrade(p) {
  if (!p || !p.tradeId) throw new Error("tradeId diperlukan");
  var sh = getTradesSheet();
  var row = findTradeRow(sh, p.tradeId);
  if (row < 0) throw new Error("Trade tidak dijumpai: " + p.tradeId);
  sh.deleteRow(row);
  return true;
}

/* ===================== PLANS (WAITING LIST) ===================== */

// Cipta sheet PLANS sahaja jika belum wujud (selamat untuk pemasangan sedia ada)
function getPlansSheet() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(SHEETS.PLANS);
  if (!sh) {
    sh = ensureSheet(ss, SHEETS.PLANS, PLAN_COLS);
    sh.getRange(2, 1, sh.getMaxRows() - 1, PLAN_COLS.length).setNumberFormat("@");
    PLAN_NUM_COLS.forEach(function (c) {
      sh.getRange(2, PLAN_COLS.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat("General");
    });
  }
  migrateColumns(sh, PLAN_COLS, PLAN_NUM_COLS);
  return sh;
}

function rowToPlan(row) {
  var p = {};
  PLAN_COLS.forEach(function (c, i) {
    var v = row[i];
    if (PLAN_DATE_COLS.indexOf(c) > -1) p[c] = toDateStr(v);
    else if (PLAN_NUM_COLS.indexOf(c) > -1) p[c] = toNum(v);
    else p[c] = (v === null || v === undefined) ? "" : String(v);
  });
  p.market = normMarket(p.market);
  return p;
}

function planToRow(p) {
  return PLAN_COLS.map(function (c) {
    var v = p[c];
    if (PLAN_DATE_COLS.indexOf(c) > -1) return toDateStr(v);
    if (PLAN_NUM_COLS.indexOf(c) > -1) return (v === "" || v === null || v === undefined) ? "" : toNum(v);
    return (v === null || v === undefined) ? "" : String(v);
  });
}

function writePlanRow(sh, row, plan) {
  sh.getRange(row, 1, 1, PLAN_COLS.length).setNumberFormat("@"); // elak auto-convert tarikh
  sh.getRange(row, 1, 1, PLAN_COLS.length).setValues([planToRow(plan)]);
  PLAN_NUM_COLS.forEach(function (c) { sh.getRange(row, PLAN_COLS.indexOf(c) + 1).setNumberFormat("General"); });
}

function getPlans() {
  var sh = getPlansSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, PLAN_COLS.length).getValues()
    .filter(function (r) { return String(r[0]).trim() !== ""; })
    .map(rowToPlan);
}

function generateUniquePlanId(dateStr) {
  var sh = getPlansSheet();
  var d = dateStr ? toDateStr(dateStr) : Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  var prefix = "PLN-" + d.replace(/-/g, "") + "-";
  var last = sh.getLastRow();
  var n = 0;
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { if (String(r[0]).indexOf(prefix) === 0) n++; });
  }
  var id;
  do { n++; id = prefix + ("00" + n).slice(-3); } while (findTradeRow(sh, id) > -1);
  return id;
}

function validatePlanData(d) {
  if (!d) throw new Error("Data kosong");
  if (!String(d.stockName || "").trim()) throw new Error("Nama saham diperlukan");
  if (!(toNum(d.entryPrice) > 0)) throw new Error("Harga entry tidak sah");
  if (!(toNum(d.stopLoss) > 0) || toNum(d.stopLoss) >= toNum(d.entryPrice)) throw new Error("Stop loss mesti lebih rendah daripada harga entry");
}

function createPlan(p) {
  validatePlanData(p);
  var sh = getPlansSheet();
  var plan = {};
  PLAN_COLS.forEach(function (c) { plan[c] = p[c] !== undefined ? p[c] : ""; });
  plan.stockName = String(plan.stockName).trim().toUpperCase();
  plan.entryType = plan.entryType === "BREAKOUT" ? "BREAKOUT" : "PULLBACK";
  plan.status = "WAITING";
  plan.executedTradeId = "";
  plan.market = normMarket(plan.market);
  plan.createdDate = toDateStr(plan.createdDate) || Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  plan.updatedDate = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  if (!plan.planId || findTradeRow(sh, plan.planId) > -1) plan.planId = generateUniquePlanId(plan.createdDate);
  writePlanRow(sh, sh.getLastRow() + 1, plan);
  return rowToPlan(planToRow(plan));
}

function updatePlan(p) {
  if (!p || !p.planId) throw new Error("planId diperlukan");
  var sh = getPlansSheet();
  var row = findTradeRow(sh, p.planId);
  if (row < 0) throw new Error("Plan tidak dijumpai: " + p.planId);
  var plan = rowToPlan(sh.getRange(row, 1, 1, PLAN_COLS.length).getValues()[0]);
  PLAN_COLS.forEach(function (c) { if (c !== "planId" && p[c] !== undefined) plan[c] = p[c]; });
  plan.stockName = String(plan.stockName).trim().toUpperCase();
  plan.entryType = plan.entryType === "BREAKOUT" ? "BREAKOUT" : "PULLBACK";
  plan.status = String(plan.status).toUpperCase() === "EXECUTED" ? "EXECUTED" : "WAITING";
  plan.updatedDate = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  validatePlanData(plan);
  writePlanRow(sh, row, plan);
  return rowToPlan(planToRow(plan));
}

function deletePlan(p) {
  if (!p || !p.planId) throw new Error("planId diperlukan");
  var sh = getPlansSheet();
  var row = findTradeRow(sh, p.planId);
  if (row < 0) throw new Error("Plan tidak dijumpai: " + p.planId);
  sh.deleteRow(row);
  return true;
}

/* ===================== IPO (PERMOHONAN & BALLOT) ===================== */

function getIposSheet() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(SHEETS.IPOS);
  if (!sh) {
    sh = ensureSheet(ss, SHEETS.IPOS, IPO_COLS);
    sh.getRange(2, 1, sh.getMaxRows() - 1, IPO_COLS.length).setNumberFormat("@");
    IPO_NUM_COLS.forEach(function (c) {
      sh.getRange(2, IPO_COLS.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat("General");
    });
  }
  return sh;
}

function rowToIpo(row) {
  var o = {};
  IPO_COLS.forEach(function (c, i) {
    var v = row[i];
    if (IPO_DATE_COLS.indexOf(c) > -1) o[c] = toDateStr(v);
    else if (IPO_NUM_COLS.indexOf(c) > -1) o[c] = toNum(v);
    else o[c] = (v === null || v === undefined) ? "" : String(v);
  });
  return o;
}

function ipoToRow(o) {
  return IPO_COLS.map(function (c) {
    var v = o[c];
    if (IPO_DATE_COLS.indexOf(c) > -1) return toDateStr(v);
    if (IPO_NUM_COLS.indexOf(c) > -1) return (v === "" || v === null || v === undefined) ? "" : toNum(v);
    return (v === null || v === undefined) ? "" : String(v);
  });
}

function writeIpoRow(sh, row, o) {
  sh.getRange(row, 1, 1, IPO_COLS.length).setNumberFormat("@");
  sh.getRange(row, 1, 1, IPO_COLS.length).setValues([ipoToRow(o)]);
  IPO_NUM_COLS.forEach(function (c) { sh.getRange(row, IPO_COLS.indexOf(c) + 1).setNumberFormat("General"); });
}

function getIpos() {
  var sh = getIposSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, IPO_COLS.length).getValues()
    .filter(function (r) { return String(r[0]).trim() !== ""; })
    .map(rowToIpo);
}

function generateUniqueIpoId(dateStr) {
  var sh = getIposSheet();
  var d = dateStr ? toDateStr(dateStr) : Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  var prefix = "IPO-" + d.replace(/-/g, "") + "-";
  var last = sh.getLastRow();
  var n = 0;
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { if (String(r[0]).indexOf(prefix) === 0) n++; });
  }
  var id;
  do { n++; id = prefix + ("00" + n).slice(-3); } while (findTradeRow(sh, id) > -1);
  return id;
}

function validateIpoData(d) {
  if (!d) throw new Error("Data kosong");
  if (!String(d.stockName || "").trim()) throw new Error("Nama saham IPO diperlukan");
  if (!toDateStr(d.appliedDate)) throw new Error("Tarikh mohon diperlukan");
  if (!(toNum(d.ipoPrice) > 0)) throw new Error("Harga IPO tidak sah");
  if (!(toNum(d.appliedQty) > 0)) throw new Error("Kuantiti dipohon tidak sah");
  if (toDateStr(d.ballotDate) && toDateStr(d.ballotDate) < toDateStr(d.appliedDate)) throw new Error("Tarikh ballot sebelum tarikh mohon");
  var st = String(d.status || "APPLIED").toUpperCase();
  if (st === "ALLOTTED") {
    if (!(toNum(d.allottedQty) > 0) || toNum(d.allottedQty) > toNum(d.appliedQty)) throw new Error("Kuantiti diperuntukkan mesti antara 1 dan kuantiti dipohon");
  }
}

function normalizeIpoStatus(v) {
  var st = String(v || "APPLIED").toUpperCase();
  return (st === "ALLOTTED" || st === "UNSUCCESSFUL") ? st : "APPLIED";
}

function createIpo(p) {
  var sh = getIposSheet();
  var o = {};
  IPO_COLS.forEach(function (c) { o[c] = p && p[c] !== undefined ? p[c] : ""; });
  o.stockName = String(o.stockName).trim().toUpperCase();
  o.status = "APPLIED"; o.allottedQty = 0; o.tradeId = "";
  o.appliedDate = toDateStr(o.appliedDate);
  validateIpoData(o);
  o.updatedDate = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  if (!o.ipoId || findTradeRow(sh, o.ipoId) > -1) o.ipoId = generateUniqueIpoId(o.appliedDate);
  writeIpoRow(sh, sh.getLastRow() + 1, o);
  return rowToIpo(ipoToRow(o));
}

function updateIpo(p) {
  if (!p || !p.ipoId) throw new Error("ipoId diperlukan");
  var sh = getIposSheet();
  var row = findTradeRow(sh, p.ipoId);
  if (row < 0) throw new Error("IPO tidak dijumpai: " + p.ipoId);
  var o = rowToIpo(sh.getRange(row, 1, 1, IPO_COLS.length).getValues()[0]);
  IPO_COLS.forEach(function (c) { if (c !== "ipoId" && p[c] !== undefined) o[c] = p[c]; });
  o.stockName = String(o.stockName).trim().toUpperCase();
  o.status = normalizeIpoStatus(o.status);
  if (o.status === "UNSUCCESSFUL") o.allottedQty = 0;
  validateIpoData(o);
  o.updatedDate = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  writeIpoRow(sh, row, o);
  return rowToIpo(ipoToRow(o));
}

function deleteIpo(p) {
  if (!p || !p.ipoId) throw new Error("ipoId diperlukan");
  var sh = getIposSheet();
  var row = findTradeRow(sh, p.ipoId);
  if (row < 0) throw new Error("IPO tidak dijumpai: " + p.ipoId);
  sh.deleteRow(row);
  return true;
}

/* ===================== PENYIMPAN GENERIK (CAPITAL, STUDIES) ===================== */

function getStoreSheet(name, cols, numCols) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ensureSheet(ss, name, cols);
    sh.getRange(2, 1, sh.getMaxRows() - 1, cols.length).setNumberFormat("@");
    numCols.forEach(function (c) { sh.getRange(2, cols.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat("General"); });
  }
  migrateColumns(sh, cols, numCols);
  return sh;
}

function rowToObj(row, cols, dateCols, numCols) {
  var o = {};
  cols.forEach(function (c, i) {
    var v = row[i];
    if (dateCols.indexOf(c) > -1) o[c] = toDateStr(v);
    else if (numCols.indexOf(c) > -1) o[c] = toNum(v);
    else o[c] = (v === null || v === undefined) ? "" : String(v);
  });
  return o;
}

function objToRow(o, cols, dateCols, numCols) {
  return cols.map(function (c) {
    var v = o[c];
    if (dateCols.indexOf(c) > -1) return toDateStr(v);
    if (numCols.indexOf(c) > -1) return (v === "" || v === null || v === undefined) ? "" : toNum(v);
    return (v === null || v === undefined) ? "" : String(v);
  });
}

function writeObjRow(sh, row, o, cols, dateCols, numCols) {
  sh.getRange(row, 1, 1, cols.length).setNumberFormat("@");
  sh.getRange(row, 1, 1, cols.length).setValues([objToRow(o, cols, dateCols, numCols)]);
  numCols.forEach(function (c) { sh.getRange(row, cols.indexOf(c) + 1).setNumberFormat("General"); });
}

function listStore(sh, cols, dateCols, numCols) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, cols.length).getValues()
    .filter(function (r) { return String(r[0]).trim() !== ""; })
    .map(function (r) { return rowToObj(r, cols, dateCols, numCols); });
}

function uniqueStoreId(sh, prefix, dateStr) {
  var d = dateStr ? toDateStr(dateStr) : Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  var pre = prefix + "-" + d.replace(/-/g, "") + "-";
  var last = sh.getLastRow(), n = 0;
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { if (String(r[0]).indexOf(pre) === 0) n++; });
  var id;
  do { n++; id = pre + ("00" + n).slice(-3); } while (findTradeRow(sh, id) > -1);
  return id;
}

function today() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }

/* ----- CAPITAL ----- */

function getCapitalSheet() { return getStoreSheet(SHEETS.CAPITAL, CAPITAL_COLS, CAPITAL_NUM_COLS); }
function getCapital() { return listStore(getCapitalSheet(), CAPITAL_COLS, CAPITAL_DATE_COLS, CAPITAL_NUM_COLS).map(function (c) { c.market = normMarket(c.market); return c; }); }

function createCapital(p) {
  var sh = getCapitalSheet();
  var o = {};
  CAPITAL_COLS.forEach(function (c) { o[c] = p && p[c] !== undefined ? p[c] : ""; });
  o.type = String(o.type).toUpperCase() === "WITHDRAW" ? "WITHDRAW" : "DEPOSIT";
  o.market = normMarket(o.market);
  o.date = toDateStr(o.date);
  if (!o.date) throw new Error("Tarikh diperlukan");
  if (!(toNum(o.amount) > 0)) throw new Error("Jumlah mesti lebih daripada 0");
  o.updatedDate = today();
  if (!o.capId || findTradeRow(sh, o.capId) > -1) o.capId = uniqueStoreId(sh, "CAP", o.date);
  writeObjRow(sh, sh.getLastRow() + 1, o, CAPITAL_COLS, CAPITAL_DATE_COLS, CAPITAL_NUM_COLS);
  return rowToObj(objToRow(o, CAPITAL_COLS, CAPITAL_DATE_COLS, CAPITAL_NUM_COLS), CAPITAL_COLS, CAPITAL_DATE_COLS, CAPITAL_NUM_COLS);
}

function deleteCapital(p) {
  if (!p || !p.capId) throw new Error("capId diperlukan");
  var sh = getCapitalSheet();
  var row = findTradeRow(sh, p.capId);
  if (row < 0) throw new Error("Rekod modal tidak dijumpai: " + p.capId);
  sh.deleteRow(row);
  return true;
}

/* ----- STUDIES ----- */

function getStudiesSheet() { return getStoreSheet(SHEETS.STUDIES, STUDY_COLS, STUDY_NUM_COLS); }
function getStudies() { return listStore(getStudiesSheet(), STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS); }

function validateStudy(o) {
  if (!String(o.stockName || "").trim()) throw new Error("Nama saham diperlukan");
  if (!toDateStr(o.studyDate)) throw new Error("Tarikh study diperlukan");
  var t = toNum(o.tradesTested), w = toNum(o.wins), l = toNum(o.losses), m = toNum(o.minutes);
  [t, w, l, m].forEach(function (v) { if (v < 0 || Math.floor(v) !== v) throw new Error("Trade, menang, kalah dan masa mesti nombor bulat 0 atau lebih"); });
  if (w + l > t) throw new Error("Menang + Kalah tidak boleh melebihi trade diuji");
  var u = toNum(o.understanding);
  if (!(u >= 1 && u <= 5) || Math.floor(u) !== u) throw new Error("Tahap kefahaman mesti 1 hingga 5");
  if (toDateStr(o.rangeFrom) && toDateStr(o.rangeTo) && toDateStr(o.rangeTo) < toDateStr(o.rangeFrom)) throw new Error("Tarikh akhir data backtest sebelum tarikh mula");
}

function createStudy(p) {
  var sh = getStudiesSheet();
  var o = {};
  STUDY_COLS.forEach(function (c) { o[c] = p && p[c] !== undefined ? p[c] : ""; });
  o.stockName = String(o.stockName).trim().toUpperCase();
  o.studyDate = toDateStr(o.studyDate);
  if (o.understanding === "") o.understanding = 3;
  validateStudy(o);
  o.updatedDate = today();
  if (!o.studyId || findTradeRow(sh, o.studyId) > -1) o.studyId = uniqueStoreId(sh, "STD", o.studyDate);
  writeObjRow(sh, sh.getLastRow() + 1, o, STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS);
  return rowToObj(objToRow(o, STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS), STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS);
}

function updateStudy(p) {
  if (!p || !p.studyId) throw new Error("studyId diperlukan");
  var sh = getStudiesSheet();
  var row = findTradeRow(sh, p.studyId);
  if (row < 0) throw new Error("Study tidak dijumpai: " + p.studyId);
  var o = rowToObj(sh.getRange(row, 1, 1, STUDY_COLS.length).getValues()[0], STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS);
  STUDY_COLS.forEach(function (c) { if (c !== "studyId" && p[c] !== undefined) o[c] = p[c]; });
  o.stockName = String(o.stockName).trim().toUpperCase();
  validateStudy(o);
  o.updatedDate = today();
  writeObjRow(sh, row, o, STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS);
  return rowToObj(objToRow(o, STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS), STUDY_COLS, STUDY_DATE_COLS, STUDY_NUM_COLS);
}

function deleteStudy(p) {
  if (!p || !p.studyId) throw new Error("studyId diperlukan");
  var sh = getStudiesSheet();
  var row = findTradeRow(sh, p.studyId);
  if (row < 0) throw new Error("Study tidak dijumpai: " + p.studyId);
  sh.deleteRow(row);
  return true;
}

/* ----- KNOWLEDGE (ILMU) ----- */

function getKnowledgeSheet() { return getStoreSheet(SHEETS.KNOWLEDGE, KNOW_COLS, KNOW_NUM_COLS); }
function knRow(o) { return rowToObj(objToRow(o, KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS), KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS); }
function getKnowledge() {
  return listStore(getKnowledgeSheet(), KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS);
}

function driveIdFromUrl(url) {
  var m = /[?&]id=([\w-]+)/.exec(String(url || ""));
  return m ? m[1] : "";
}

function trashImage(url) {
  var id = driveIdFromUrl(url);
  if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
}

// Simpan gambar (data URL) ke Google Drive; pulangkan URL kecil untuk dipaparkan. Perlu kebenaran Drive (sekali sahaja).
function saveImageToDrive(dataUrl, knId) {
  var m = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+\/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw new Error("Format gambar tidak sah");
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Gambar terlalu besar (maks 1.5MB)");
  var mime = "image/" + m[1], ext = m[1] === "jpeg" ? "jpg" : m[1];
  var folders = DriveApp.getFoldersByName(IMAGE_FOLDER);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(IMAGE_FOLDER);
  var file = folder.createFile(Utilities.newBlob(bytes, mime, knId + "." + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200";
}

function validateKnowledge(o) {
  if (!String(o.title || "").trim()) throw new Error("Tajuk diperlukan");
  if (String(o.title).length > 120) throw new Error("Tajuk maksimum 120 aksara");
  if (String(o.content || "").length > 5000) throw new Error("Nota maksimum 5000 aksara");
  if (!toDateStr(o.date)) throw new Error("Tarikh diperlukan");
  if (!String(o.content || "").trim() && !o.imageUrl) throw new Error("Isi nota atau lampirkan gambar");
}

function pinnedElsewhere(sh, knId) {
  return listStore(sh, KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS).filter(function (k) { return k.pinned === 1 && k.knId !== knId; }).length;
}

function createKnowledge(p) {
  var sh = getKnowledgeSheet();
  var o = {};
  KNOW_COLS.forEach(function (c) { o[c] = p && p[c] !== undefined ? p[c] : ""; });
  o.title = String(o.title).trim();
  o.category = String(o.category || "Prinsip").trim() || "Prinsip";
  o.date = toDateStr(o.date);
  o.pinned = (o.pinned === 1 || o.pinned === "1" || o.pinned === true) ? 1 : 0;
  o.imageUrl = ""; // URL klien tidak dipercayai; hanya imageData diterima
  if (!o.knId || findTradeRow(sh, o.knId) > -1) o.knId = uniqueStoreId(sh, "KN", o.date);
  if (p && p.imageData) o.imageUrl = "pending";
  validateKnowledge(o);
  if (o.pinned && pinnedElsewhere(sh, o.knId) >= MAX_PINNED) throw new Error("Maksimum " + MAX_PINNED + " ilmu boleh dipin");
  o.imageUrl = p && p.imageData ? saveImageToDrive(p.imageData, o.knId) : "";
  o.updatedDate = today();
  writeObjRow(sh, sh.getLastRow() + 1, o, KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS);
  return knRow(o);
}

function updateKnowledge(p) {
  if (!p || !p.knId) throw new Error("knId diperlukan");
  var sh = getKnowledgeSheet();
  var row = findTradeRow(sh, p.knId);
  if (row < 0) throw new Error("Ilmu tidak dijumpai: " + p.knId);
  var o = rowToObj(sh.getRange(row, 1, 1, KNOW_COLS.length).getValues()[0], KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS);
  var oldUrl = o.imageUrl;
  ["date", "title", "category", "content"].forEach(function (c) { if (p[c] !== undefined) o[c] = p[c]; });
  if (p.pinned !== undefined) o.pinned = (p.pinned === 1 || p.pinned === "1" || p.pinned === true) ? 1 : 0;
  o.title = String(o.title).trim();
  o.category = String(o.category || "Prinsip").trim() || "Prinsip";
  o.date = toDateStr(o.date);
  var clear = p.imageUrl !== undefined && String(p.imageUrl) === "" && !p.imageData;
  if (clear) o.imageUrl = "";
  validateKnowledge(Object.assign({}, o, p.imageData ? { imageUrl: "pending" } : {}));
  if (o.pinned && pinnedElsewhere(sh, o.knId) >= MAX_PINNED) throw new Error("Maksimum " + MAX_PINNED + " ilmu boleh dipin");
  if (p.imageData) o.imageUrl = saveImageToDrive(p.imageData, o.knId);
  if (oldUrl && oldUrl !== o.imageUrl) trashImage(oldUrl);
  o.updatedDate = today();
  writeObjRow(sh, row, o, KNOW_COLS, KNOW_DATE_COLS, KNOW_NUM_COLS);
  return knRow(o);
}

function deleteKnowledge(p) {
  if (!p || !p.knId) throw new Error("knId diperlukan");
  var sh = getKnowledgeSheet();
  var row = findTradeRow(sh, p.knId);
  if (row < 0) throw new Error("Ilmu tidak dijumpai: " + p.knId);
  var url = sh.getRange(row, KNOW_COLS.indexOf("imageUrl") + 1).getValue();
  sh.deleteRow(row);
  trashImage(url);
  return true;
}

/* ----- STOCKS (PROFIL SAHAM) ----- */

function getStocksSheet() { return getStoreSheet(SHEETS.STOCKS, STOCK_COLS, STOCK_NUM_COLS); }
function stockRow(o) { return rowToObj(objToRow(o, STOCK_COLS, STOCK_DATE_COLS, STOCK_NUM_COLS), STOCK_COLS, STOCK_DATE_COLS, STOCK_NUM_COLS); }
function getStocks() { return listStore(getStocksSheet(), STOCK_COLS, STOCK_DATE_COLS, STOCK_NUM_COLS); }

// Cipta atau kemas kini profil (upsert) mengikut nama saham. Semua medan selain nama adalah pilihan.
function saveStock(p) {
  var name = String(p && p.stockName || "").trim().toUpperCase();
  if (!name) throw new Error("Nama saham diperlukan");
  var o = { stockName: name };
  STOCK_COLS.forEach(function (c) { if (c !== "stockName") o[c] = p[c] !== undefined && p[c] !== null ? p[c] : ""; });
  o.sector = String(o.sector || "");
  if (o.sector && SECTORS.indexOf(o.sector) < 0) throw new Error("Sektor tidak sah");
  o.dividend = String(o.dividend || "").toUpperCase();
  if (o.dividend !== "YES" && o.dividend !== "NO") o.dividend = "";
  STOCK_TEXT_COLS.forEach(function (c) {
    o[c] = String(o[c] || "");
    if (o[c].length > 500) throw new Error("Ruangan " + c + " maksimum 500 aksara");
  });
  o.nextReportDate = o.nextReportDate ? toDateStr(o.nextReportDate) : "";
  if (o.nextReportDate && (!/^\d{4}-\d{2}-\d{2}$/.test(o.nextReportDate) || isNaN(new Date(o.nextReportDate + "T00:00:00Z").getTime()))) throw new Error("Tarikh laporan tidak sah");
  var empty = !o.sector && !o.dividend && !o.nextReportDate && STOCK_TEXT_COLS.every(function (c) { return !o[c]; });
  if (empty) throw new Error("Isi sekurang-kurangnya satu ruangan profil");
  o.updatedDate = today();
  var sh = getStocksSheet();
  var row = findTradeRow(sh, name);
  writeObjRow(sh, row > 0 ? row : sh.getLastRow() + 1, o, STOCK_COLS, STOCK_DATE_COLS, STOCK_NUM_COLS);
  return stockRow(o);
}

function deleteStock(p) {
  var name = String(p && p.stockName || "").trim().toUpperCase();
  if (!name) throw new Error("stockName diperlukan");
  var sh = getStocksSheet();
  var row = findTradeRow(sh, name);
  if (row < 0) throw new Error("Profil saham tidak dijumpai: " + name);
  sh.deleteRow(row);
  return true;
}

/* ----- COUNTERS (SENARAI KAUNTER) ----- */

function getCountersSheet() { return getStoreSheet(SHEETS.COUNTERS, COUNTER_COLS, []); }
function getCounters() { return listStore(getCountersSheet(), COUNTER_COLS, COUNTER_DATE_COLS, []); }

// Ganti keseluruhan senarai. Kod disimpan sebagai teks (kekalkan sifar di hadapan).
// Senarai import: kod tepat 4 digit, bukan waran. Tambahan manual (manual=1): 4 digit + hingga 2 huruf/angka (cth 5235SS).
// Sektor mesti dalam SECTORS, jika tidak dikosongkan.
function importCounters(p) {
  var list = p && p.counters;
  if (!Array.isArray(list)) throw new Error("Senarai kaunter diperlukan");
  if (list.length > MAX_COUNTERS) throw new Error("Terlalu banyak kaunter (maks " + MAX_COUNTERS + ")");
  var seen = {}, rows = [], d = today();
  list.forEach(function (c) {
    var manual = c && (c.manual === 1 || c.manual === true || String(c.manual) === "1") ? 1 : 0;
    var code = String(c && c.code || "").trim().toUpperCase();
    var name = cleanText(String(c && c.name || "").replace(/\s+/g, " ").trim().toUpperCase(), 60);
    var sector = String(c && c.sector || "").trim();
    if (SECTORS.indexOf(sector) < 0) sector = "";
    if (!(manual ? /^\d{4}[A-Z0-9]{0,2}$/ : /^\d{4}$/).test(code) || name.length < 2 || !/[A-Z]/.test(name)) return;
    if (!manual && (/-\s?(W[A-Z]|C\d+)$/.test(name) || /\bWARRANT/.test(name))) return;
    if (seen[code]) return;
    seen[code] = true;
    rows.push([code, name, d, sector, manual ? "1" : ""]);
  });
  var sh = getCountersSheet();
  var maxRows = sh.getMaxRows();
  if (sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, COUNTER_COLS.length).clearContent();
  if (rows.length) {
    if (maxRows < rows.length + 1) sh.insertRowsAfter(maxRows, rows.length + 1 - maxRows);
    sh.getRange(2, 1, rows.length, COUNTER_COLS.length).setNumberFormat("@");
    sh.getRange(2, 1, rows.length, COUNTER_COLS.length).setValues(rows);
  }
  return { count: rows.length };
}

/* ===================== SETUP / STRATEGI ===================== */

function addSetup(p) {
  var name = String(p && p.name || "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) throw new Error("Nama setup diperlukan");
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(SHEETS.SETUPS);
  if (!sh) sh = ensureSheet(ss, SHEETS.SETUPS, ["setup"]);
  if (sh.getLastRow() < 2) fillList(sh, DEFAULT_SETUPS); // elak senarai lalai hilang bila setup pertama ditambah
  var list = getList(SHEETS.SETUPS, DEFAULT_SETUPS);
  var lower = name.toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (list[i].toLowerCase() === lower) return { name: list[i], setups: list };
  }
  sh.getRange(sh.getLastRow() + 1, 1, 1, 1).setValues([[name]]);
  list.push(name);
  return { name: name, setups: list };
}

/* ===================== SETTINGS ===================== */

function getSettings() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(SHEETS.SETTINGS);
  var out = {};
  for (var k in DEFAULT_SETTINGS) out[k] = DEFAULT_SETTINGS[k];
  for (var t in TEXT_SETTINGS) out[t] = TEXT_SETTINGS[t];
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    var key = String(r[0]).trim();
    if (key && DEFAULT_SETTINGS.hasOwnProperty(key) && r[1] !== "" && !isNaN(Number(r[1]))) out[key] = Number(r[1]);
    else if (key && TEXT_SETTINGS.hasOwnProperty(key)) out[key] = cleanText(r[1]);
  });
  return out;
}

function saveSettings(p) {
  if (!p) throw new Error("Data kosong");
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sh) { initDatabase(); sh = ss.getSheetByName(SHEETS.SETTINGS); }
  var current = getSettings();
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (p[k] !== undefined && p[k] !== "" && !isNaN(Number(p[k]))) current[k] = Number(p[k]);
  });
  Object.keys(TEXT_SETTINGS).forEach(function (k) { if (p[k] !== undefined) current[k] = cleanText(p[k]); });
  var rows = allSettingKeys().map(function (k) { return [k, current[k]]; });
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, rows.length), 2).clearContent();
  sh.getRange(2, 1, rows.length, 2).setNumberFormat("@").setValues(rows);
  return current;
}

function getList(name, fallback) {
  var sh = getSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return fallback;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (s) { return s; });
  return vals.length ? vals : fallback;
}

/* ===================== ROUTER ===================== */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getDashboardData";
    switch (action) {
      case "ping":
        return ok({ message: "pong" });
      case "getTrades":
        return ok({ trades: getTrades() });
      case "getSettings":
        return ok({ settings: getSettings() });
      case "getPlans":
        return ok({ plans: getPlans() });
      case "getIpos":
        return ok({ ipos: getIpos() });
      case "getCapital":
        return ok({ capital: getCapital() });
      case "getStudies":
        return ok({ studies: getStudies() });
      case "getKnowledge":
        return ok({ knowledge: getKnowledge() });
      case "getStocks":
        return ok({ stocks: getStocks() });
      case "getCounters":
        return ok({ counters: getCounters() });
      case "getSetups":
        return ok({ setups: getList(SHEETS.SETUPS, DEFAULT_SETUPS) });
      case "getDashboardData":
        return ok({
          trades: getTrades(),
          plans: getPlans(),
          ipos: getIpos(),
          capital: getCapital(),
          studies: getStudies(),
          knowledge: getKnowledge(),
          stocks: getStocks(),
          counters: getCounters(),
          settings: getSettings(),
          setups: getList(SHEETS.SETUPS, DEFAULT_SETUPS),
          exitReasons: getList(SHEETS.EXIT_REASONS, DEFAULT_EXITS),
          mistakes: getList(SHEETS.MISTAKES, DEFAULT_MISTAKES)
        });
      default:
        return fail("Action tidak dikenali: " + action);
    }
  } catch (err) {
    return fail(err.message || err);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (!e || !e.postData || !e.postData.contents) return fail("Permintaan kosong");
    var req = JSON.parse(e.postData.contents);
    var action = req.action;
    var p = req.payload || {};
    switch (action) {
      case "createTrade": return ok({ trade: createTrade(p) });
      case "updateTrade": return ok({ trade: updateTrade(p) });
      case "closeTrade":  return ok({ trade: closeTrade(p) });
      case "deleteTrade": deleteTrade(p); return ok();
      case "createPlan":  return ok({ plan: createPlan(p) });
      case "updatePlan":  return ok({ plan: updatePlan(p) });
      case "deletePlan":  deletePlan(p); return ok();
      case "createIpo":   return ok({ ipo: createIpo(p) });
      case "updateIpo":   return ok({ ipo: updateIpo(p) });
      case "deleteIpo":   deleteIpo(p); return ok();
      case "createCapital": return ok({ capital: createCapital(p) });
      case "deleteCapital": deleteCapital(p); return ok();
      case "createStudy": return ok({ study: createStudy(p) });
      case "updateStudy": return ok({ study: updateStudy(p) });
      case "deleteStudy": deleteStudy(p); return ok();
      case "createKnowledge": return ok({ knowledge: createKnowledge(p) });
      case "updateKnowledge": return ok({ knowledge: updateKnowledge(p) });
      case "deleteKnowledge": deleteKnowledge(p); return ok();
      case "saveStock":   return ok({ stock: saveStock(p) });
      case "deleteStock": deleteStock(p); return ok();
      case "importCounters": return ok(importCounters(p));
      case "addSetup":    return ok(addSetup(p));
      case "saveSettings": return ok({ settings: saveSettings(p) });
      default: return fail("Action tidak dikenali: " + action);
    }
  } catch (err) {
    return fail(err.message || err);
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
