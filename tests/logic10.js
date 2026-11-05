// Ujian: Prestasi ikut Setup, Analisis Kesilapan, Pendedahan Sektor
const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){}; global.FileReader=class{};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b)=>Math.abs(a-b)<1e-6;
(async()=>{
 const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.showToast=()=>{}; await a.loadData();
 // demo data: semua getter berjalan tanpa ralat
 ok(Array.isArray(a.setupStats)&&a.setupStats.length>0,'setupStats demo: '+a.setupStats.length+' setup');
 ok(a.setupStats.reduce((s,r)=>s+r.n,0)===a.periodClosed.length,'jumlah trade setup = trade ditutup');
 ok(near(a.setupStats.reduce((s,r)=>s+r.pl,0),a.kpi.pl),'jumlah P/L setup = Net P/L KPI');
 ok(a.mistakeStats.clean.n+a.mistakeStats.dirty.n===a.kpi.total,'tanpa + dengan kesilapan = jumlah trade');
 // data terkawal
 const T=(id,setup,mistake,buy,sell,qty,cd,stock)=>a.normalize({tradeId:id,openDate:'2026-01-02',stockName:stock||'X'+id,status:sell?'CLOSED':'OPEN',buyPrice:buy,quantity:qty,stopLoss:buy*0.9,
   setup,mistake,closeDate:sell?cd:'',sellPrice:sell||'',fees:sell?4:'',buyFees:4});
 a.trades=[
  T('1','Breakout','Tiada',1,1.2,1000,'2026-02-10'),    // +192
  T('2','Breakout','FOMO',1,0.9,1000,'2026-02-11'),     // -108
  T('3','Pullback','',2,2.3,1000,'2026-03-05'),         // +292
  T('4','Pullback','FOMO',2,1.8,1000,'2026-03-06'),     // -208
  T('5','','Langgar Plan',1,0.95,2000,'2026-03-07'),    // -108
  T('6','Breakout','Langgar Plan',1,1.05,2000,'2026-04-01'), // +92
  T('7','Breakout','',3,0,1000,'','MAYBANK'), T('8','Pullback','',2,0,500,'','CIMB'), T('9','Breakout','',1,0,1000,'','ZZZ')
 ];
 a.stocks=[a.normalizeStock({stockName:'MAYBANK',sector:'Financial Services'}),a.normalizeStock({stockName:'CIMB',sector:'Financial Services'})];
 a.filterYear='all'; a.filterMonth='all';
 const ss=a.setupStats;
 ok(ss.length===3,'3 kumpulan setup (termasuk Tiada setup)');
 const br=ss.find(r=>r.setup==='Breakout'), pb=ss.find(r=>r.setup==='Pullback'), ns=ss.find(r=>r.setup==='Tiada setup');
 ok(br.n===3&&br.wins===2&&near(br.winRate,200/3)&&br.pl===176,'Breakout: 3 trade, WR 66.7%, P/L 176 ('+br.pl+')');
 ok(pb.n===2&&pb.pl===84&&near(pb.winRate,50),'Pullback: 2 trade, P/L 84');
 ok(ns&&ns.n===1&&ns.pl===-108,'trade tanpa setup = "Tiada setup"');
 ok(ss[0].setup==='Breakout'&&ss[2].setup==='Tiada setup','susunan ikut net P/L menurun');
 const exRR=a.trades.filter(t=>t.setup==='Breakout'&&t.status==='CLOSED').reduce((s,t)=>s+t.realizedRR,0)/3; ok(near(br.avgRR,exRR),'avg R:R Breakout');
 const ms=a.mistakeStats;
 ok(ms.clean.n===2&&ms.clean.pl===484&&ms.clean.winRate===100,'tanpa kesilapan: 2 trade, +484, WR 100% ("Tiada" dan kosong)');
 ok(ms.dirty.n===4&&ms.dirty.pl===-332&&near(ms.dirty.winRate,25),'dengan kesilapan: 4 trade, -332, WR 25%');
 ok(ms.rows.length===2&&ms.rows[0].mistake==='FOMO'&&ms.rows[0].pl===-316&&ms.rows[0].losses===2&&ms.rows[0].lossAmt===316,'FOMO paling mahal: -316, 2 rugi');
 const lp=ms.rows[1]; ok(lp.mistake==='Langgar Plan'&&lp.pl===-16&&lp.n===2&&lp.losses===1&&lp.lossAmt===108,'Langgar Plan: net -16, 1 rugi (108)');
 ok(ms.rows[0].bar===100&&ms.rows[1].bar===Math.max(4,Math.round(16/316*100)),'lebar bar berkadar');
 ok(ms.costTotal===-332,'jumlah rugi bersih kesilapan -332');
 // penapis tempoh
 a.filterYear='2026'; a.filterMonth='03';
 ok(a.setupStats.reduce((s,r)=>s+r.n,0)===3&&a.mistakeStats.dirty.n===2,'penapis Mac 2026: 3 trade, 2 dengan kesilapan');
 a.filterMonth='05'; ok(a.setupStats.length===0&&a.mistakeStats.rows.length===0&&a.mistakeStats.clean.n===0,'tempoh kosong: tiada baris, tiada ralat');
 // sektor
 const se=a.sectorExposure;
 ok(se.total===5000,'jumlah kos terbuka 5000 ('+se.total+')');
 const fin=se.rows.find(r=>r.sector==='Financial Services'), none=se.rows.find(r=>r.sector==='Tiada sektor');
 ok(fin.cost===4000&&near(fin.pct,80)&&fin.stocks.join()==='MAYBANK,CIMB','Financial Services 80% (MAYBANK, CIMB)');
 ok(none.cost===1000&&none.color==='#94a3b8','tanpa profil = Tiada sektor (kelabu)');
 ok(se.rows[0].sector==='Financial Services','susun ikut kos menurun');
 ok(se.rows.reduce((s,r)=>s+r.pct,0)>99.999,'peratus berjumlah 100');
 // >8 sektor digabung Lain-lain
 const secs=a.sectorsMY.slice(0,10);
 a.trades=secs.map((sc,i)=>T('S'+i,'','',1,0,(10-i)*100,'','S'+i)); a.stocks=secs.map((sc,i)=>a.normalizeStock({stockName:'S'+i,sector:sc}));
 const s2=a.sectorExposure; ok(s2.rows.length===8&&s2.rows[7].sector==='Lain-lain'&&s2.rows[7].cost===(3+2+1)*100&&s2.rows[7].stocks.length===3,'10 sektor: 7 terbesar + Lain-lain');
 a.trades=[]; ok(a.sectorExposure.rows.length===0&&a.sectorExposure.total===0,'tiada posisi terbuka: kosong');
 console.log(fails?'GAGAL: '+fails:'SEMUA LULUS'); if(fails)process.exitCode=1;
})();
// demo: kesilapan contoh supaya kad Analisis Kesilapan ada isi
(async()=>{ await new Promise(r=>setTimeout(r,50));
 global.localStorage._={}; const d=App(); d.$watch=()=>{}; d.$nextTick=f=>f(); d.showToast=()=>{}; await d.loadData(); d.filterYear='all'; d.filterMonth='all';
 const ms=d.mistakeStats; const ok2=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
 ok2(ms.rows.length===4&&ms.rows[0].mistake==='FOMO'&&ms.dirty.n===5,'demo: 4 jenis kesilapan, FOMO paling mahal, 5 trade');
 ok2(d.trades.find(t=>t.stockName==='MAYBANK').mistake==='Tiada','demo: trade lain kekal "Tiada"');
})();
