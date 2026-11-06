const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){};
global.FileReader=class{readAsText(f){setTimeout(()=>{this.result=f.text;this.onload()},0)}};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; return a};
const wait=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
const a=mk(); await a.loadData();
// ---- baki tunai
ok(a.cashBalance===a.currentCapital-a.openCost&&a.openCost===7804,'baki tunai = modal semasa - kos posisi terbuka (7804)');
const c0=a.cashBalance;
a.openCapitalModal('DEPOSIT'); a.capitalForm={type:'DEPOSIT',date:'2026-11-02',amount:1000,notes:''}; await a.submitCapital(); ok(a.cashBalance===c0+1000,'tambah modal menambah baki tunai');
// beli: dana cukup
const c1=a.cashBalance; a.openAddModal(); a.form={...a.form,stockName:'aaa',buyPrice:2,quantity:1000,stopLoss:1.9,buyFees:4};
ok(a.cashPreview.cost===2004&&a.cashPreview.ok&&a.cashPreview.after===c1-2004,'pratonton: kos 2004 (termasuk yuran beli), dana cukup');
await a.submitAddTrade(); ok(a.trades.some(t=>t.stockName==='AAA')&&a.cashBalance===c1-2004,'beli: baki tunai berkurang sebanyak kos');
// jual: baki tunai pulang
const t=a.trades.find(x=>x.stockName==='AAA'); const cb=a.cashBalance;
a.openCloseModal(t); a.closeForm={...a.closeForm,sellPrice:2.5,fees:4,closeDate:t.openDate}; ok(a.closeCashAfter===cb+2500-4,'pratonton baki tunai selepas jual = baki + hasil jual - yuran jual');
a.closeForm.lesson='Tunggu pengesahan volum'; await a.submitCloseTrade();
ok(a.cashBalance===cb+2496&&a.cashBalance===c1+(2500-2000-4-4),'selepas jual: baki tunai = sebelum beli + untung bersih ('+a.cashBalance+')');
ok(a.trades.find(x=>x.tradeId===t.tradeId).lesson==='Tunggu pengesahan volum','catatan pelajaran disimpan pada trade');
// dana tidak cukup
const before=a.trades.length; a.openAddModal(); a.form={...a.form,stockName:'big',buyPrice:10,quantity:100000,stopLoss:9};
ok(!a.cashPreview.ok,'pratonton: dana tidak cukup'); await a.submitAddTrade(); ok(a.trades.length===before&&/Dana tidak mencukupi/.test(a._t),'beli ditolak bila dana tidak cukup: '+a._t);
// tepat sama dengan baki
a.form={...a.form,stockName:'exact',buyPrice:a.cashBalance-4,quantity:1,stopLoss:1,buyFees:4}; ok(a.cashPreview.ok,'kos tepat = baki tunai: dibenarkan');
// semakan dimatikan
a.settings.cashCheck=0; a.form={...a.form,stockName:'big',buyPrice:10,quantity:100000,stopLoss:9}; await a.submitAddTrade(); ok(a.trades.length===before+1,'semakan dimatikan: trade disimpan walaupun dana tidak cukup'); ok(a.cashBalance<0,'baki tunai negatif dipaparkan'); a.settings.cashCheck=1;
// plan afford
a.cashBalance; const p={status:'WAITING',quantity:100,entryPrice:5}; ok(a.planAfford(p)===null||a.planAfford(p).ok===false||a.planAfford(p).ok===true,'planAfford ada'); ok(a.planAfford({quantity:0,entryPrice:5})===null,'plan tanpa kuantiti: tiada semakan');
localStorage._={}; const a2=mk(); await a2.loadData(); ok(a2.planAfford({quantity:100,entryPrice:5}).ok===true&&a2.planAfford({quantity:1e6,entryPrice:5}).ok===false&&a2.planAfford({quantity:1e6,entryPrice:5}).short>0,'planAfford: cukup / tidak cukup / kurang berapa');
// calculator
a2.calc={name:'',capital:50000,riskPct:2,entry:5,sl:4.8,fees:8,tp1:5.3,tp2:5.4,tp3:5.6}; ok(a2.calcResult.warnings.some(w=>/cash balance/.test(w)),'kalkulator amaran melebihi baki tunai');
// tetapan
a2.settingsForm={...a2.settings,cashCheck:0}; await a2.saveSettings(); ok(a2.settings.cashCheck===0,'tetapan cashCheck disimpan'); const a3=mk(); await a3.loadData(); ok(a3.settings.cashCheck===0,'cashCheck kekal selepas muat semula');
// lesson panjang
const a4=mk(); await a4.loadData(); const ot=a4.trades.find(x=>x.status==='OPEN'); a4.openCloseModal(ot); a4.closeForm={...a4.closeForm,sellPrice:5.5,lesson:'x'.repeat(1001)}; await a4.submitCloseTrade(); ok(a4.trades.find(x=>x.tradeId===ot.tradeId).status==='OPEN'&&/1000/.test(a4._t),'catatan >1000 ditolak');
ok(a4.normalize({tradeId:'X',openDate:'2026-01-01',stockName:'OLD',status:'CLOSED',buyPrice:1,quantity:100,sellPrice:2,closeDate:'2026-01-02'}).lesson==='','data lama tanpa lesson = kosong');
// ---- senarai kaunter
const txt=['Kod,Nama','1155,MAYBANK,Malayan Banking Berhad','"5347","TENAGA"','5099WA,AIRASIA-WA','0166\tINARI\tY','6888 AXIATA','9999 XYZ-WB','1234 TESTCO WARRANT','abc','12 5000 NUMBERED CO','5001,'].join('\n');
const r=a.parseCounters(txt);
const names=r.list.map(c=>c.code+':'+c.name).join('|'); ok(r.list.length===5,'5 kaunter sah: '+names);
ok(r.list.some(c=>c.code==='0166'&&c.name==='INARI'),'kod sifar di hadapan (0166) kekal; lajur Y diabaikan');
ok(r.list.some(c=>c.code==='1155'&&c.name==='MAYBANK'),'CSV: nama pendek (lajur pertama selepas kod) dipilih');
ok(r.list.some(c=>c.code==='6888'&&c.name==='AXIATA'),'format ruang kosong');
ok(r.list.some(c=>c.code==='5000'&&c.name==='NUMBERED CO'),'nombor baris di hadapan dibuang');
ok(r.warrants===3,'waran dibuang (kod berhuruf, -WB, WARRANT): '+r.warrants);
const m=a.parseCounters('1155 MAYBANK [S]\n5347 TENAGA\n6888 AXIATA [S]');
ok(m.marked&&m.list.length===2&&m.nonShariah===1&&!m.list.some(c=>c.code==='5347'),'penanda [S]: hanya baris bertanda dimasukkan');
a.counterText=txt; ok(a.counterPreview.list.length===5,'pratonton import');
await a.importCounters(); ok(a.counters.length===5&&a.counterText===''&&a.counterDate.length===10,'import: senarai disimpan');
ok(JSON.parse(localStorage.getItem('sj_counters')).length===5,'disimpan dalam localStorage');
ok(a.resolveCounter('1155')==='MAYBANK'&&a.resolveCounter('9999')==='9999'&&a.resolveCounter('maybank')==='maybank','kod 4 digit -> nama kaunter');
ok(a.counterHint('maybank').ok&&a.counterHint('1155').ok&&!a.counterHint('SIME').ok&&a.counterHint('')===null,'petunjuk patuh syariah');
const b=mk(); await b.loadData(); ok(b.counters.length===5,'senarai kekal selepas muat semula');
a.counterText='sampah\ntiada kod'; await a.importCounters(); ok(a.counters.length===5&&/Tiada kaunter sah/.test(a._t),'fail tanpa kaunter sah tidak menggantikan senarai');
await a.clearCounters(); ok(a.counters.length===0&&a.ctUsingBuiltin&&!a.counterHint('MAYBANK').ok&&a.counterHint('TENAGA NASIONAL BHD').ok,'kembali ke senarai asal (terbina)');
// file
a.pickCounterFile({target:{files:[{size:100,text:'1155,MAYBANK'}],value:'x'}}); await wait(); ok(a.counterText==='1155,MAYBANK','fail dibaca ke kawasan teks');
a.pickCounterFile({target:{files:[{size:4*1024*1024,text:''}],value:''}}); ok(/3MB/.test(a._t),'fail >3MB ditolak');
// GAS
const g=mk(); g.gasUrl='http://x'; const calls=[]; g.api=async(act,p)=>{calls.push([act,p]);return {}}; g.counterText='1155,MAYBANK\n5347,TENAGA'; await g.importCounters();
ok(calls[0][0]==='importCounters'&&calls[0][1].counters.length===2&&!('updatedDate' in calls[0][1].counters[0])&&g.counters.length===2,'mod GAS: hantar importCounters');
console.log(fails?('GAGAL '+fails):'SEMUA LULUS');
})();
