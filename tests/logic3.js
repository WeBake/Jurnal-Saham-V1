const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; return a};
const iso=(off=0)=>{const d=new Date();d.setDate(d.getDate()+off);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
(async()=>{
const a=mk(); a.initApp && 0; await a.loadData();
// ---------- YURAN ----------
ok(a.settings.buyFee===4&&a.settings.sellFee===4,'tetapan lalai yuran RM4 beli / RM4 jual');
ok(a.calc.fees===8,'kalkulator: yuran pusingan lalai RM8');
ok(a.emptyForm().buyFees===4 && a.emptyCloseForm().fees===4,'borang beli lalai RM4, borang jual lalai RM4');
const mb=a.trades.find(t=>t.stockName==='MAYBANK'); ok(mb.buyFees===4&&mb.fees===4&&mb.netPL===500-8,'trade biasa: net = gross - 4 - 4 ('+mb.netPL+')');
const legacy=a.normalize({tradeId:'X',openDate:'2025-01-01',stockName:'OLD',status:'CLOSED',buyPrice:2,quantity:1000,stopLoss:1.9,sellPrice:2.1,fees:20,closeDate:'2025-01-05'});
ok(legacy.buyFees===0&&legacy.tradeType==='NORMAL'&&legacy.netPL===100-20,'data lama tanpa buyFees: net tidak berubah ('+legacy.netPL+')');
const ipoT=a.normalize({tradeId:'Y',openDate:'2026-01-01',stockName:'IPOX',status:'CLOSED',buyPrice:1.2,quantity:2000,stopLoss:1.0,sellPrice:1.5,fees:4,buyFees:0,tradeType:'IPO',closeDate:'2026-01-10'});
ok(ipoT.netPL===600-4,'trade IPO: net = gross - yuran jual sahaja ('+ipoT.netPL+')');
a.calc={name:'',capital:10000,riskPct:1,entry:5,sl:4.8,fees:8,tp1:5.3,tp2:5.4,tp3:5.6}; ok(Math.abs(a.calcResult.loss-108)<1e-6&&Math.abs(a.calcResult.tps[0].profit-142)<1e-6,'kalkulator ambil kira yuran RM8 (rugi 108, untung TP1 142)');
a.settingsForm={...a.settings,buyFee:5,sellFee:6}; await a.saveSettings(); ok(a.calc.fees===11&&a.emptyForm().buyFees===5&&a.emptyCloseForm().fees===6,'tukar yuran lalai dalam Settings: kalkulator & borang ikut');
a.settingsForm={...a.settings,buyFee:-1}; const before=a.settings.buyFee; await a.saveSettings(); ok(a.settings.buyFee===before,'yuran negatif ditolak');
a.settingsForm={...a.settings,buyFee:4,sellFee:4}; await a.saveSettings();

// ---------- FILTER BULAN / TAHUN ----------
ok(a.yearOptions.length===46&&a.yearOptions[0]===2025&&a.yearOptions[45]===2070,'tahun 2025-2070 (46 pilihan)');
ok(a.monthsFull.length===12&&a.monthsFull[0]==='Januari'&&a.monthsFull[11]==='Disember','bulan Januari-Disember');
a.filterYear='all';a.filterMonth='all'; const allN=a.kpi.total; ok(allN===10&&a.periodLabel==='Semua tempoh','semua tempoh: 10 trade');
a.filterYear='2026';a.filterMonth='all'; ok(a.kpi.total===10&&a.periodLabel==='Tahun 2026','tahun 2026');
a.filterYear='2025'; ok(a.kpi.total===0&&a.kpi.pl===0&&a.kpi.winRate===0,'tahun 2025: kosong tanpa ralat');
a.filterYear='2026';a.filterMonth='01'; ok(a.kpi.total===1&&a.periodLabel==='Januari 2026'&&a.kpi.wins===1,'Januari 2026: MAYBANK sahaja');
a.filterYear='all';a.filterMonth='03'; ok(a.kpi.total===2&&a.periodLabel==='Mac (semua tahun)','Mac semua tahun: GAMUDA & INARI (tutup Mac) = '+a.kpi.total);
a.filterYear='2026';a.filterMonth='all'; const md=a.monthlyData; ok(md.labels.length===12&&md.values.length===12&&md.labels[0]==='Jan'&&md.labels[11]==='Dis','carta bulanan: 12 bulan Jan-Dis bila tahun dipilih');
ok(Math.abs(md.values.reduce((x,y)=>x+y,0)-a.kpi.pl)<0.01,'jumlah carta = P/L tempoh ('+a.kpi.pl+')');
ok(md.values[1]!==0 && md.values[5]!==undefined && md.values[8]!==undefined,'bulan tanpa trade = 0');
a.filterYear='2026';a.filterMonth='10'; const eq=a.equityData; const first=eq.values[0], last=eq.values[eq.values.length-1];
ok(Math.abs(last-first-a.kpi.pl)<0.01 && Math.abs(last-a.currentCapital)<0.01,'lengkung ekuiti bermula dari modal sebelum tempoh ('+first+' -> '+last+')');
ok(a.inPeriod('')===false,'tarikh kosong tidak dalam tempoh');
a.setThisMonth(); const now=new Date(); ok(a.filterYear===String(now.getFullYear())&&a.filterMonth===String(now.getMonth()+1).padStart(2,'0'),'butang Bulan Ini');
a.resetFilter(); ok(a.filterYear==='all'&&a.filterMonth==='all','Reset filter');

// ---------- SETUP ----------
ok(a.setups.includes('IPO'),'senarai lalai ada setup IPO');
a.setupPick={open:'trade',q:'brea'}; ok(a.filteredSetups.length===1&&a.filteredSetups[0]==='Breakout'&&a.canAddSetup,'cari "brea" -> Breakout sahaja (+ pilihan tambah "brea")');
a.setupPick={open:'trade',q:'BREAKOUT'}; ok(!a.canAddSetup,'padanan tepat (huruf besar) tidak boleh ditambah semula');
a.setupPick={open:'trade',q:'zzz'}; ok(a.filteredSetups.length===0&&a.canAddSetup,'tiada padanan -> boleh tambah');
a.form=a.emptyForm(); a.setupPick={open:'trade',q:'  Momentum   Play '}; await a.addSetupFromQuery('trade');
ok(a.setups.includes('Momentum Play')&&a.form.setup==='Momentum Play'&&a.setupPick.open===null,'tambah setup baharu (ruang dinormalkan) & terus dipilih');
const nBefore=a.setups.length; a.setupPick={open:'trade',q:'breakout'}; await a.addSetupFromQuery('trade'); ok(a.setups.length===nBefore&&a.form.setup==='Breakout','tambah "breakout" -> guna sedia ada, tiada pendua');
a.planForm=a.emptyPlan(); a.setupPick={open:'plan',q:'Gap Up'}; await a.addSetupFromQuery('plan'); ok(a.planForm.setup==='Gap Up'&&a.form.setup==='Breakout','pemilih setup dalam modal Plan berfungsi berasingan');
a.setupPick={open:'trade',q:'pull'}; a.chooseTypedSetup('trade'); ok(a.form.setup==='Pullback','Enter pada carian separa -> pilih padanan pertama');
a.setupPick={open:'trade',q:'Strategi Baru X'}; a.chooseTypedSetup('trade'); await new Promise(r=>setTimeout(r,5)); ok(a.setups.includes('Strategi Baru X')&&a.form.setup==='Strategi Baru X','Enter tanpa padanan -> tambah baharu');
a.pickSetup('trade',''); ok(a.form.setup==='','kosongkan pilihan');
ok(a.normSetupName('x'.repeat(80)).length===40,'nama setup dihadkan 40 aksara');
ok(JSON.parse(localStorage.getItem('sj_setups')).includes('Momentum Play'),'setup disimpan dalam localStorage');
const b=mk(); b.loadLocal(); ok(b.setups.includes('Momentum Play')&&b.setups.includes('Gap Up'),'setup kekal selepas muat semula');
b.trades.push(b.normalize({tradeId:'Z',openDate:'2026-01-01',stockName:'Q',status:'OPEN',buyPrice:1,quantity:100,stopLoss:.9,setup:'Setup Lama Dalam Trade'})); b.mergeSetups(); ok(b.setups.includes('Setup Lama Dalam Trade'),'setup sedia ada dalam trade digabungkan ke senarai');

// ---------- IPO ----------
const c=mk(); c.loadLocal(); const st=c.ipoStats;
ok(c.ipos.length===2&&st.applied===1&&st.unsuccessful===1&&st.allotted===0&&st.rate===0&&st.tied===2400,'sample IPO: 1 menunggu (dana tertahan RM2400), kadar ballot 0%');
const n0=c.ipos.length; const bad=async(patch,re,m)=>{c.openIpoModal(); Object.assign(c.ipoForm,{stockName:'AAA',ipoPrice:1,appliedQty:1000,appliedDate:'2026-10-30'},patch); await c.submitIpo(); ok(c.ipos.length===n0&&re.test(c._t),m+' -> '+c._t); c.showIpoModal=false};
await bad({stockName:''},/nama/i,'nama kosong ditolak'); await bad({ipoPrice:0},/Harga IPO/,'harga 0 ditolak'); await bad({appliedQty:0},/Quantity/,'qty 0 ditolak');
await bad({ballotDate:'2026-10-01'},/ballot/i,'ballot sebelum mohon ditolak'); await bad({ballotDate:'2026-11-05',listingDate:'2026-11-01'},/penyenaraian/i,'listing sebelum ballot ditolak');
c.openIpoModal(); Object.assign(c.ipoForm,{stockName:'delta energy',ipoPrice:0.65,appliedQty:5000,appliedDate:'2026-10-31',ballotDate:'2026-11-06',listingDate:'2026-11-13'}); await c.submitIpo();
const d=c.ipos.find(p=>p.stockName==='DELTA ENERGY'); ok(d&&d.status==='APPLIED'&&d.ipoId==='IPO-20261031-001'&&!c.showIpoModal,'permohonan IPO disimpan, ID '+(d&&d.ipoId));
c.openIpoModal(d); c.ipoForm.appliedQty=4000; await c.submitIpo(); ok(c.ipos.length===n0+1&&c.ipos.find(p=>p.ipoId===d.ipoId).appliedQty===4000,'edit IPO (tiada pendua)');
ok(c.ipoStats.applied===2&&c.ipoStats.tied===r2(2400+0.65*4000),'dana tertahan dikira semula ('+c.ipoStats.tied+')');
function r2(v){return Math.round((v+Number.EPSILON)*100)/100}

// ballot tidak berjaya
const tN=c.trades.length; const dd=c.ipos.find(p=>p.ipoId===d.ipoId); c.openBallotModal(dd); c.ballotForm.result='UNSUCCESSFUL'; await c.submitBallot();
ok(dd.status==='UNSUCCESSFUL'&&dd.allottedQty===0&&c.trades.length===tN,'tidak berjaya: status dikemas kini, TIADA trade dicipta');
// reset ke APPLIED untuk ujian berjaya
const g=c.ipos.find(p=>p.stockName==='GAMMA TECH');
const tryBallot=async(patch,re,m)=>{c.openBallotModal(g); Object.assign(c.ballotForm,{result:'ALLOTTED',allottedQty:2000,buyDate:'2026-11-12',stopLoss:1.05},patch); const t=c.trades.length; await c.submitBallot(); ok(g.status==='APPLIED'&&c.trades.length===t&&re.test(c._t),m+' -> '+c._t); c.showBallotModal=false};
await tryBallot({allottedQty:3000},/Quantity/,'qty > dipohon ditolak'); await tryBallot({allottedQty:0},/Quantity/,'qty 0 ditolak');
await tryBallot({stopLoss:null},/Stop loss/,'tanpa SL ditolak'); await tryBallot({stopLoss:1.2},/Stop loss/,'SL >= harga IPO ditolak'); await tryBallot({buyDate:'2026-10-01'},/Tarikh/,'tarikh sebelum mohon ditolak');
c.openBallotModal(g); ok(c.ballotForm.allottedQty===2000&&c.ballotForm.result==='ALLOTTED','ballot modal: qty lalai = dipohon');
Object.assign(c.ballotForm,{allottedQty:1000,buyDate:'2026-11-12',stopLoss:1.05,tp1:1.5,tp2:1.7}); ok(c.ballotPreview.amount===1200&&c.ballotPreview.risk===150,'pratonton: nilai RM1200, risiko RM150');
await c.submitBallot(); const tr=c.trades.find(t=>t.ipoId===g.ipoId);
ok(tr&&tr.tradeType==='IPO'&&tr.status==='OPEN'&&tr.buyPrice===1.2&&tr.quantity===1000&&tr.buyFees===0&&tr.setup==='IPO'&&tr.stopLoss===1.05&&tr.tp1===1.5,'berjaya (peruntukan separa 1000 unit): trade IPO OPEN, harga IPO, yuran beli 0');
ok(g.status==='ALLOTTED'&&g.allottedQty===1000&&g.tradeId===tr.tradeId&&c.ipoStats.allotted===1&&Math.abs(c.ipoStats.rate-100/3)<1e-9,'IPO ditanda berjaya & dipaut ke trade '+tr.tradeId+'; kadar ballot 1/3');
c.openCloseModal(tr); ok(c.closeForm.fees===4&&c.closing.buyFees===0,'tutup trade IPO: yuran jual lalai RM4, yuran beli 0');
c.closeForm.sellPrice=1.5; c.closeForm.closeDate='2026-11-13'; ok(c.closePreview===300-4,'pratonton net = 300 - 4 = 296'); await c.submitCloseTrade();
ok(c.trades.find(t=>t.tradeId===tr.tradeId).netPL===296&&c.trades.find(t=>t.tradeId===tr.tradeId).result==='WIN','trade IPO ditutup: net RM296 (hanya yuran jual)');
c.viewIpoTrade(g); ok(c.activeTab==='journal'&&c.search==='GAMMA TECH'&&c.filteredTrades.some(t=>t.tradeId===tr.tradeId),'Lihat di Journal menapis trade IPO');
ok(c.ipoWhen('Ballot',iso(0)).includes('hari ini')&&c.ipoWhen('Ballot',iso(5)).includes('dalam 5 hari')&&c.ipoWhen('Ballot',iso(-3)).includes('3 hari lepas')&&c.ipoWhen('Ballot','').includes('belum ditetapkan'),'teks hitung hari ballot');
ok(c.filteredIpos[0].status==='APPLIED'||c.ipoFilter!=='ALL','penapis IPO'); c.ipoFilter='ALL'; ok(c.filteredIpos.map(p=>p.status).join()==='ALLOTTED,UNSUCCESSFUL,UNSUCCESSFUL','susunan: berjaya dahulu, kemudian tidak berjaya');
c.openDeleteIpoModal(g); await c.confirmDeleteIpo(); ok(!c.ipos.some(p=>p.ipoId===g.ipoId)&&c.trades.some(t=>t.tradeId===tr.tradeId),'padam rekod IPO: trade dalam Journal kekal');
ok(JSON.parse(localStorage.getItem('sj_ipos')).length===c.ipos.length,'IPO disimpan dalam localStorage');
const e=mk(); e.loadLocal(); ok(e.ipos.length===c.ipos.length,'IPO kekal selepas muat semula');
e.ipos=[];e.trades=[];e.plans=[];e.saveLocal();
const csvCols=fs.readFileSync('_app.js','utf8').includes("'tradeType','buyFees','ipoId'"); ok(csvCols,'eksport CSV termasuk tradeType/buyFees/ipoId');
console.log(fails?'GAGAL '+fails:'SEMUA LULUS'); process.exitCode=fails?1:0;
})();
