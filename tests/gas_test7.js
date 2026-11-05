const {sheets,ctx,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
let r=get('getDashboardData'); ok(Array.isArray(r.counters)&&sheets.COUNTERS&&r.settings.cashCheck===1,'dashboard: counters + cashCheck lalai 1');
r=post('importCounters',{counters:[{code:'1155',name:'maybank'},{code:'0166',name:'INARI'},{code:'1155',name:'DUP'},{code:'5099',name:'AIRASIA-WA'},{code:'1234WA',name:'X'},{code:'12',name:'BAD'},{code:'7113',name:'TOPGLOV-C45'},{code:'5000',name:'SOME WARRANT B'},{code:'5001',name:' '}]});
ok(r.status==='success'&&r.count===2,'import: hanya 2 kaunter sah (waran, kod salah, pendua, nama kosong dibuang): '+r.count);
r=get('getCounters'); ok(r.counters.length===2&&r.counters.some(c=>c.code==='0166'&&c.name==='INARI')&&r.counters.some(c=>c.code==='1155'&&c.name==='MAYBANK'),'kod dengan sifar di hadapan kekal (0166)');
r=post('importCounters',{counters:[{code:'5347',name:'TENAGA'}]}); ok(r.count===1&&get('getCounters').counters.length===1,'import menggantikan senarai lama');
ok(post('importCounters',{counters:[]}).status==='success'&&get('getCounters').counters.length===0,'senarai kosong = kosongkan');
ok(post('importCounters',{}).status==='error','tanpa senarai ditolak');
ok(post('importCounters',{counters:new Array(3001).fill({code:'1111',name:'AB'})}).status==='error','>3000 ditolak');
// lesson
post('createTrade',{openDate:'2026-11-02',stockName:'lesson co',buyPrice:2,quantity:1000,stopLoss:1.9,buyFees:4}); const id=get('getTrades').trades.find(t=>t.stockName==='LESSON CO').tradeId;
r=post('closeTrade',{tradeId:id,closeDate:'2026-11-05',sellPrice:2.2,fees:4,lesson:'Tunggu pengesahan volum'}); ok(r.status==='success'&&r.trade.lesson==='Tunggu pengesahan volum','closeTrade simpan lesson');
ok(get('getTrades').trades.find(t=>t.tradeId===id).lesson==='Tunggu pengesahan volum','lesson dibaca semula');
post('createTrade',{openDate:'2026-11-02',stockName:'b',buyPrice:2,quantity:1000,stopLoss:1.9}); const id2=get('getTrades').trades.find(t=>t.stockName==='B').tradeId;
r=post('closeTrade',{tradeId:id2,closeDate:'2026-11-05',sellPrice:2.2,fees:4,lesson:'x'.repeat(1500)}); ok(r.trade.lesson.length===1000,'lesson dipotong 1000 aksara');
r=post('saveSettings',{cashCheck:0}); ok(r.settings.cashCheck===0&&r.settings.buyFee===4,'saveSettings cashCheck 0 (kunci lain kekal)'); ok(get('getSettings').settings.cashCheck===0,'cashCheck 0 dibaca semula');
ok(sheets.TRADES.d[0][24]==='lesson'&&sheets.TRADES.d[0].length===27,'lajur lesson ditambah (27 lajur dengan buyLog)');
console.log(fails?'GAGAL '+fails:'SEMUA LULUS');
