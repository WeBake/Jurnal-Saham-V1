const {sheets,ctx,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
// trade tanpa market = MY; US disimpan
post('createTrade',{openDate:'2026-11-02',stockName:'maybank',buyPrice:10,quantity:100,stopLoss:9.5,buyFees:4});
post('createTrade',{openDate:'2026-11-02',stockName:'aapl',buyPrice:200,quantity:5,stopLoss:190,buyFees:0,market:'US'});
post('createTrade',{openDate:'2026-11-02',stockName:'zzz',buyPrice:2,quantity:100,stopLoss:1.9,market:'junk'});
let tr=get('getTrades').trades; const g=n=>tr.find(t=>t.stockName===n);
ok(g('MAYBANK').market==='MY'&&g('AAPL').market==='US'&&g('ZZZ').market==='MY','market: lalai MY, US disimpan, nilai pelik jadi MY');
ok(new Set(tr.map(t=>t.tradeId)).size===tr.length,'id trade unik merentas pasaran');
// plan & capital
post('createPlan',{stockName:'nvda',entryType:'PULLBACK',entryPrice:100,stopLoss:95,tp1:110,quantity:10,market:'US'});
post('createPlan',{stockName:'tenaga',entryType:'BREAKOUT',entryPrice:10,stopLoss:9.5,tp1:11,quantity:100});
let pl=get('getPlans').plans; ok(pl.find(p=>p.stockName==='NVDA').market==='US'&&pl.find(p=>p.stockName==='TENAGA').market==='MY','plan: market US / lalai MY');
post('createCapital',{date:'2026-11-02',type:'DEPOSIT',amount:500,market:'US'}); post('createCapital',{date:'2026-11-02',type:'DEPOSIT',amount:700});
let cp=get('getCapital').capital; ok(cp.length===2&&cp.some(c=>c.market==='US'&&c.amount===500)&&cp.some(c=>c.market==='MY'&&c.amount===700),'capital: market US / lalai MY');
// dashboard
const d=get('getDashboardData'); ok(d.trades.length===3&&d.plans.length===2&&d.capital.length===2,'dashboard pulangkan semua pasaran');
// tetapan US
let s=get('getSettings').settings; ok(s.usdMyr===4.5&&s.usInitialCapital===5000&&s.usBuyFee===0&&s.buyFee===4&&s.initialCapital===10000,'tetapan lalai US + MY wujud');
let r=post('saveSettings',{usInitialCapital:8000,usBuyFee:1,usTargetFinal:3000,usdMyr:4.6}); ok(r.settings.usInitialCapital===8000&&r.settings.initialCapital===10000&&r.settings.buyFee===4&&r.settings.usdMyr===4.6,'saveSettings US tidak ganggu MY');
r=post('saveSettings',{initialCapital:12000}); ok(r.settings.initialCapital===12000&&r.settings.usInitialCapital===8000,'saveSettings MY tidak ganggu US');
// sektor US sah, sektor palsu ditolak
r=post('saveStock',{stockName:'AAPL',sector:'Technology'}); ok(r.status==='success','stok sektor Technology diterima');
r=post('saveStock',{stockName:'KO',sector:'Consumer Staples'}); ok(r.status==='success','sektor US (Consumer Staples) diterima');
r=post('saveStock',{stockName:'X',sector:'Bukan Sektor'}); ok(r.status==='error','sektor palsu ditolak');
// migrasi: sheet lama tanpa lajur market
const cols=['planId','createdDate','stockName','entryType','entryPrice','stopLoss','tp1','tp2','tp3','quantity','riskPct','currentPrice','setup','notes','status','executedTradeId','updatedDate'];
sheets.PLANS.d=[cols.slice(),['PLN-OLD','2026-01-01','OLD','PULLBACK',1,0.9,1.2,1.3,1.4,100,1,1,'', '', 'WAITING','','2026-01-01']];
pl=get('getPlans').plans; ok(sheets.PLANS.d[0].length===18&&sheets.PLANS.d[0][17]==='market'&&pl.find(p=>p.planId==='PLN-OLD').market==='MY','migrasi PLANS lama: lajur market ditambah, baris lama = MY');
sheets.CAPITAL.d=[['capId','date','type','amount','notes','updatedDate'],['CAP-OLD','2026-01-01','DEPOSIT',100,'','2026-01-01']];
cp=get('getCapital').capital; ok(sheets.CAPITAL.d[0][6]==='market'&&cp[0].market==='MY'&&cp[0].amount===100,'migrasi CAPITAL lama: market ditambah, baris lama = MY');
console.log(fails?'GAGAL '+fails:'SEMUA LULUS');
