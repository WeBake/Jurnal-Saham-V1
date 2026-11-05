const {Sheet,sheets,ctx,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};

// ===== pemasangan SEDIA ADA: sheet TRADES lama (21 lajur) + 1 trade lama =====
const OLD=["tradeId","openDate","stockName","status","buyPrice","quantity","stopLoss","tp1","tp2","tp3","setup","notes","closeDate","sellPrice","fees","grossPL","netPL","result","realizedRR","exitReason","mistake"];
const old=new Sheet('TRADES'); old.d[0]=OLD.slice(); old.d[1]=['TRD-20260105-001','2026-01-05','MAYBANK','CLOSED',9.8,1000,9.5,10,10.2,10.5,'Breakout','','2026-01-19',10.3,20,300,280,'WIN',0.93,'Target TP1','Tiada']; sheets.TRADES=old;
let r=get('getDashboardData');
ok(r.status==='success'&&Array.isArray(r.ipos)&&sheets.IPOS&&Array.isArray(r.setups),'getDashboardData: ipos + setups dipulangkan, sheet IPOS dicipta automatik');
ok(old.d[0].length===27&&old.d[0][26]==='buyLog'&&old.d[0][24]==='lesson'&&old.d[0][25]==='market'&&old.d[0][21]==='tradeType'&&old.d[0][22]==='buyFees'&&old.d[0][23]==='ipoId','lajur baharu ditambah pada header TRADES lama');
ok(old.d[0].slice(0,21).join()===OLD.join(),'header & susunan lajur lama tidak diubah');
ok(r.trades.length===1&&r.trades[0].netPL===280&&r.trades[0].buyFees===0&&r.trades[0].fees===20,'data trade lama dibaca betul (buyFees 0, net 280 kekal)');

// ===== trade biasa: RM4 + RM4 =====
r=post('createTrade',{openDate:'2026-10-31',stockName:'sunway',buyPrice:4.2,quantity:2000,stopLoss:4.05,tp1:4.5,buyFees:4});
ok(r.status==='success'&&r.trade.buyFees===4&&r.trade.tradeType==='NORMAL','createTrade biasa: buyFees 4, jenis NORMAL');
const id1=r.trade.tradeId;
r=post('closeTrade',{tradeId:id1,closeDate:'2026-11-02',sellPrice:4.5,fees:4}); ok(r.status==='success'&&r.trade.netPL===600-4-4&&r.trade.grossPL===600,'closeTrade: net = 600 - 4 - 4 = '+r.trade.netPL);
// ===== trade IPO: tiada yuran beli (server paksa 0) =====
r=post('createTrade',{openDate:'2026-11-12',stockName:'gamma tech',buyPrice:1.2,quantity:1000,stopLoss:1.05,tradeType:'IPO',buyFees:4,ipoId:'IPO-20261028-001',setup:'IPO'});
ok(r.status==='success'&&r.trade.tradeType==='IPO'&&r.trade.buyFees===0&&r.trade.ipoId==='IPO-20261028-001','createTrade IPO: yuran beli dipaksa 0 walaupun dihantar 4');
const id2=r.trade.tradeId;
r=post('closeTrade',{tradeId:id2,closeDate:'2026-11-13',sellPrice:1.5,fees:4}); ok(r.trade.netPL===300-4&&r.trade.result==='WIN','closeTrade IPO: net = 300 - 4 = '+r.trade.netPL);
r=get('getTrades'); const g=r.trades.find(t=>t.tradeId===id2); ok(g.tradeType==='IPO'&&g.ipoId==='IPO-20261028-001'&&g.buyFees===0,'trade IPO dibaca semula dengan medan IPO');

// ===== IPO CRUD =====
const mk=(o)=>Object.assign({appliedDate:'2026-10-28',stockName:' gamma tech ',ipoPrice:1.2,appliedQty:2000,ballotDate:'2026-11-05',listingDate:'2026-11-12'},o||{});
r=post('createIpo',mk({ipoId:'IPO-20261028-001'})); ok(r.status==='success'&&r.ipo.stockName==='GAMMA TECH'&&r.ipo.status==='APPLIED'&&r.ipo.allottedQty===0,'createIpo');
r=post('createIpo',mk({ipoId:'IPO-20261028-001',stockName:'orion'})); ok(r.status==='success'&&r.ipo.ipoId==='IPO-20261028-002','ID bertindih -> ID unik '+r.ipo.ipoId);
r=post('createIpo',mk({status:'ALLOTTED',allottedQty:500,tradeId:'X'})); ok(r.status==='success'&&r.ipo.status==='APPLIED'&&r.ipo.allottedQty===0&&r.ipo.tradeId==='','createIpo sentiasa mula sebagai APPLIED (status/qty/trade dari klien diabaikan)');
const bads=[[{stockName:''},/Nama/],[{ipoPrice:0},/Harga/],[{appliedQty:0},/Kuantiti/],[{appliedDate:''},/Tarikh mohon/],[{ballotDate:'2026-10-01'},/ballot/i]];
bads.forEach(([p,re])=>{const x=post('createIpo',mk(p)); ok(x.status==='error'&&re.test(x.message),'createIpo ditolak: '+x.message)});
r=get('getIpos'); ok(r.ipos.length===3&&typeof r.ipos[0].ipoPrice==='number'&&r.ipos[0].ballotDate==='2026-11-05','getIpos (tarikh teks, nombor)');
r=post('updateIpo',{ipoId:'IPO-20261028-001',status:'ALLOTTED',allottedQty:3000,tradeId:id2}); ok(r.status==='error'&&/Kuantiti diperuntukkan/.test(r.message),'ALLOTTED qty > dipohon ditolak');
r=post('updateIpo',{ipoId:'IPO-20261028-001',status:'ALLOTTED',allottedQty:1000,tradeId:id2}); ok(r.status==='success'&&r.ipo.status==='ALLOTTED'&&r.ipo.allottedQty===1000&&r.ipo.tradeId===id2&&r.ipo.stockName==='GAMMA TECH','updateIpo -> ALLOTTED separa (1000/2000), dipaut ke trade');
r=post('updateIpo',{ipoId:'IPO-20261028-002',status:'UNSUCCESSFUL',allottedQty:999}); ok(r.status==='success'&&r.ipo.status==='UNSUCCESSFUL'&&r.ipo.allottedQty===0,'UNSUCCESSFUL: allottedQty direset 0');
r=post('updateIpo',{ipoId:'TIADA',status:'UNSUCCESSFUL'}); ok(r.status==='error'&&/tidak dijumpai/.test(r.message),'updateIpo ID tiada');
r=post('updateIpo',{ipoId:'IPO-20261028-001',status:'NGARUT'}); ok(r.status==='success'&&r.ipo.status==='APPLIED'||r.status==='error','status tidak sah dinormalkan/ditolak: '+r.status);
post('updateIpo',{ipoId:'IPO-20261028-001',status:'ALLOTTED',allottedQty:1000,tradeId:id2});
r=post('deleteIpo',{ipoId:'IPO-20261028-002'}); ok(r.status==='success'&&get('getIpos').ipos.length===2,'deleteIpo');
r=post('deleteIpo',{ipoId:'IPO-20261028-002'}); ok(r.status==='error','deleteIpo kali kedua: ralat (tidak dijumpai)');

// ===== SETUP =====
ok(get('getSetups').setups.includes('Breakout')&&get('getSetups').setups.includes('IPO'),'tiada sheet SETUPS: senarai lalai (termasuk IPO) dipulangkan');
r=post('addSetup',{name:'  Momentum   Play '}); ok(r.status==='success'&&r.name==='Momentum Play'&&r.setups.includes('Momentum Play')&&r.setups.includes('Breakout'),'addSetup: nama dinormalkan, senarai lalai kekal');
let n=get('getSetups').setups.length; r=post('addSetup',{name:'momentum play'}); ok(r.name==='Momentum Play'&&get('getSetups').setups.length===n,'addSetup pendua (huruf kecil): tiada baris baharu');
r=post('addSetup',{name:'   '}); ok(r.status==='error'&&/Nama setup/.test(r.message),'addSetup nama kosong ditolak');
ok(post('addSetup',{name:'x'.repeat(80)}).name.length===40,'addSetup: had 40 aksara');
ok(get('getDashboardData').setups.includes('Momentum Play'),'getDashboardData menyertakan setup baharu');
// sheet SETUPS kosong -> lalai tidak hilang
sheets.SETUPS=new Sheet('SETUPS'); sheets.SETUPS.d[0]=['setup']; r=post('addSetup',{name:'Baru'}); ok(r.setups.includes('Breakout')&&r.setups.includes('Baru')&&r.setups.length>=9,'sheet SETUPS kosong: setup lalai diisi dahulu, bukan hilang ('+r.setups.length+')');
delete sheets.SETUPS; r=post('addSetup',{name:'Dari Kosong'}); ok(r.status==='success'&&r.setups.includes('IPO')&&r.setups.includes('Dari Kosong'),'sheet SETUPS tiada: dicipta automatik');

// ===== SETTINGS =====
ok(get('getSettings').settings.buyFee===4&&get('getSettings').settings.sellFee===4,'tetapan lalai buyFee 4 / sellFee 4');
r=post('saveSettings',{buyFee:5,sellFee:6}); ok(r.settings.buyFee===5&&r.settings.sellFee===6&&r.settings.initialCapital===10000,'saveSettings yuran lalai');
// ===== regresi plan =====
r=post('createPlan',{stockName:'inari',entryType:'BREAKOUT',entryPrice:3.1,stopLoss:2.95,createdDate:'2026-10-31'}); ok(r.status==='success'&&get('getDashboardData').plans.length===1,'plan masih berfungsi');
// pemasangan baharu
for(const k in sheets) delete sheets[k]; ctx.initDatabase(); ok(['TRADES','SETTINGS','SETUPS','EXIT_REASONS','MISTAKES','PLANS','IPOS'].every(k=>sheets[k])&&sheets.TRADES.d[0].length===27&&sheets.IPOS.d[0][0]==='ipoId','initDatabase baharu: semua 7 sheet, TRADES 27 lajur');
console.log(fails?'GAGAL '+fails:'SEMUA LULUS'); process.exitCode=fails?1:0;
