const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; return a};
const ym=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
(async()=>{
const a=mk(); await a.loadData();
const base=a.currentCapital, pl=a.totalAllPL;
ok(a.netDeposits===0&&base===a.settings.initialCapital+pl,'tanpa modal tambahan: modal semasa = awal + P/L');
// modal tambahan
a.openCapitalModal('DEPOSIT'); ok(a.capitalForm.type==='DEPOSIT'&&a.showCapitalModal,'modal tambah dibuka');
a.capitalForm.amount=0; await a.submitCapital(); ok(a.capitalLog.length===0,'jumlah 0 ditolak');
a.capitalForm={type:'DEPOSIT',date:'2026-06-01',amount:2000,notes:'bonus'}; ok(a.capitalPreview.after===r(base+2000),'pratonton selepas tambah');
function r(x){return Math.round(x*100)/100}
await a.submitCapital(); ok(a.capitalLog.length===1&&a.capitalLog[0].capId==='CAP-20260601-001'&&a.netDeposits===2000&&a.currentCapital===r(base+2000),'tambah RM2000: modal semasa naik');
a.openCapitalModal('DEPOSIT'); a.capitalForm={type:'DEPOSIT',date:'2026-06-01',amount:500,notes:''}; await a.submitCapital(); ok(a.capitalLog[1].capId==='CAP-20260601-002','ID kedua unik');
a.openCapitalModal('WITHDRAW'); a.capitalForm={type:'WITHDRAW',date:'2026-07-01',amount:1e9,notes:''}; await a.submitCapital(); ok(a.capitalLog.length===2,'keluar melebihi modal ditolak');
a.capitalForm={type:'WITHDRAW',date:'2026-07-01',amount:300,notes:'belanja'}; await a.submitCapital();
ok(a.totalDeposits===2500&&a.totalWithdrawals===300&&a.netDeposits===2200&&a.totalContributed===a.settings.initialCapital+2200,'jumlah tambah/keluar/bersih/dicarum');
ok(a.currentCapital===r(base+2200)&&a.calc.capital===a.currentCapital,'kalkulator ikut modal semasa');
ok(a.capitalSorted[0].date==='2026-07-01','sejarah disusun terbaharu dahulu');
ok(JSON.parse(localStorage.getItem('sj_capital')).length===3,'disimpan ke localStorage');
// ekuiti
a.filterYear='all';a.filterMonth='all'; let eq=a.equityData; ok(Math.abs(eq.values[eq.values.length-1]-a.currentCapital)<0.01,'lengkung ekuiti berakhir pada modal semasa (semua tempoh)');
a.filterYear='2026';a.filterMonth='06'; eq=a.equityData; ok(eq.values.length>=2 && eq.labels.includes('06-01'),'ekuiti bulan Jun memuatkan deposit');
a.filterYear='2026';a.filterMonth='all'; eq=a.equityData; ok(Math.abs(eq.values[eq.values.length-1]-a.currentCapital)<0.01,'ekuiti tahun 2026 berakhir pada modal semasa');
a.filterYear='2025';a.filterMonth='all'; eq=a.equityData; ok(eq.values.length===1&&eq.values[0]===a.settings.initialCapital,'tahun tanpa data: hanya modal awal');
a.filterYear='all';
// padam
a.openDeleteCapitalModal(a.capitalLog[2]); await a.confirmDeleteCapital(); ok(a.capitalLog.length===2&&a.netDeposits===2500,'padam pengeluaran: modal dikira semula');
// sasaran
ok(!a.targetsSet&&a.targetRows.every(x=>!x.set&&x.pct===0),'tiada sasaran: baris tidak ditetapkan');
a.targetForm={targetMonthly:-5,targetYearly:0,targetFinal:0}; await a.saveTargets(); ok(a.settings.targetMonthly===0,'sasaran negatif ditolak');
a.targetForm={targetMonthly:500,targetYearly:6000,targetFinal:50000}; await a.saveTargets(); ok(a.targetsSet&&a.settings.targetFinal===50000,'sasaran disimpan');
const rows=a.targetRows; ok(rows.length===3&&rows[2].achieved===a.totalAllPL&&rows[2].set,'sasaran akhir guna jumlah P/L keseluruhan');
ok(Math.abs(rows[2].pct-a.totalAllPL/50000*100)<1e-9,'peratus sasaran akhir betul ('+rows[2].pct.toFixed(2)+'%)');
a.targetForm={targetMonthly:1,targetYearly:1,targetFinal:1}; await a.saveTargets(); ok(a.targetRows.slice(1).every(x=>x.done)&&a.targetRows[2].hint.includes('Tercapai'),'sasaran kecil: tahunan & akhir tercapai');
a.filterYear='2026';a.filterMonth='03'; ok(a.targetRows[0].sub==='Mac 2026','sasaran bulanan ikut penapis dashboard');
a.filterYear='all';a.filterMonth='all';
// study
ok(a.studies.length===3&&a.studyStats.stocks===3&&a.studyStats.sessions===3,'3 contoh study demo');
ok(a.studyStats.trades===30&&a.studyStats.wins===16&&a.studyStats.losses===14&&Math.abs(a.studyStats.winRate-16/30*100)<1e-9,'statistik: 30 trade, 16 menang');
ok(a.studyStats.totalR===7.3&&a.studyStats.hours===4.5,'jumlah R 7.3, masa 4.5 jam');
ok(a.studyLevel.name==='Permulaan'&&a.studyLevel.next==='Pelajar'&&Math.abs(a.studyLevel.pct-60)<1e-9,'tahap: Permulaan, 3/5 ke Pelajar');
ok(a.studyBySetup.length===3&&a.studyBySetup[0].winRate!==null,'prestasi mengikut setup');
ok(a.studyMonthly.labels.length===12&&a.studyMonthly.values.reduce((x,y)=>x+y,0)===3,'carta 12 bulan memuatkan 3 sesi');
a.openStudyModal(); a.studyForm.stockName=''; await a.submitStudy(); ok(a.studies.length===3,'nama kosong ditolak');
a.studyForm={...a.emptyStudy(),stockName:'x',tradesTested:5,wins:4,losses:3}; await a.submitStudy(); ok(a.studies.length===3&&/melebihi/.test(a._t),'menang+kalah > trade ditolak');
a.studyForm={...a.emptyStudy(),stockName:'x',tradesTested:5,wins:1,losses:1,rangeFrom:'2025-05-01',rangeTo:'2025-01-01'}; await a.submitStudy(); ok(a.studies.length===3,'julat tarikh songsang ditolak');
a.studyForm={...a.emptyStudy(),stockName:'x',tradesTested:2.5}; await a.submitStudy(); ok(a.studies.length===3,'trade bukan integer ditolak');
a.studyForm={...a.emptyStudy(),stockName:'x',tradesTested:5,wins:1,losses:1}; ok(a.studyPreview.be===3&&a.studyPreview.winRate===20,'pratonton: 3 pulang modal, 20%');
a.studyForm={...a.emptyStudy(),stockName:' sunway ',setup:'Gap Fill',tradesTested:10,wins:6,losses:4,totalR:2.5,minutes:60,understanding:5,studyDate:'2026-10-30',chartLink:'javascript:alert(1)'};
await a.submitStudy(); const nw=a.studies.find(x=>x.stockName==='SUNWAY'); ok(nw&&nw.studyId==='STD-20261030-001'&&a.studies.length===4,'study baharu disimpan, nama huruf besar');
ok(a.setups.includes('Gap Fill'),'setup baharu dari study masuk senarai setup');
ok(a.safeLink(nw.chartLink)===''&&a.safeLink('https://tv.com/x')==='https://tv.com/x','pautan javascript: disekat');
ok(a.studyStats.stocks===4,'saham dikaji bertambah');
a.openStudyModal(nw); a.studyForm.wins=5; a.studyForm.losses=5; await a.submitStudy(); ok(a.studies.find(x=>x.studyId===nw.studyId).wins===5&&a.studies.length===4,'edit study');
a.studySearch='gap'; ok(a.filteredStudies.length===1,'cari ikut setup'); a.studySearch='';
a.studySetupFilter='Pullback'; ok(a.filteredStudies.length===1&&a.filteredStudies[0].stockName==='TENAGA','tapis ikut setup'); a.studySetupFilter='all';
a.openDeleteStudyModal(nw); await a.confirmDeleteStudy(); ok(a.studies.length===3,'padam study');
ok(JSON.parse(localStorage.getItem('sj_studies')).length===3,'study disimpan ke localStorage');
// muat semula (persistence)
const b=mk(); await b.loadData(); ok(b.studies.length===3&&b.capitalLog.length===2&&b.settings.targetMonthly===1,'muat semula: study, modal & sasaran kekal');
// padam semua study -> kekal kosong selepas muat semula (tidak seed semula)
b.studies=[]; b.saveLocal(); const c=mk(); await c.loadData(); ok(c.studies.length===0,'study kosong kekal kosong');
console.log(fails?('GAGAL '+fails):'SEMUA LULUS');
})();
