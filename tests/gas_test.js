const fs=require('fs'); const vm=require('vm');
class Range{constructor(sh,r,c,nr,nc){Object.assign(this,{sh,r,c,nr,nc})}
 getValues(){const o=[];for(let i=0;i<this.nr;i++){const row=[];for(let j=0;j<this.nc;j++)row.push((this.sh.d[this.r-1+i]||[])[this.c-1+j]??'');o.push(row)}return o}
 setValues(v){v.forEach((row,i)=>row.forEach((x,j)=>{const R=this.r-1+i;this.sh.d[R]=this.sh.d[R]||[];this.sh.d[R][this.c-1+j]=x}));return this}
 clearContent(){for(let i=0;i<this.nr;i++)for(let j=0;j<this.nc;j++){const R=this.r-1+i;if(this.sh.d[R])this.sh.d[R][this.c-1+j]=''}return this}
 setValue(v){return this.setValues([[v]])} setNumberFormat(){return this} setFontWeight(){return this} setBackground(){return this} setFontColor(){return this}}
class Sheet{constructor(n){this.n=n;this.d=[]}
 getRange(r,c,nr=1,nc=1){return new Range(this,r,c,nr,nc)}
 getLastRow(){let l=0;this.d.forEach((r,i)=>{if(r&&r.some(x=>x!==''&&x!==undefined))l=i+1});return l}
 getMaxRows(){return Math.max(this.getLastRow()+50,100)}
 deleteRow(r){this.d.splice(r-1,1)} setFrozenRows(){} getMaxColumns(){return this.maxCols||26} insertColumnsAfter(c,n){this.maxCols=(this.maxCols||26)+n}}
const sheets={};
const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=new Sheet(n),getSheets:()=>Object.values(sheets),deleteSheet(){}};
const out=o=>({_:o,setMimeType(){return this}});
const ctx={SpreadsheetApp:{getActiveSpreadsheet:()=>ss,openById:()=>ss},
 ContentService:{createTextOutput:t=>({t,setMimeType(){return this}}),MimeType:{JSON:1}},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Utilities:{formatDate:(d,tz,f)=>d.toISOString().slice(0,10)},console};
vm.createContext(ctx); vm.runInContext(fs.readFileSync('Code.gs','utf8'),ctx);
const post=(action,payload)=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({action,payload})}}).t);
const get=(a)=>JSON.parse(ctx.doGet({parameter:{action:a}}).t);
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};

// pemasangan SEDIA ADA: guna initDatabase lama tanpa PLANS -> padam PLANS selepas init
ctx.initDatabase(); ok(!!sheets.PLANS,'initDatabase cipta sheet PLANS');
delete sheets.PLANS;
let r=get('getDashboardData'); ok(r.status==='success'&&Array.isArray(r.plans)&&r.plans.length===0&&!!sheets.PLANS,'pemasangan sedia ada: PLANS dicipta automatik');
ok(JSON.stringify(sheets.PLANS.d[0])===JSON.stringify(['planId','createdDate','stockName','entryType','entryPrice','stopLoss','tp1','tp2','tp3','quantity','riskPct','currentPrice','setup','notes','status','executedTradeId','updatedDate','market']),'header PLANS betul');

r=post('createPlan',{planId:'PLN-20261031-001',createdDate:'2026-10-31',stockName:' sunway ',entryType:'PULLBACK',entryPrice:4.2,stopLoss:4.05,tp1:4.425,tp2:4.5,tp3:4.65,quantity:2000,riskPct:1.5,setup:'Pullback',notes:'nota'});
ok(r.status==='success'&&r.plan.stockName==='SUNWAY'&&r.plan.status==='WAITING'&&r.plan.entryPrice===4.2,'createPlan');
r=post('createPlan',{planId:'PLN-20261031-001',stockName:'INARI',entryType:'BREAKOUT',entryPrice:3.1,stopLoss:2.95,createdDate:'2026-10-31'});
ok(r.status==='success'&&r.plan.planId==='PLN-20261031-002'&&r.plan.entryType==='BREAKOUT','ID bertindih -> dijana ID unik '+r.plan.planId);
r=post('createPlan',{stockName:'BAD',entryPrice:3,stopLoss:3}); ok(r.status==='error'&&/Stop loss/.test(r.message),'SL>=entry ditolak: '+r.message);
r=post('createPlan',{stockName:'',entryPrice:3,stopLoss:2}); ok(r.status==='error','nama kosong ditolak');
r=get('getPlans'); ok(r.plans.length===2&&r.plans[0].createdDate==='2026-10-31'&&typeof r.plans[0].tp2==='number','getPlans (tarikh teks, nombor)');
r=post('updatePlan',{planId:'PLN-20261031-001',currentPrice:4.18}); ok(r.status==='success'&&r.plan.currentPrice===4.18&&r.plan.entryPrice===4.2&&r.plan.stockName==='SUNWAY','updatePlan separa (kekalkan medan lain)');
r=post('updatePlan',{planId:'PLN-20261031-001',status:'EXECUTED',executedTradeId:'TRD-20261031-001'}); ok(r.plan.status==='EXECUTED'&&r.plan.executedTradeId==='TRD-20261031-001','status EXECUTED + link trade');
r=post('updatePlan',{planId:'TIADA',currentPrice:1}); ok(r.status==='error'&&/tidak dijumpai/.test(r.message),'updatePlan ID tiada');
r=post('updatePlan',{planId:'PLN-20261031-002',stopLoss:3.5}); ok(r.status==='error','updatePlan SL tidak sah ditolak');
r=post('deletePlan',{planId:'PLN-20261031-002'}); ok(r.status==='success'&&get('getPlans').plans.length===1,'deletePlan');
// regresi trade
r=post('createTrade',{openDate:'2026-10-31',stockName:'sunway',buyPrice:4.2,quantity:2000,stopLoss:4.05,tp1:4.425}); ok(r.status==='success'&&r.trade.tradeId==='TRD-20261031-001','createTrade masih berfungsi');
r=post('closeTrade',{tradeId:'TRD-20261031-001',closeDate:'2026-11-02',sellPrice:4.5,fees:10}); ok(r.status==='success'&&r.trade.netPL===590&&r.trade.result==='WIN','closeTrade: netPL '+r.trade.netPL);
r=get('getDashboardData'); ok(r.trades.length===1&&r.plans.length===1&&r.settings.initialCapital===10000,'getDashboardData lengkap');
console.log(fails?'GAGAL '+fails:'SEMUA LULUS'); process.exitCode=fails?1:0;
