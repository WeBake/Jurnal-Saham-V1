// Senarai saham terbina (SC Mei 2026) + carian + sektor automatik + tambahan manual
const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
global.FileReader=class{readAsText(f){setTimeout(()=>{this.result=f.text;this.onload()},0)}};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; return a};
(async()=>{
const a=mk(); await a.loadData();
// senarai terbina
const B=a.builtinCounters;
ok(B.length===849&&a.ctUsingBuiltin&&a.ctList.length===849,'849 saham terbina, digunakan bila senarai kosong');
ok(B.every(c=>/^\d{4}$/.test(c.code)&&c.name.length>=2&&a.sectorsMY.includes(c.sector)),'setiap saham ada kod 4 digit, nama dan sektor sah');
ok(new Set(B.map(c=>c.code)).size===849,'kod unik');
const ten=a.findCounter('5347'); ok(ten&&ten.name==='TENAGA NASIONAL BHD'&&ten.sector==='Utilities','5347 = Tenaga Nasional Bhd, Utilities');
ok(a.findCounter('0001').name==='SUPERCOMNET TECHNOLOGIES BHD'&&a.findCounter('0001').sector==='Healthcare','sifar di hadapan kekal (0001), sektor ikut fail');
ok(a.findCounter("D'NONCE TECHNOLOGY BHD")&&a.findCounter('MR D.I.Y. GROUP (M) BHD').sector==='Consumer Products & Services','nama dengan aksara khas dipadankan');
// carian
let m=a.stockMatches('5347'); ok(m[0].code==='5347','cari ikut kod: padanan tepat di atas');
m=a.stockMatches('53'); ok(m.length===8&&m.every(c=>c.code.startsWith('53')),'awalan kod: maks 8 cadangan');
m=a.stockMatches('tenaga'); ok(m[0].code==='5347','cari ikut nama (huruf kecil)');
m=a.stockMatches('diy'); ok(m.some(c=>c.code==='5296'),'cari ikut perkataan dalam nama (DIY)');
m=a.stockMatches('top glove'); ok(m[0].code==='7113','cari dua perkataan');
m=a.stockMatches('plantation'); ok(m.length>0&&m.every(c=>c.sector==='Plantation'||/PLANTATION/.test(c.name)),'cari ikut sektor');
ok(a.stockMatches('TENAGA NASIONAL BHD').length===0,'nama sudah tepat: senarai ditutup');
ok(a.stockMatches('').length===0&&a.stockMatches('zzzzqq').length===0,'kosong / tiada padanan');
ok(a.stockMatches('tenaga')===a.stockMatches('TENAGA'),'hasil carian di-cache');
ok(a.resolveCounter('5347')==='TENAGA NASIONAL BHD'&&a.resolveCounter('7113')==='TOP GLOVE CORPORATION BHD','taip kod -> nama penuh');
// petunjuk
ok(a.counterHint('TENAGA NASIONAL BHD').ok&&/Utilities/.test(a.counterHint('TENAGA NASIONAL BHD').text)&&/patuh syariah/.test(a.counterHint('5347').text),'petunjuk: kod · sektor · patuh syariah');
ok(!a.counterHint('TENAGA').ok&&/Mungkin TENAGA NASIONAL BHD/.test(a.counterHint('TENAGA').text),'nama ringkas: cadang nama penuh');
ok(!a.counterHint('MAYBANK').ok&&/Settings/.test(a.counterHint('MAYBANK').text),'tiada dalam senarai: arah ke Settings');
// sektor automatik
ok(a.sectorOf('TENAGA NASIONAL BHD')==='Utilities'&&a.sectorOf('5347')==='Utilities','sectorOf ikut senarai (nama/kod)');
ok(a.sectorOf('TENAGA')==='Utilities','nama ringkas lama yang unik (TENAGA) -> sektor senarai');
ok(a.sectorOf('SIME')==='','nama ringkas tidak unik (SIME) -> tiada teka');
ok(a.sectorOf('MAYBANK')==='Financial Services','profil saham sedia ada diutamakan');
a.stocks.push(a.normalizeStock({stockName:'TOP GLOVE CORPORATION BHD',sector:'Technology'})); ok(a.sectorOf('TOP GLOVE CORPORATION BHD')==='Technology','sektor profil (pilihan anda) menindih senarai');
a.stocks.push(a.normalizeStock({stockName:'GAMUDA BHD',sector:'',revenue:'x'})); ok(a.sectorOf('GAMUDA BHD')==='Construction','profil tanpa sektor -> guna senarai');
a.loadFund('KPJ HEALTHCARE BHD'); ok(a.fund.sector==='Healthcare'&&!a.fundDirty,'borang fundamental: sektor diisi automatik');
a.loadFund('GAMUDA BHD'); ok(a.fund.sector==='Construction'&&a.fund.revenue==='x','profil tanpa sektor: sektor diisi, data lain kekal');
// pendedahan sektor guna senarai
a.trades.push(a.normalize({tradeId:'T-CT1',openDate:'2026-11-01',stockName:'PRESS METAL ALUMINIUM HOLDINGS BHD',status:'OPEN',buyPrice:5,quantity:1000,stopLoss:4.5,market:'MY'}));
ok(a.sectorExposure.rows.some(r=>r.sector==='Industrial Products & Services'&&r.stocks.includes('PRESS METAL ALUMINIUM HOLDINGS BHD')),'Pendedahan Sektor ikut sektor senarai');
// US: tiada senarai
a.setMarket('US'); ok(a.stockMatches('tenaga').length===0&&a.counterHint('TENAGA NASIONAL BHD')===null&&a.sectorOf('META')!=='Consumer Products & Services','pasaran US: senarai Bursa tidak digunakan');
ok(a.ctLookup('5347').length===1,'Settings: semak senarai tetap berfungsi dalam mod US'); a.setMarket('MY');
// tambah manual
a.ctForm={code:'1155',name:'Malayan Banking Bhd',sector:'Financial Services'}; await a.saveCounterManual();
const mb=a.findCounter('1155'); ok(mb&&mb.manual===1&&mb.name==='MALAYAN BANKING BHD'&&a.counters.length===850&&!a.ctUsingBuiltin,'tambah manual: 850 saham, ditanda manual');
ok(a.ctManual.length===1&&a.sectorOf('MALAYAN BANKING BHD')==='Financial Services'&&a.counterHint('1155').ok&&/manual/.test(a.counterHint('1155').text),'saham manual: sektor & petunjuk');
ok(a.ctForm.code===''&&JSON.parse(localStorage.getItem('sj_counters')).length===850,'borang dikosongkan, disimpan dalam pelayar');
const bad=async(f,re,msg)=>{a.ctForm=f; const n=a.ctList.length; await a.saveCounterManual(); ok(re.test(a._t)&&a.ctList.length===n,msg+': '+a._t)};
await bad({code:'115',name:'X BHD',sector:'Utilities'},/4 digit/,'kod 3 digit ditolak');
await bad({code:'1156',name:'',sector:'Utilities'},/Nama/,'tanpa nama ditolak');
await bad({code:'1156',name:'ABC BHD',sector:''},/sektor/,'tanpa sektor ditolak');
await bad({code:'1156',name:'=HYPERLINK("x")',sector:'Utilities'},/aksara/,'formula ditolak');
await bad({code:'1156',name:'<b>x</b>',sector:'Utilities'},/aksara/,'tag HTML ditolak');
await bad({code:'1156',name:'tenaga nasional bhd',sector:'Utilities'},/5347/,'nama berganda (kod lain) ditolak');
a.ctForm={code:'5235ss',name:'KLCC Property Holdings',sector:'Real Estate Investment Trusts (REITs)'}; await a.saveCounterManual(); ok(a.findCounter('5235SS')&&a.findCounter('5235SS').sector==='Real Estate Investment Trusts (REITs)','kod stapled 5235SS dibenarkan untuk manual');
// edit saham asal
a.editCounter(a.findCounter('5347')); ok(a.ctForm.code==='5347'&&a.ctForm.sector==='Utilities','Edit: borang diisi');
a.ctForm.sector='Energy'; await a.saveCounterManual(); ok(a.findCounter('5347').sector==='Energy'&&a.findCounter('5347').manual===1&&a.ctList.length===851,'edit saham asal: sektor ditukar, jadi manual, tiada pendua');
// padam manual: kembali ke asal / buang
await a.removeCounterManual(a.findCounter('5347')); ok(a.findCounter('5347').sector==='Utilities'&&a.findCounter('5347').manual===0,'padam edit: kembali ke maklumat asal');
await a.removeCounterManual(a.findCounter('5235SS')); ok(!a.findCounter('5235SS')&&a.ctList.length===850,'padam tambahan baharu: dibuang');
// muat semula
const b=mk(); await b.loadData(); ok(b.counters.length===850&&b.findCounter('1155').manual===1&&b.findCounter('1155').sector==='Financial Services','kekal selepas muat semula');
// import: sektor dibaca, manual dikekalkan
const csv='﻿kod,nama,sektor\n5347,Tenaga Nasional Bhd,Utilities\n7113,Top Glove Corporation Bhd,healthcare\n0166,Inari Amertron Bhd,Sektor Pelik\n5099WA,AIRASIA-WA,Consumer Products & Services';
const pr=a.parseCounters(csv); ok(pr.list.length===3&&pr.withSector===2&&pr.warrants===1,'parse CSV 3 lajur (BOM, sektor tak sah dikosongkan)');
ok(pr.list.find(c=>c.code==='7113').sector==='Healthcare'&&pr.list.find(c=>c.code==='0166').sector===''&&pr.list.find(c=>c.code==='0166').name==='INARI AMERTRON BHD','sektor dipadankan tanpa kira huruf besar; nama bukan sektor');
a.counterText=csv; await a.importCounters(); ok(a.counters.length===4&&a.findCounter('1155').manual===1&&/dikekalkan/.test(a._t),'import ganti senarai, tambahan manual dikekalkan');
ok(a.parseCounters('1155,MAYBANK\n5347 TENAGA').list.every(c=>c.sector===''),'format lama 2 lajur masih diterima');
await a.clearCounters(); ok(a.ctList.length===850&&a.findCounter('1155').manual===1,'kembali ke senarai asal + manual dikekalkan');
// mod GAS
const g=mk(); await g.loadData(); g.gasUrl='http://x'; const calls=[]; g.api=async(act,p)=>{calls.push([act,p]);return {}};
g.ctForm={code:'1155',name:'MALAYAN BANKING BHD',sector:'Financial Services'}; await g.saveCounterManual();
const sent=calls[0]&&calls[0][1].counters; ok(calls[0][0]==='importCounters'&&sent.length===850&&sent.find(c=>c.code==='1155').manual===1&&sent.find(c=>c.code==='5347').sector==='Utilities'&&sent.find(c=>c.code==='5347').manual===0,'mod GAS: senarai penuh dengan sektor & manual dihantar');
ok(g.normalizeCounter({code:'0001',name:'x co',updatedDate:'2026-01-01'}).sector===''&&g.normalizeCounter({code:'1',name:'a',sector:'Utilities',manual:'1'}).manual===1,'data Sheet lama (3 lajur) dibaca');
g.api=async()=>{throw new Error('rangkaian')}; const n0=g.ctList.length; g.ctForm={code:'9998',name:'ABC BHD',sector:'Utilities'}; await g.saveCounterManual(); ok(g.ctList.length===n0&&/Gagal/.test(g._t),'ralat server: senarai tidak berubah');
console.log(fails?'ADA '+fails+' GAGAL':'SEMUA LULUS'); process.exit(fails?1:0);
})();
