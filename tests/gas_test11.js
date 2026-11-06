// COUNTERS: lajur sector + manual
const {sheets,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
// Sheet lama 3 lajur
get('getDashboardData'); sheets.COUNTERS.d=[['code','name','updatedDate'],['5347','TENAGA','2026-01-01']];
let r=get('getCounters'); ok(sheets.COUNTERS.d[0][3]==='sector'&&sheets.COUNTERS.d[0][4]==='manual'&&r.counters[0].sector===''&&r.counters[0].manual==='','migrasi: lajur sector & manual ditambah di hujung');
r=post('importCounters',{counters:[
 {code:'5347',name:'Tenaga Nasional Bhd',sector:'Utilities'},
 {code:'0001',name:'Supercomnet Technologies Bhd',sector:'Healthcare'},
 {code:'7113',name:'Top Glove',sector:'Sektor Palsu'},
 {code:'5235SS',name:'KLCC PROPERTY',sector:'Real Estate Investment Trusts (REITs)',manual:1},
 {code:'5235SS',name:'KLCC LAIN',sector:'Utilities'},
 {code:'1234SS',name:'BUKAN MANUAL',sector:'Utilities'},
 {code:'1155',name:'=HYPERLINK("x") BANK',sector:'Financial Services',manual:true},
 {code:'1234567',name:'TERLALU PANJANG',sector:'Utilities',manual:1},
 {code:'8888',name:'X'.repeat(80),sector:'Utilities'}]});
ok(r.status==='success'&&r.count===6,'import: '+r.count+' sah');
const L=get('getCounters').counters, f=c=>L.find(x=>x.code===c);
ok(f('5347').sector==='Utilities'&&f('5347').manual===''&&f('5347').name==='TENAGA NASIONAL BHD','sektor disimpan; nama huruf besar');
ok(f('0001')&&f('0001').code==='0001','sifar di hadapan kekal');
ok(f('7113').sector==='','sektor tidak sah dikosongkan');
ok(f('5235SS').manual==='1'&&f('5235SS').name==='KLCC PROPERTY','manual: kod 5235SS diterima, pendua kemudian diabaikan');
ok(!f('1234SS')&&!f('1234567'),'kod bukan 4 digit ditolak untuk import biasa / terlalu panjang');
ok(f('1155').name==='HYPERLINK("X") BANK'&&f('1155').manual==='1','awalan formula dibuang');
ok(f('8888').name.length===60,'nama dipotong 60 aksara (bukan 40)');
ok(post('importCounters',{counters:[{code:'5099',name:'AIRASIA-WA',sector:'Utilities'}]}).count===0,'waran tetap ditolak');
ok(get('getDashboardData').counters.length===0,'dashboard: senarai kosong selepas ganti');
console.log(fails?'ADA '+fails+' GAGAL':'SEMUA LULUS'); process.exit(fails?1:0);
