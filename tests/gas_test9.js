// Ujian backend DCA: lajur buyLog, purata harga dikira di server daripada log belian
const {sheets,ctx,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b)=>Math.abs(a-b)<1e-9;
ctx.initDatabase(); ok(sheets.TRADES.d[0][26]==='buyLog'&&sheets.TRADES.d[0].length===27,'TRADES: lajur buyLog di hujung (27 lajur)');
let r=post('createTrade',{openDate:'2026-11-01',stockName:'aapl',buyPrice:150,quantity:10,stopLoss:120,buyFees:1,market:'US'});
ok(r.status==='success'&&r.trade.buyLog==='','trade baharu: buyLog kosong'); const id=r.trade.tradeId;
const log=[{date:'2026-11-01',price:150,qty:10,fee:1},{date:'2026-11-05',price:140,qty:20,fee:1.5}];
// klien hantar nilai purata yang SALAH; server mesti kira semula daripada log
r=post('updateTrade',{tradeId:id,buyLog:JSON.stringify(log),buyPrice:999,quantity:1,buyFees:0,stopLoss:120});
ok(r.status==='success','updateTrade dengan buyLog berjaya');
ok(r.trade.quantity===30&&near(r.trade.buyPrice,Math.round(4300/30*1e6)/1e6)&&r.trade.buyFees===2.5,'server kira purata: 30 unit @ 143.333333, yuran 2.5 ('+r.trade.buyPrice+')');
ok(JSON.parse(r.trade.buyLog).length===2&&r.trade.openDate==='2026-11-01','log 2 belian disimpan; openDate = belian pertama');
let t=get('getTrades').trades.find(x=>x.tradeId===id); ok(t.quantity===30&&JSON.parse(t.buyLog)[1].price===140&&t.market==='US','dibaca semula dari Sheet dengan betul');
// SL mesti < purata baharu
r=post('updateTrade',{tradeId:id,buyLog:JSON.stringify([...log,{date:'2026-11-06',price:100,qty:100,fee:0}]),stopLoss:125});
ok(r.status==='error'&&/Stop loss/i.test(r.message),'SL di atas purata baharu ditolak: '+r.message);
// log tidak sah
ok(post('updateTrade',{tradeId:id,buyLog:'bukan json'}).status==='error','buyLog bukan JSON ditolak');
ok(post('updateTrade',{tradeId:id,buyLog:JSON.stringify([{date:'2026-11-01',price:-1,qty:10,fee:0},{date:'2026-11-02',price:1,qty:1,fee:0}])}).status==='error','harga negatif ditolak');
ok(post('updateTrade',{tradeId:id,buyLog:JSON.stringify([{date:'x',price:1,qty:1,fee:0},{date:'2026-11-02',price:1,qty:1,fee:0}])}).status==='error','tarikh tidak sah ditolak');
ok(post('updateTrade',{tradeId:id,buyLog:JSON.stringify(Array.from({length:201},(_,i)=>({date:'2026-11-01',price:1,qty:1,fee:0})))}).status==='error','lebih 200 belian ditolak');
t=get('getTrades').trades.find(x=>x.tradeId===id); ok(t.quantity===30,'data tidak berubah selepas permintaan ditolak');
// tutup: P/L guna purata + jumlah yuran beli
r=post('closeTrade',{tradeId:id,closeDate:'2026-11-10',sellPrice:160,fees:2,exitReason:'Target TP1',mistake:'Tiada'});
const exp=Math.round(((160-Math.round(4300/30*1e6)/1e6)*30-2.5-2)*100)/100;
ok(r.status==='success'&&r.trade.netPL===exp&&r.trade.netPL===495.5,'tutup: net P/L = (160 − purata) × 30 − 2.5 − 2 = '+r.trade.netPL);
ok(JSON.parse(r.trade.buyLog).length===2,'log belian kekal selepas ditutup');
ok(post('updateTrade',{tradeId:id,buyLog:JSON.stringify([...log,{date:'2026-11-07',price:150,qty:1,fee:0}])}).status==='error','trade CLOSED: log belian tidak boleh diubah');
ok(post('updateTrade',{tradeId:id,notes:'ok'}).status==='success','trade CLOSED: medan lain masih boleh dikemas kini');
// log 1 belian = disimpan; buang balik ke kosong
r=post('createTrade',{openDate:'2026-11-01',stockName:'spus',buyPrice:40,quantity:5,stopLoss:30,market:'US'});
let r2=post('updateTrade',{tradeId:r.trade.tradeId,buyLog:''}); ok(r2.status==='success'&&r2.trade.buyLog===''&&r2.trade.quantity===5,'buyLog kosong: nilai trade asal kekal');
// sheet lama (26 lajur) dimigrasi
console.log(fails?('GAGAL: '+fails):'SEMUA LULUS'); if(fails)process.exitCode=1;
