// Ujian kalkulator: input HARGA TP -> R:R dan untung dikira automatik
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
 ok(a.calc.tp1===null&&a.calc.tp2===null&&a.calc.tp3===null&&a.calc.rr1===undefined,'lalai: harga TP kosong (tiada lagi rr1/rr2/rr3)');
 a.calc={name:'',capital:10000,riskPct:1,entry:5,sl:4.8,fees:8,tp1:null,tp2:null,tp3:null};
 let r=a.calcResult; ok(r.valid&&r.tps.length===0&&r.tpErrors.length===0,'tanpa TP: kalkulator sah, tiada sasaran');
 a.calc.tp1=5.3; a.calc.tp2=5.5; r=a.calcResult;
 ok(r.shares===500&&near(r.loss,108),'500 unit, rugi SL = 100 + yuran 8 = 108');
 const t1=r.tps[0], t2=r.tps[1];
 ok(near(t1.rr,1.5)&&near(t1.profit,142)&&near(t1.gainPct,6),'TP1 5.30: R:R 1:1.50, untung 150 − 8 = 142, +6%');
 ok(near(t2.rr,2.5)&&near(t2.profit,242),'TP2 5.50: R:R 1:2.50, untung 250 − 8 = 242');
 ok(near(t1.vsLoss,142/108)&&near(t1.profitPct,1.42),'TP1: untung 1.31× ganda rugi, 1.42% modal');
 ok(a.tpRRText(5.3)==='R:R 1:1.50'&&a.tpRRText(4.9)==='Mesti > harga masuk'&&a.tpRRText(null)==='','label R:R di bawah input');
 // slot: TP2 kosong, TP3 diisi
 a.calc.tp2=null; a.calc.tp3=5.6; r=a.calcResult; ok(r.tps.length===2&&r.tps[1].label==='TP 3'&&r.tps[1].slot===2,'TP2 kosong: TP3 kekal label TP 3');
 ok(a.calcTp(0)===5.3&&a.calcTp(1)===null&&a.calcTp(2)===5.6,'calcTp ikut slot');
 a.calc.name='maybank'; a.savePlanFromCalc(); ok(a.planForm.tp1===5.3&&a.planForm.tp2===null&&a.planForm.tp3===5.6&&a.planForm.quantity===500,'Simpan ke Waiting List: TP1/TP3 betul, TP2 kosong');
 a.showPlanModal=false; a.useCalcInTrade(); ok(a.form.tp1===5.3&&a.form.tp2===null&&a.form.tp3===5.6&&a.form.buyPrice===5&&a.form.stopLoss===4.8,'Buy Now: harga TP dibawa ke borang trade');
 a.showAddModal=false;
 // TP tidak sah
 a.calc.tp1=4.9; r=a.calcResult; ok(r.tpErrors.length===1&&/TP 1/.test(r.tpErrors[0])&&r.tps.every(t=>t.label!=='TP 1'),'TP di bawah harga masuk: ralat, tidak dikira');
 a.calc.tp1=5; ok(a.calcResult.tpErrors.length===1,'TP sama dengan harga masuk: ralat');
 // amaran minRR (lalai 1.5)
 a.calc.tp1=5.2; r=a.calcResult; ok(near(r.tps[0].rr,1)&&r.warnings.some(w=>/R:R 1:1\.00 di bawah minimum/.test(w)),'TP1 R:R 1:1 < minimum: amaran');
 a.calc.tp1=5.3; ok(!a.calcResult.warnings.some(w=>/minimum/.test(w)),'TP1 R:R 1:1.5 = minimum: tiada amaran');
 // untung kecil tidak menutup yuran
 a.calc={...a.calc,tp1:5.01,tp2:null,tp3:null,fees:8}; r=a.calcResult; ok(near(r.tps[0].profit,-3)&&r.tps[0].vsLoss<0,'TP terlalu dekat: untung bersih negatif (5 − 8 = −3)');
 // US
 a.setMarket('US'); a.calc={name:'',capital:5000,riskPct:1,entry:100,sl:95,fees:0,tp1:112.5,tp2:null,tp3:null}; r=a.calcResult;
 ok(r.shares===10&&near(r.tps[0].rr,2.5)&&near(r.tps[0].profit,125)&&near(r.loss,50),'US: 10 saham, TP 112.5 = R:R 1:2.5, untung US$125 vs rugi US$50');
 const html=fs.readFileSync('src.html','utf8'); ok(!/calc\.rr[123]/.test(html)&&/Harga Take Profit/.test(html),'UI: input harga TP menggantikan input R:R');
 console.log(fails?'GAGAL: '+fails:'SEMUA LULUS'); if(fails)process.exitCode=1;
})();
