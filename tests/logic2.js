const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.showToast=(m)=>{a._t=m}; a.loadLocal();

ok(a.plans.length===2,'2 sample plan dimuat');
const sw=a.plans.find(p=>p.stockName==='SUNWAY'), ina=a.plans.find(p=>p.stockName==='INARI');
ok(!a.planReached(sw),'SUNWAY 4.35 > entry 4.20: belum capai (pullback)');
ok(a.planStatusText(sw)==='Perlu turun 3.6% ke entry','teks jarak pullback: '+a.planStatusText(sw));
ok(!a.planReached(ina) && a.planStatusText(ina)==='Perlu naik 2.6% ke entry','breakout belum capai: '+a.planStatusText(ina));
ok(a.planRisk(sw)===300 && Math.abs(a.planRR(sw)-1.5)<1e-9,'risiko SUNWAY 300, RR 1.5');
ok(a.readyPlans.length===0,'tiada ready pada mulanya');

(async()=>{
 await a.updatePlanPrice(sw,'4.20'); ok(a.planReached(sw)&&a.readyPlans.length===1&&a.planBadge(sw).text==='CAPAI ENTRY','pullback capai bila harga = entry');
 ok(a.filteredPlans[0].stockName==='SUNWAY','plan capai disusun di atas');
 await a.updatePlanPrice(sw,'4.05'); ok(a.planInvalid(sw)&&!a.planReached(sw)&&a.planBadge(sw).text==='SL TEMBUS','harga <= SL: SL TEMBUS, bukan capai');
 await a.updatePlanPrice(ina,'3.12'); ok(a.planReached(ina),'breakout capai bila harga >= entry');
 await a.updatePlanPrice(ina,'abc'); ok(ina.currentPrice===0 && !a.planReached(ina),'input tidak sah => 0');
 ok(JSON.parse(localStorage.getItem('sj_plans')).find(p=>p.stockName==='INARI').currentPrice===0,'harga semasa disimpan ke localStorage');

 // simpan dari kalkulator
 a.calc={name:'maybank',capital:10000,riskPct:1,entry:10,sl:9.7,fees:0,tp1:10.45,tp2:10.6,tp3:10.9};
 a.savePlanFromCalc(); const f=a.planForm;
 ok(f.stockName==='MAYBANK'&&f.entryPrice===10&&f.stopLoss===9.7&&f.quantity===300&&f.tp1===10.45&&f.tp2===10.6&&f.tp3===10.9&&a.showPlanModal,'kalkulator -> borang plan (qty 300, TP 10.45/10.6/10.9)');
 a.activeTab='money'; await a.submitPlan();
 const mb=a.plans.find(p=>p.stockName==='MAYBANK'); ok(mb&&mb.status==='WAITING'&&/^PLN-\d{8}-001$/.test(mb.planId)&&!a.showPlanModal&&a.activeTab==='plans','plan disimpan, ID '+(mb&&mb.planId)+', tukar ke tab Plan');
 const mb2=(a.openPlanModal(),a.planForm); ok(mb2.stockName===''&&a.editingPlanId===null,'borang kosong untuk plan baru');
 a.showPlanModal=false;

 // validasi
 a.openPlanModal(); a.planForm.stockName='X'; a.planForm.entryPrice=5; a.planForm.stopLoss=5; await a.submitPlan();
 ok(a.plans.length===3 && /Stop loss/.test(a._t),'SL >= entry ditolak: '+a._t);
 a.planForm.stopLoss=4.8; a.planForm.stockName=''; await a.submitPlan(); ok(a.plans.length===3,'nama kosong ditolak');
 a.showPlanModal=false;

 // edit
 a.openPlanModal(mb); ok(a.editingPlanId===mb.planId && a.planForm.entryPrice===10,'edit isi borang'); a.planForm.entryPrice=9.95; a.planForm.notes='ubah'; await a.submitPlan();
 ok(a.plans.length===3 && a.plans.find(p=>p.planId===mb.planId).entryPrice===9.95,'edit kemas kini, bukan duplikat');

 // beli dari plan
 const tBefore=a.trades.length; const pl=a.plans.find(p=>p.planId===mb.planId);
 a.buyFromPlan(pl); ok(a.showAddModal&&a.form.planId===pl.planId&&a.form.buyPrice===9.95&&a.form.quantity===300&&a.form.stopLoss===9.7,'beli dari plan: borang trade diisi');
 a.form.openDate='2026-10-31'; await a.submitAddTrade();
 const tr=a.trades[a.trades.length-1];
 ok(a.trades.length===tBefore+1 && tr.stockName==='MAYBANK' && tr.status==='OPEN' && !('planId' in tr),'trade dicipta (tanpa medan planId)');
 const pl2=a.plans.find(p=>p.planId===mb.planId); ok(pl2.status==='EXECUTED'&&pl2.executedTradeId===tr.tradeId,'plan ditanda DIBELI -> '+pl2.executedTradeId);
 ok(a.waitingPlans.every(p=>p.planId!==mb.planId)&&a.planCount('EXECUTED')===1&&a.planBadge(pl2).text==='DIBELI','keluar dari senarai Menunggu');
 a.openAddModal(); ok(a.form.planId==='','openAddModal biasa tidak mewarisi planId'); a.showAddModal=false;

 // padam
 a.openDeletePlanModal(sw); await a.confirmDeletePlan(); ok(!a.plans.some(p=>p.planId===sw.planId)&&!a.showDeletePlanModal,'padam plan');
 ok(JSON.parse(localStorage.getItem('sj_plans')).length===a.plans.length,'localStorage selari');
 // reload
 const b=App(); b.$watch=()=>{}; b.$nextTick=f=>f(); b.loadLocal(); ok(b.plans.length===a.plans.length,'plan kekal selepas muat semula');
 // reset
 a.resetDemo(); ok(a.plans.length===0,'reset demo kosongkan plan');
 console.log(fails?('GAGAL: '+fails):'SEMUA LULUS'); process.exitCode=fails?1:0;
})();
