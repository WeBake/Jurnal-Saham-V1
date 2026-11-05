// Ujian backend: tetapan teks ownerName
const {sheets,ctx,post,get}=require('./gas_mock.js');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
ctx.initDatabase();
let s=get('getSettings').settings; ok(s.ownerName===''&&s.initialCapital===10000,'lalai: ownerName kosong, tetapan nombor kekal');
ok(sheets.SETTINGS.d.some(r=>r[0]==='ownerName'),'initDatabase: baris ownerName dalam SETTINGS');
let r=post('saveSettings',{ownerName:'  Ahmad   Zaki '}); ok(r.status==='success'&&r.settings.ownerName==='Ahmad Zaki','simpan nama (ruang dikemaskan)');
ok(get('getSettings').settings.ownerName==='Ahmad Zaki'&&get('getDashboardData').settings.ownerName==='Ahmad Zaki','dibaca semula (getSettings & getDashboardData)');
post('saveSettings',{initialCapital:20000}); s=get('getSettings').settings; ok(s.ownerName==='Ahmad Zaki'&&s.initialCapital===20000,'simpan parameter lain: nama tidak hilang');
r=post('saveSettings',{ownerName:'=HYPERLINK("x")<script>'}); ok(r.settings.ownerName==='HYPERLINK("x")script','formula & tag HTML dibuang: '+r.settings.ownerName);
r=post('saveSettings',{ownerName:'x'.repeat(80)}); ok(r.settings.ownerName.length===40,'maks 40 aksara');
r=post('saveSettings',{ownerName:''}); ok(r.settings.ownerName===''&&r.settings.initialCapital===20000,'nama boleh dikosongkan');
// sheet lama tanpa baris ownerName
const sh=sheets.SETTINGS; sh.d=sh.d.filter(x=>x[0]!=='ownerName'); ok(get('getSettings').settings.ownerName==='','sheet lama tanpa ownerName: lalai kosong');
r=post('saveSettings',{ownerName:'Siti'}); ok(r.settings.ownerName==='Siti'&&sh.d.some(x=>x[0]==='ownerName'&&x[1]==='Siti'),'sheet lama: baris ownerName ditambah bila disimpan');
console.log(fails?('GAGAL: '+fails):'SEMUA LULUS'); if(fails)process.exitCode=1;
