const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; return a};
(async()=>{
const a=mk(); await a.loadData(); a.capitalLog.push(a.normalizeCapital({capId:'C0',date:'2026-11-01',type:'DEPOSIT',amount:20000}));
ok(a.sectors.length===13&&a.sectors[0]==='Financial Services'&&a.sectors[12]==='Real Estate Investment Trusts (REITs)','13 sektor tepat seperti senarai pengguna');
ok(a.stocks.length===18&&a.sectorOf('maybank')==='Financial Services'&&a.sectorOf(' TENAGA ')==='Utilities'&&a.sectorOf('XYZ')==='','profil demo & carian nama tidak sensitif huruf');
// laporan akan datang: PCHEM (trade OPEN, +12 hari). MAYBANK +24 hari tetapi tiada dalam plan/trade terbuka?
const up=a.upcomingReports; ok(up.some(x=>x.stockName==='PCHEM'&&x.days===12),'PCHEM (posisi terbuka) disenaraikan, 12 hari');
const mayInPlan=a.plans.some(p=>p.status==='WAITING'&&a.stockKey(p.stockName)==='MAYBANK'); ok(up.some(x=>x.stockName==='MAYBANK')===mayInPlan,'saham tanpa plan/posisi terbuka tidak disenaraikan');
ok(a.reportText(a.stocks.find(s=>s.stockName==='PCHEM').nextReportDate)==='12 hari lagi','teks countdown');
ok(a.reportText(new Date().toISOString().slice(0,10))!==undefined && a.daysUntil('')===null,'daysUntil kosong = null');
// ---- trade baharu TANPA sektor/fundamental: masih boleh simpan
a.openAddModal(); a.loadFund('NEWCO'); ok(!a.fundDirty&&a.fund.sector==='','profil kosong untuk saham baharu');
a.form={...a.form,stockName:'newco',buyPrice:2,quantity:1000,stopLoss:1.9}; const n0=a.trades.length; await a.submitAddTrade();
ok(a.trades.length===n0+1&&!a.findStock('NEWCO'),'simpan trade tanpa fundamental berjaya, tiada profil dicipta');
// ---- trade dengan sektor + fundamental separa
a.openAddModal(); a.form={...a.form,stockName:'sime',buyPrice:2,quantity:1000,stopLoss:1.9}; a.loadFund('sime');
a.fund.sector='Plantation'; a.fund.eps='20 sen'; a.fund.nextReportDate='2026-11-20'; a.fundDirty=true; await a.submitAddTrade();
const sp=a.findStock('SIME'); ok(sp&&sp.sector==='Plantation'&&sp.eps==='20 sen'&&sp.revenue===''&&sp.stockName==='SIME','profil disimpan bersama trade (nama huruf besar, medan kosong dibenarkan)');
ok(JSON.parse(localStorage.getItem('sj_stocks')).some(s=>s.stockName==='SIME'),'profil dalam localStorage');
ok(a.fundFilled(sp)===1,'kelengkapan 1/6');
// sektor tidak sah
a.openAddModal(); a.form={...a.form,stockName:'bad',buyPrice:2,quantity:1000,stopLoss:1.9}; a.loadFund('bad'); a.fund.sector='Crypto'; a.fundDirty=true; const n1=a.trades.length; await a.submitAddTrade();
ok(a.trades.length===n1&&/Sektor/.test(a._t),'sektor tidak sah menghalang simpan (tiada trade separuh jalan)');
a.fund.sector='Energy'; a.fund.revenue='x'.repeat(501); await a.submitAddTrade(); ok(a.trades.length===n1&&/500/.test(a._t),'teks >500 ditolak');
// muat semula profil sedia ada tidak menandakan kotor; tidak menulis ulang
a.loadFund('sime'); ok(a.fund.sector==='Plantation'&&!a.fundDirty,'profil sedia ada dimuat ke borang'); const before=JSON.stringify(a.stocks); await a.saveStockProfile('sime'); ok(JSON.stringify(a.stocks)===before,'tanpa perubahan: tiada tulisan semula');
a.loadFundIfClean('maybank'); ok(a.fund.stockName==='MAYBANK','tukar nama (belum diedit): profil dimuat semula'); a.fundDirty=true; a.loadFundIfClean('tenaga'); ok(a.fund.stockName==='MAYBANK','tukar nama (sudah diedit): suntingan tidak dibuang');
// ---- plan dengan profil
a.openPlanModal(); a.planForm={...a.planForm,stockName:'gamuda',entryPrice:5,stopLoss:4.7}; a.loadFund('gamuda'); ok(a.fund.sector==='Construction','plan: profil sedia ada dimuat');
a.fund.valuation='PE 14x'; a.fund.dividend='YES'; a.fundDirty=true; await a.submitPlan(); ok(a.findStock('GAMUDA').valuation==='PE 14x'&&a.findStock('GAMUDA').dividend==='YES'&&a.findStock('GAMUDA').sector==='Construction','plan: kemas kini profil tanpa hilang sektor');
ok(a.plans.some(p=>p.stockName==='GAMUDA'&&p.status==='WAITING'),'plan tersimpan');
// plan tanpa apa-apa fundamental
a.openPlanModal(); a.planForm={...a.planForm,stockName:'plain',entryPrice:3,stopLoss:2.8}; a.loadFund('plain'); const p0=a.plans.length; await a.submitPlan(); ok(a.plans.length===p0+1&&!a.findStock('PLAIN'),'plan tanpa fundamental: berjaya');
// ---- editor berasingan
a.openStockView('SIME'); ok(a.stockView.sector==='Plantation'&&a.showStockView,'lihat profil'); a.openStockView('nobody'); ok(a.stockView===null,'saham tanpa profil: paparan kosong dengan butang Tambah');
a.openStockEdit('SIME'); ok(a.showStockEdit&&!a.showStockView&&a.fundOpen&&!a.stockEditNew,'edit profil'); a.fund.dividend='NO'; a.fund.dividendNote='tiada'; await a.saveStockEdit(); ok(a.findStock('SIME').dividend==='NO'&&!a.showStockEdit,'edit disimpan');
a.openStockEdit('NEWSTOCK'); await a.saveStockEdit(); ok(a.showStockEdit&&!a.findStock('NEWSTOCK'),'profil kosong ditolak di editor');
a.fund.sector='Technology'; await a.saveStockEdit(); ok(a.findStock('NEWSTOCK').sector==='Technology','profil baharu dari editor');
a.openStockEdit('NEWSTOCK'); await a.confirmDeleteStock(); ok(!a.findStock('NEWSTOCK'),'padam profil');
// ---- kekal selepas muat semula; profil kosong dipadam
const b=mk(); await b.loadData(); ok(b.findStock('SIME')&&b.findStock('GAMUDA').valuation==='PE 14x','muat semula: profil kekal');
b.stocks=[]; b.saveLocal(); const c=mk(); await c.loadData(); ok(c.stocks.length===0,'kosong kekal kosong');
// ---- mod GAS
const g=mk(); g.gasUrl='http://x'; const calls=[]; g.api=async(act,p)=>{calls.push([act,p]);return act==='saveStock'?{stock:p}:{}};
g.stocks=[]; g.plans=[]; g.openPlanModal(); g.planForm={...g.planForm,stockName:'kpj',entryPrice:2,stopLoss:1.8}; g.loadFund('kpj'); g.fund.sector='Healthcare'; g.fundDirty=true; await g.submitPlan();
ok(calls.some(c=>c[0]==='createPlan')&&calls.some(c=>c[0]==='saveStock'&&c[1].stockName==='KPJ'&&c[1].sector==='Healthcare'),'mod GAS: hantar createPlan + saveStock');
g.loadFund('kpj'); g.fund=g.emptyFund('kpj'); await g.saveStockProfile('kpj',true); ok(calls.some(c=>c[0]==='deleteStock')&&!g.findStock('KPJ'),'mod GAS: profil dikosongkan -> deleteStock');
console.log(fails?('GAGAL '+fails):'SEMUA LULUS');
})();
