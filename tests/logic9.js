// Ujian: eksport CSV (semua pasaran, lajur market, formula injection), senarai exit/mistake dari server, label kalkulator
const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
let blobs=[], clicked=0;
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null,
  createElement:()=>({click(){clicked++},remove(){}}),body:{appendChild(){}}};
global.Blob=class{constructor(p){this.p=p;blobs.push(p.join(''))}};
global.URL={createObjectURL:()=>'blob:x',revokeObjectURL(){}};
global.Chart=function(){}; global.FileReader=class{};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.showToast=()=>{}; return a};
const parse=csv=>csv.replace(/^﻿/,'').split('\n').map(l=>l.match(/"((?:[^"]|"")*)"|[^,]+/g).map(x=>x.replace(/^"|"$/g,'').replace(/""/g,'"')));
(async()=>{
 let a=mk(); await a.loadData();
 // tambah trade US
 a.setMarket('US');
 a.form={...a.emptyForm(),stockName:'aapl',buyPrice:100,quantity:10,stopLoss:95,openDate:'2026-10-31'}; await a.submitAddTrade();
 ok(a.trades.some(t=>t.stockName==='AAPL'),'trade US ditambah');
 a.exportCSV();
 let rows=parse(blobs.pop()); const hdr=rows[0];
 ok(hdr[1]==='market','lajur market dalam header');
 const mi=hdr.indexOf('market'), si=hdr.indexOf('stockName');
 ok(rows.some(r=>r[si]==='AAPL'&&r[mi]==='US'),'eksport dari mod US: AAPL (US) ada');
 ok(rows.some(r=>r[si]==='MAYBANK'&&r[mi]==='MY'),'eksport dari mod US: MAYBANK (MY) turut ada');
 ok(rows.length-1===a.allOf('trades').length,'bilangan baris = semua trade merentas pasaran ('+(rows.length-1)+')');
 ok(clicked===1,'muat turun dicetuskan');
 a.setMarket('MY'); a.exportCSV(); const csvMY=blobs.pop();
 ok(csvMY.charCodeAt(0)===0xfeff,'CSV bermula dengan BOM UTF-8 (Excel baca BM dengan betul)');
 ok(parse(csvMY).length-1===a.allOf('trades').length,'eksport dari mod MY juga semua pasaran');
 // formula injection
 const out=a.tradesCSV([{notes:'=HYPERLINK("http://x")',lesson:'+cmd',setup:'@SUM(A1)',netPL:-208,grossPL:'-12.5',mistake:'-tiada nombor',tradeId:'TRD-1'}],['tradeId','notes','lesson','setup','netPL','grossPL','mistake']);
 const r=parse(out)[1];
 ok(r[1].startsWith("'=")&&r[2].startsWith("'+")&&r[3].startsWith("'@"),'teks =,+,@ dineutralkan');
 ok(r[4]==='-208'&&r[5]==='-12.5','nombor negatif tidak diubah');
 ok(r[6]==="'-tiada nombor",'teks bermula - (bukan nombor) dineutralkan');
 ok(out.includes('""http://x""'),'petikan berganda di-escape');
 // senarai dari server
 global.fetch=async()=>({json:async()=>({status:'success',trades:[],plans:[],ipos:[],capital:[],studies:[],knowledge:[],stocks:[],counters:[],settings:{},setups:['Breakout'],
   exitReasons:['Target TP1',' Stop Loss ','','Stop Loss','Exit Khas'],mistakes:['Tiada','Saiz Posisi Terlalu Besar','Revenge Trade']})});
 let b=mk(); b.gasUrl='https://script.google.com/x/exec'; await b.loadData();
 ok(JSON.stringify(b.exitReasons)===JSON.stringify(['Target TP1','Stop Loss','Exit Khas']),'exitReasons dari server (trim, buang kosong & duplikat)');
 ok(b.mistakes.includes('Revenge Trade')&&b.mistakes.length===3,'mistakes dari server');
 global.fetch=async()=>({json:async()=>({status:'success',trades:[],settings:{}})});
 let c=mk(); c.gasUrl='https://script.google.com/x/exec'; await c.loadData();
 ok(c.mistakes.includes('Saiz Posisi Terlalu Besar')&&c.exitReasons.length===7,'tiada senarai dari server: guna lalai');
 const gs=fs.readFileSync('Code.gs','utf8'); const m=/DEFAULT_MISTAKES = (\[.*?\]);/.exec(gs);
 ok(JSON.stringify(JSON.parse(m[1]))===JSON.stringify(c.mistakes),'lalai mistakes klien = Code.gs');
 const e=/DEFAULT_EXITS = (\[.*?\]);/.exec(gs); ok(JSON.stringify(JSON.parse(e[1]))===JSON.stringify(c.exitReasons),'lalai exitReasons klien = Code.gs');
 // label kalkulator
 const html=fs.readFileSync('src.html','utf8'); ok(!html.includes('Modal (MYR)')&&html.includes('Modal (<span x-text="curCode"></span>)'),'label Modal kalkulator ikut mata wang');
 console.log(fails?('GAGAL: '+fails):'SEMUA LULUS'); if(fails)process.exitCode=1;
})();
