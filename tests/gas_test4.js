const {Sheet,sheets,ctx,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
let r=get('getDashboardData');
ok(r.status==='success'&&Array.isArray(r.capital)&&Array.isArray(r.studies)&&sheets.CAPITAL&&sheets.STUDIES,'dashboard: capital & studies + sheet auto-cipta');
ok(r.settings.targetMonthly===0&&r.settings.targetFinal===0,'tetapan sasaran lalai 0');
r=post('createCapital',{date:'2026-10-31',type:'deposit',amount:1500,notes:'gaji'}); ok(r.status==='success'&&r.capital.capId==='CAP-20261031-001'&&r.capital.type==='DEPOSIT'&&r.capital.amount===1500,'createCapital (jenis dinormalkan, ID dijana)');
r=post('createCapital',{capId:'CAP-20261031-001',date:'2026-10-31',type:'WITHDRAW',amount:200}); ok(r.capital.capId==='CAP-20261031-002'&&r.capital.type==='WITHDRAW','ID bertindih -> unik');
ok(post('createCapital',{date:'2026-10-31',amount:0}).status==='error','jumlah 0 ditolak');
ok(post('createCapital',{type:'DEPOSIT',amount:5}).status==='error','tarikh kosong ditolak');
r=get('getCapital'); ok(r.capital.length===2&&r.capital[0].date==='2026-10-31','getCapital');
ok(post('deleteCapital',{capId:'CAP-20261031-001'}).status==='success'&&get('getCapital').capital.length===1,'deleteCapital');
ok(post('deleteCapital',{capId:'nope'}).status==='error','deleteCapital tak wujud -> ralat');
// settings
r=post('saveSettings',{targetMonthly:800,targetYearly:9000,targetFinal:100000}); ok(r.settings.targetFinal===100000&&r.settings.initialCapital===10000,'saveSettings sasaran, kekalkan kunci lain');
r=post('saveSettings',{buyFee:5}); ok(r.settings.targetYearly===9000&&r.settings.buyFee===5,'saveSettings separa kekalkan sasaran');
r=get('getSettings'); ok(r.settings.targetMonthly===800,'getSettings baca sasaran');
// studies
const S=(o)=>Object.assign({studyDate:'2026-10-30',stockName:' maybank ',setup:'Breakout',timeframe:'Harian',rangeFrom:'2025-01-01',rangeTo:'2025-12-31',tradesTested:12,wins:7,losses:5,totalR:5.4,minutes:90,understanding:4,lessons:'ok',mistakes:'',chartLink:''},o||{});
r=post('createStudy',S()); ok(r.status==='success'&&r.study.studyId==='STD-20261030-001'&&r.study.stockName==='MAYBANK'&&r.study.totalR===5.4&&r.study.tradesTested===12,'createStudy');
const id=r.study.studyId;
r=post('createStudy',S({studyId:id})); ok(r.study.studyId==='STD-20261030-002','ID study bertindih -> unik');
const bad=[[{stockName:''},/Nama/],[{studyDate:''},/Tarikh study/],[{tradesTested:2.5},/bulat/],[{wins:9,losses:9},/melebihi/],[{understanding:6},/kefahaman/],[{rangeTo:'2024-01-01'},/akhir/],[{tradesTested:-1},/bulat/]];
bad.forEach(([o,re],i)=>{const x=post('createStudy',S(o)); ok(x.status==='error'&&re.test(x.message||x.error||JSON.stringify(x)),'validasi study #'+(i+1))});
r=post('createStudy',S({understanding:'',stockName:'tenaga',totalR:-1.2})); ok(r.status==='success'&&r.study.understanding===3&&r.study.totalR===-1.2,'kefahaman kosong -> 3, R negatif disimpan');
r=post('updateStudy',{studyId:id,wins:6,lessons:'baharu'}); ok(r.status==='success'&&r.study.wins===6&&r.study.lessons==='baharu'&&r.study.stockName==='MAYBANK'&&r.study.studyId===id,'updateStudy separa');
ok(post('updateStudy',{studyId:id,wins:20}).status==='error','updateStudy tidak sah ditolak');
ok(get('getStudies').studies.find(s=>s.studyId===id).wins===6,'data tidak berubah selepas update gagal');
ok(post('updateStudy',{studyId:'x'}).status==='error','updateStudy tak wujud');
ok(post('deleteStudy',{studyId:id}).status==='success'&&get('getStudies').studies.length===2,'deleteStudy');
// format sheet
ok(sheets.STUDIES.d[0].join()===['studyId','studyDate','stockName','setup','timeframe','rangeFrom','rangeTo','tradesTested','wins','losses','totalR','minutes','understanding','lessons','mistakes','chartLink','updatedDate'].join(),'header STUDIES = medan frontend');
ok(sheets.CAPITAL.d[0].join()==='capId,date,type,amount,notes,updatedDate,market','header CAPITAL = medan frontend');
console.log(fails?'GAGAL '+fails:'SEMUA LULUS');
