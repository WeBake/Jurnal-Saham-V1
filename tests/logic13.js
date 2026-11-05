// Ujian klien: nama pemilik boleh diubah di Settings
const fs=require('fs');
global.localStorage={_:{},getItem(k){return k in this._?this._[k]:null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={title:'',documentElement:{classList:{toggle(){}}},getElementById:()=>null};
global.Chart=function(){}; global.FileReader=class{};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.showToast=m=>{a._t=m}; a.loadData=async()=>{}; return a};
(async()=>{
 let a=mk(); a.initApp(); ok(a.ownerName===''&&document.title==='Journal Saham','pengguna baharu: tiada nama, tajuk umum');
 a.ownerInput='  Ahmad  '; await a.saveOwnerName(); ok(a.ownerName==='Ahmad'&&localStorage.getItem('sj_owner')==='Ahmad'&&document.title==='Journal Saham · Ahmad','simpan nama (mod demo): pelayar + tajuk');
 let b=mk(); b.initApp(); ok(b.ownerName==='Ahmad'&&b.ownerInput==='Ahmad','muat semula: nama kekal');
 a.ownerInput='=SUM(A1)<b>'; await a.saveOwnerName(); ok(a.ownerName==='SUM(A1)b','dibersihkan: '+a.ownerName);
 ok(a.cleanOwner('x'.repeat(60)).length===40,'maks 40 aksara');
 a.ownerInput=''; await a.saveOwnerName(); ok(a.ownerName===''&&/dikosongkan/.test(a._t),'boleh dikosongkan');
 // mod GAS: hantar ke server; nama dari server diguna pada pelayar lain
 let sent=null; global.fetch=async(u,o)=>{ if(o&&o.body){sent=JSON.parse(o.body);return {json:async()=>({status:'success',settings:{}})};}
   return {json:async()=>({status:'success',trades:[],settings:{ownerName:'Siti Aminah'}})}; };
 global.localStorage._={}; let g=App(); g.$watch=()=>{}; g.$nextTick=f=>f(); g.showToast=()=>{}; g.gasUrl='https://script.google.com/x/exec'; await g.loadData();
 ok(g.ownerName==='Siti Aminah'&&localStorage.getItem('sj_owner')==='Siti Aminah','mod GAS: nama dimuat dari Sheet (peranti baharu)');
 g.ownerInput='Siti'; await g.saveOwnerName(); ok(sent&&sent.action==='saveSettings'&&sent.payload.ownerName==='Siti'&&Object.keys(sent.payload).length===1,'mod GAS: saveSettings hanya hantar ownerName');
 global.fetch=async()=>({json:async()=>({status:'success',trades:[],settings:{}})}); let h=App(); h.$watch=()=>{}; h.$nextTick=f=>f(); h.showToast=()=>{}; h.gasUrl='x'; h.ownerName='Lama'; await h.loadData();
 ok(h.ownerName==='Lama','Apps Script lama (tiada ownerName): nama dalam pelayar dikekalkan');
 const html=fs.readFileSync('src.html','utf8'); ok(!/taufiq/i.test(html),'tiada lagi nama "Taufiq" tertulis tetap dalam aplikasi');
 console.log(fails?'GAGAL: '+fails:'SEMUA LULUS'); if(fails)process.exitCode=1;
})();
