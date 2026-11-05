// Ujian klien DCA: tambah belian, purata harga, semakan, buang belian terakhir, gabung dari Tambah Trade, mod GAS
const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){}; global.FileReader=class{};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b)=>Math.abs(a-b)<1e-6;
const mk=async()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; await a.loadData(); return a};
(async()=>{
 let a=await mk(); a.setMarket('US'); a.settings.cashCheck=0;
 a.form={...a.emptyForm(),stockName:'meta',buyPrice:150,quantity:10,stopLoss:120,buyFees:1,openDate:'2026-11-01'}; await a.submitAddTrade();
 let t=a.trades.find(x=>x.stockName==='META'); ok(t&&a.dcaCount(t)===1&&a.lotsOf(t).length===1&&a.lotsOf(t)[0].price===150,'trade asal: 1 belian (dari data trade)');
 const cash0=a.cashBalance;
 a.openDcaModal(t); ok(a.showDcaModal&&a.dcaForm.stopLoss===120&&a.dcaForm.fee===0,'modal DCA dibuka: SL & yuran lalai US (0)');
 Object.assign(a.dcaForm,{date:'2026-11-05',price:140,qty:20,fee:1.5});
 const pv=a.dcaPreview; ok(pv.show&&pv.nxt.qty===30&&near(pv.nxt.avg,143.333333)&&pv.cost===2801.5&&pv.errors.length===0,'pratonton: 30 unit, purata 143.333333, kos 2801.5');
 ok(pv.change<0&&near(pv.change,(143.333333-150)/150*100),'pratonton: perubahan purata -4.44%');
 await a.submitDca(); t=a.trades.find(x=>x.stockName==='META');
 ok(!a.showDcaModal&&t.quantity===30&&near(t.buyPrice,143.333333)&&t.buyFees===2.5&&a.dcaCount(t)===2,'DCA disimpan: 30 unit @ 143.333333, yuran 2.5, 2 belian');
 ok(t.openDate==='2026-11-01'&&t.tradeId===a.trades.find(x=>x.stockName==='META').tradeId&&a.trades.filter(x=>x.stockName==='META').length===1,'kekal SATU trade, openDate belian pertama');
 ok(near(a.cashBalance,cash0-2801.5),'baki tunai berkurang ikut kos belian DCA ('+(cash0-a.cashBalance)+')');
 ok(JSON.parse(localStorage.getItem('sj_trades')).find(x=>x.stockName==='META').buyLog.includes('"price":140'),'disimpan dalam localStorage dengan buyLog');
 ok(/belian ke-2/.test(a._t),'toast: belian ke-2');
 // belian ketiga + muat semula
 a.openDcaModal(t); Object.assign(a.dcaForm,{date:'2026-11-06',price:160,qty:5,fee:0}); await a.submitDca();
 let b=await mk(); b.setMarket('US'); let tb=b.trades.find(x=>x.stockName==='META'); ok(tb.quantity===35&&b.dcaCount(tb)===3&&near(tb.buyPrice,Math.round((4300+800)/35*1e6)/1e6),'muat semula: 3 belian, 35 unit, purata betul');
 // semakan
 t=a.trades.find(x=>x.stockName==='META'); a.openDcaModal(t);
 Object.assign(a.dcaForm,{date:'2026-10-01',price:100,qty:1}); ok(a.dcaPreview.errors.some(e=>/sebelum belian pertama/.test(e)),'tarikh sebelum belian pertama ditolak');
 Object.assign(a.dcaForm,{date:'2026-11-07',price:50,qty:1000,stopLoss:120}); ok(a.dcaPreview.errors.some(e=>/Stop loss/.test(e)),'average down bawah SL: perlu ubah SL');
 a.dcaForm.stopLoss=40; a.settings.cashCheck=1; ok(a.dcaPreview.errors.length===0&&a.dcaPreview.fundsOk===(50000<=a.cashBalance),'SL dibetulkan: tiada ralat');
 Object.assign(a.dcaForm,{price:100,qty:1e7}); const n0=a.trades.find(x=>x.stockName==='META').quantity; await a.submitDca(); ok(/Dana tidak mencukupi/.test(a._t)&&a.trades.find(x=>x.stockName==='META').quantity===n0,'dana tidak cukup: ditolak');
 a.showDcaModal=false;
 // MY: gandaan lot 100
 a.setMarket('MY'); const open=a.openTrades[0]; a.openDcaModal(open); Object.assign(a.dcaForm,{price:open.buyPrice,qty:150}); ok(a.dcaPreview.errors.some(e=>/gandaan 100/.test(e)),'Bursa MY: kuantiti mesti gandaan 100');
 a.dcaForm.qty=100; ok(a.dcaPreview.errors.length===0&&a.dcaForm.fee===4,'Bursa MY: 100 unit OK, yuran lalai RM4');
 a.showDcaModal=false;
 // buang belian terakhir (perlu tekan 2 kali)
 a.setMarket('US'); t=a.trades.find(x=>x.stockName==='META'); a.openDetail(t);
 await a.removeLastBuy(t); ok(a.dcaUndoArm&&a.dcaCount(a.trades.find(x=>x.stockName==='META'))===3,'tekan pertama: minta pengesahan, belum dibuang');
 await a.removeLastBuy(t); t=a.trades.find(x=>x.stockName==='META'); ok(a.dcaCount(t)===2&&t.quantity===30&&near(t.buyPrice,143.333333)&&a.detail.quantity===30,'tekan kedua: belian terakhir dibuang, purata dikira semula');
 a.dcaUndoArm=false; await a.removeLastBuy(t); await a.removeLastBuy(a.trades.find(x=>x.stockName==='META')); t=a.trades.find(x=>x.stockName==='META');
 ok(a.dcaCount(t)===1&&t.buyLog===''&&t.quantity===10&&t.buyPrice===150&&t.buyFees===1,'kembali kepada 1 belian: buyLog kosong, nilai asal');
 await a.removeLastBuy(t); ok(a.dcaCount(t)===1,'belian pertama tidak boleh dibuang');
 // dari Tambah Trade: saham sama ada posisi terbuka
 a.openAddModal(); a.form={...a.form,stockName:'meta',buyPrice:130,quantity:4,stopLoss:110,openDate:'2026-11-08',buyFees:0.5};
 ok(a.openPositionOf(a.form.stockName)&&a.openPositionOf(a.form.stockName).stockName==='META','Tambah Trade: kesan posisi terbuka META');
 a.switchAddToDca(); ok(!a.showAddModal&&a.showDcaModal&&a.dcaForm.price===130&&a.dcaForm.qty===4&&a.dcaForm.fee===0.5&&a.dcaForm.stopLoss===110&&a.dcaForm.date==='2026-11-08','tukar ke DCA: borang diisi dari Tambah Trade');
 await a.submitDca(); t=a.trades.find(x=>x.stockName==='META'); ok(t.quantity===14&&a.dcaCount(t)===2&&t.stopLoss===110,'disimpan: 14 unit, SL dikemas kini 110');
 ok(!a.openPositionOf('TSLA')&&!a.openPositionOf(''),'tiada notis untuk saham tanpa posisi terbuka');
 // trade ditutup: tiada DCA
 a.openCloseModal(t); a.closeForm={...a.closeForm,sellPrice:170,fees:0,closeDate:'2026-11-09'}; await a.submitCloseTrade(); t=a.trades.find(x=>x.stockName==='META');
 const expPL=Math.round(((170-t.buyPrice)*14-t.buyFees)*100)/100; ok(t.status==='CLOSED'&&t.netPL===expPL&&a.dcaCount(t)===2,'tutup: net P/L guna purata ('+t.netPL+'), log kekal');
 a.dcaTarget=t; a.dcaForm={date:'2026-11-10',price:1,qty:1,fee:0,stopLoss:0.5}; await a.submitDca(); ok(/Hanya posisi OPEN/.test(a._t),'trade CLOSED: DCA ditolak');
 // CSV ada buyLog
 let blob=''; global.Blob=class{constructor(p){blob=p.join('')}}; global.URL={createObjectURL:()=>'x',revokeObjectURL(){}}; global.document.createElement=()=>({click(){},remove(){}}); global.document.body={appendChild(){}};
 a.exportCSV(); ok(blob.split('\n')[0].endsWith(',buyLog')&&blob.includes('""price"":130'),'eksport CSV ada lajur buyLog');
 // cleanBuyLog
 ok(a.cleanBuyLog('xx')===''&&a.cleanBuyLog('[]')===''&&a.cleanBuyLog([{date:'2026-01-01',price:1,qty:1,fee:0}])!=='','cleanBuyLog: teks rosak/kosong = kosong');
 // mod GAS: server memulangkan trade yang dikira semula
 let sent=null; global.fetch=async(u,o)=>{ if(o&&o.body){sent=JSON.parse(o.body); const p=sent.payload; return {json:async()=>({status:'success',trade:{...p,buyPrice:p.buyPrice,market:undefined}})};}
   return {json:async()=>({status:'success',trades:[{tradeId:'TRD-1',openDate:'2026-11-01',stockName:'SPUS',status:'OPEN',buyPrice:40,quantity:5,stopLoss:30,buyFees:0,market:'US'}],settings:{}})}; };
 let g=App(); g.$watch=()=>{}; g.$nextTick=f=>f(); g.showToast=m=>{g._t=m}; g.gasUrl='https://script.google.com/x/exec'; await g.loadData(); g.setMarket('US');
 const sp=g.trades.find(x=>x.stockName==='SPUS'); g.openDcaModal(sp); Object.assign(g.dcaForm,{date:'2026-11-05',price:44,qty:5,fee:0}); await g.submitDca();
 ok(sent&&sent.action==='updateTrade'&&JSON.parse(sent.payload.buyLog).length===2&&sent.payload.quantity===10&&sent.payload.buyPrice===42,'mod GAS: hantar updateTrade dengan buyLog, 10 unit @ 42');
 ok(g.trades.find(x=>x.stockName==='SPUS').market==='US'&&g.trades.find(x=>x.stockName==='SPUS').quantity===10,'mod GAS: trade dikemas kini, kekal pasaran US');
 console.log(fails?'GAGAL: '+fails:'SEMUA LULUS'); if(fails)process.exitCode=1;
})();
(async()=>{await new Promise(r=>setTimeout(r,100));
 global.localStorage._={}; const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.showToast=()=>{}; await a.loadData(); a.settings.cashCheck=0;
 const t=a.openTrades[0]; a.openDcaModal(t); Object.assign(a.dcaForm,{date:new Date().toISOString().slice(0,10),price:5.2*0.9,qty:100,fee:4}); await a.submitDca();
 const l=a.lotsOf(a.trades.find(x=>x.tradeId===t.tradeId)); const okk=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}else console.log('ok  ',m)};
 okk(l[1].price===4.68,'harga belian dibundarkan (4.680000000000001 → 4.68)');
 // dari Waiting List: plan ditanda EXECUTED bila digabung sebagai DCA
 const p=a.normalizePlan({planId:'PLN-T-001',createdDate:'2026-11-01',stockName:t.stockName,entryType:'PULLBACK',entryPrice:4.5,stopLoss:4.4,status:'WAITING'}); a.plans.push(p);
 a.openAddModal(); a.form={...a.form,stockName:t.stockName,buyPrice:4.5,quantity:100,stopLoss:4.4,openDate:new Date().toISOString().slice(0,10),planId:'PLN-T-001'};
 a.switchAddToDca(); a.dcaForm.stopLoss=4.4; await a.submitDca();
 const pp=a.plans.find(x=>x.planId==='PLN-T-001'); okk(pp.status==='EXECUTED'&&pp.executedTradeId===t.tradeId,'Waiting List → DCA: plan ditanda EXECUTED pada trade sedia ada');
})();
