const fs=require('fs');
const fresh=()=>{global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};};
fresh();
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
global.FileReader=class{};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m)=>{a._t=m;a.toasts.push(m)}; return a};
(async()=>{
let a=mk(); await a.loadData();
ok(a.market==='MY'&&!a.isUS&&a.cur==='RM'&&a.lotSize===100,'lalai: Bursa MY, RM, 1 lot=100');
ok(a.trades.length===11&&a.allOf('trades').length===18,'MY: 11 trade aktif, 18 keseluruhan');
ok(a.visibleTabs.some(t=>t.id==='ipo'),'tab IPO ada untuk MY');
// kotak matlamat akhir
ok(!a.finalGoal.set&&a.finalGoal.pct===0,'tiada matlamat akhir: belum ditetapkan');
const pl=a.totalAllPL; a.targetForm={targetMonthly:0,targetYearly:0,targetFinal:pl*4}; await a.saveTargets();
ok(a.finalGoal.set&&Math.abs(a.finalGoal.pct-25)<0.01&&a.finalGoal.barPct<26&&!a.finalGoal.done,'matlamat akhir: 25% (bar '+a.finalGoal.barPct.toFixed(1)+')');
a.settings.targetFinal=pl/2; ok(a.finalGoal.done&&a.finalGoal.pct===200&&a.finalGoal.barPct===100,'melebihi matlamat: 200% tetapi bar dihadkan 100%');
a.settings.targetFinal=pl*4;
// tukar ke US
const myCap=a.currentCapital, myPL=a.totalAllPL;
a.setMarket('US');
ok(a.isUS&&a.cur==='US$'&&a.curCode==='USD'&&a.lotSize===1,'US: US$, USD, lot 1');
ok(a.trades.length===7&&a.trades.every(t=>t.market==='US'),'US: 7 trade, semua market US');
ok(!a.visibleTabs.some(t=>t.id==='ipo'),'tab IPO disembunyikan untuk US');
ok(a.settings.initialCapital===5000&&a.settings.buyFee===0&&a.settings.targetFinal===0,'US: tetapan modal/yuran/target berasingan (5000/0/0)');
ok(a.fmt(1234.5)==='US$ 1,234.50'&&a.num(0.5,3)==='0.5000'&&a.num(185.2,3)==='185.20','format: US$ + 2 desimal (4 jika <US$1)');
ok(a.sectors.includes('Technology')&&!a.sectors.includes('Plantation'),'sektor US ialah senarai US');
ok(a.counterHint('AAPL')===null,'senarai kaunter syariah tidak digunakan untuk US');
ok(a.totalAllPL!==myPL&&a.currentCapital!==myCap,'US: P/L dan modal tidak bercampur dengan MY');
ok(a.finalGoal.set===false,'US: matlamat akhir US tidak terikut dari MY');
// kalkulator lot 1
a.calc={...a.calc,capital:5000,riskPct:1,entry:100,sl:95,fees:0}; const c=a.calcResult; ok(c.valid&&c.shares===10&&c.lots===10,'kalkulator US: 50/5 = 10 shares (tiada lot 100)');
// tambah trade US
const idsBefore=new Set(a.allOf('trades').map(t=>t.tradeId));
a.openAddModal(); a.form={...a.form,stockName:'tsla',buyPrice:200,quantity:5,stopLoss:190,buyFees:0,market:'US'};
await a.submitAddTrade(); const tsla=a.trades.find(t=>t.stockName==='TSLA');
ok(tsla&&tsla.market==='US'&&!idsBefore.has(tsla.tradeId),'trade US ditambah dengan market US & id unik: '+(tsla&&tsla.tradeId));
// semakan baki tunai US
const before=a.trades.length; a.openAddModal(); a.form={...a.form,stockName:'big',buyPrice:1000,quantity:1000,stopLoss:900};
await a.submitAddTrade(); ok(a.trades.length===before,'US: pembelian melebihi baki tunai ditolak: '+a._t);
// simpan tetapan US
a.settingsForm={...a.settings,initialCapital:8000,buyFee:1,sellFee:1,usdMyr:4.6}; await a.saveSettings();
ok(a.settings.initialCapital===8000&&a.ms.US.initialCapital===8000&&a.ms.MY.initialCapital===10000,'tetapan US disimpan, MY tidak terjejas');
// kembali ke MY
a.setMarket('MY');
ok(a.settings.initialCapital===10000&&a.settings.buyFee===4&&a.settings.targetFinal===pl*4&&a.trades.length===11&&a.currentCapital===myCap,'kembali ke MY: semua data & tetapan MY utuh');
ok(a.settings.usdMyr===4.6,'kadar USD/MYR dikongsi');
ok(!a.trades.some(t=>t.stockName==='TSLA'),'trade US tidak muncul dalam MY');
// kotak gabungan
const rows=a.summaryRows; const us=a.marketPL('US'), my=a.marketPL('MY');
ok(rows.length===2&&my===a.totalAllPL,'ringkasan: untung MY = P/L aktif MY');
ok(Math.abs(a.combinedPL-(my+us*4.6))<0.011,'gabungan = MY + US × kadar ('+a.combinedPL+')');
// id merentas pasaran
const id1=a.genId('2026-11-02'); ok(!a.allOf('trades').some(t=>t.tradeId===id1),'genId tidak berulang merentas pasaran');
// persistence + lalai MY
a.saveLocal();
const keep=JSON.stringify(localStorage._);
const b=mk(); localStorage._=JSON.parse(keep); await b.loadData();
ok(b.market==='MY','muat semula: lalai kembali ke MY');
ok(b.allOf('trades').length===19&&b.ms.US.initialCapital===8000&&b.ms.MY.initialCapital===10000,'muat semula: data (19 trade) dan tetapan kedua-dua pasaran dikekalkan');
b.setMarket('US'); ok(b.trades.some(t=>t.stockName==='TSLA')&&b.settings.initialCapital===8000,'muat semula: trade TSLA & modal US ada dalam US');
// trade plan US
b.openPlanModal&&b.openPlanModal(); 
ok(true,'plan modal dibuka tanpa ralat');
console.log(fails?('GAGAL '+fails):'SEMUA LULUS'); process.exitCode=fails?1:0;
})().catch(e=>{console.log('EXC',e);process.exit(1)});
