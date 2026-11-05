const fs=require('fs');
global.localStorage={_:{},quota:Infinity,getItem(k){return k in this._?this._[k]:null},setItem(k,v){if(k==='sj_knowledge'&&String(v).length>this.quota)throw new Error('QuotaExceededError');this._[k]=String(v)},removeItem(k){delete this._[k]}};
global.window={matchMedia:()=>({matches:false})};
global.document={documentElement:{classList:{toggle(){}}},getElementById:()=>null,createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:(t,q)=>'data:image/jpeg;base64,'+Buffer.from('resized:'+t+q).toString('base64')})};
global.Chart=function(){};
// stub FileReader / Image
global.FileReader=class{readAsDataURL(f){setTimeout(()=>{this.result='data:image/png;base64,AAAA';this.onload()},0)}};
global.Image=class{set src(v){setTimeout(()=>{this.width=3000;this.height=1500;this.onload()},0)}};
eval(fs.readFileSync('_app.js','utf8')+';global.App=stockJournalApp;');
let fails=0; const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const mk=()=>{const a=App(); a.$watch=()=>{}; a.$nextTick=f=>f(); a.toasts=[]; a.showToast=(m,t)=>{a._t=m;a.toasts.push(m)}; return a};
const wait=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
const a=mk(); await a.loadData();
ok(a.knowledge.length===3&&a.pinnedKnowledge.length===3&&a.pinnedCount===3,'3 contoh ilmu dipin pada pelancaran pertama');
a.openKnModal(); a.knForm.title=''; await a.submitKnowledge(); ok(a.knowledge.length===3&&/tajuk/i.test(a._t),'tajuk kosong ditolak');
a.knForm={...a.knForm,title:'T',content:'',imageData:'',imageUrl:''}; await a.submitKnowledge(); ok(a.knowledge.length===3&&/nota atau/i.test(a._t),'tiada nota/gambar ditolak');
a.knForm={...a.knForm,title:'Baharu',content:'isi',pinned:true}; await a.submitKnowledge(); ok(a.knowledge.length===3&&/Maksimum 3/.test(a._t),'pin ke-4 ditolak (borang)');
a.knForm.pinned=false; await a.submitKnowledge(); ok(a.knowledge.length===4&&/^KN-\d{8}-\d{3}$/.test(a.knowledge[3].knId)&&new Set(a.knowledge.map(k=>k.knId)).size===4&&a.pinnedKnowledge.length===3,'ilmu tidak dipin disimpan');
const nk=a.knowledge[3];
await a.toggleKnPin(nk); ok(!a.knowledge[3].pinned&&/Maksimum/.test(a._t),'toggle pin ke-4 ditolak');
await a.toggleKnPin(a.knowledge[0]); ok(a.pinnedCount===2,'nyahpin'); await a.toggleKnPin(a.knowledge[3]); ok(a.pinnedCount===3&&a.knowledge[3].pinned,'pin selepas nyahpin');
// edit: maks pin tidak kira diri sendiri
a.openKnModal(a.knowledge[3]); a.knForm.title='Baharu 2'; await a.submitKnowledge(); ok(a.knowledge.find(k=>k.knId===nk.knId).title==='Baharu 2'&&a.pinnedCount===3,'edit ilmu yang dipin kekal boleh disimpan');
// gambar: muat naik disimulasi
a.openKnModal(); const ev={target:{files:[{type:'image/png',size:1000}],value:'x'}}; a.pickKnImage(ev); ok(a.knImgBusy&&ev.target.value==='','muat naik bermula, input direset'); await wait();
ok(!a.knImgBusy&&a.knForm.imageData.startsWith('data:image/jpeg;base64,')&&a.knFormImage===a.knForm.imageData,'gambar dimampatkan jadi JPEG dan dipratonton');
a.knForm.title='Bergambar'; a.knForm.content='nota'; a.knForm.pinned=false; await a.submitKnowledge(); const pic=a.knowledge.find(k=>k.title==='Bergambar'); ok(pic&&pic.imageUrl.startsWith('data:image/jpeg')&&a.safeImg(pic.imageUrl)===pic.imageUrl,'mod demo: gambar disimpan dalam rekod');
ok(JSON.parse(localStorage.getItem('sj_knowledge')).find(k=>k.title==='Bergambar').imageUrl.length>20,'gambar dalam localStorage');
// pin gambar → dashboard
await a.toggleKnPin(a.knowledge[1]); await a.toggleKnPin(pic); ok(a.pinnedKnowledge.some(k=>k.title==='Bergambar'&&a.safeImg(k.imageUrl)),'ilmu bergambar dipin muncul di dashboard');
// buang gambar
a.openKnModal(pic); ok(a.knFormImage!==''); a.removeKnImage(); ok(a.knFormImage===''); await a.submitKnowledge(); ok(a.knowledge.find(k=>k.knId===pic.knId).imageUrl==='','buang gambar semasa edit');
// fail tak sah
a.openKnModal(); a.pickKnImage({target:{files:[{type:'application/pdf',size:10}],value:''}}); ok(/PNG/.test(a._t)&&!a.knImgBusy,'PDF ditolak');
a.pickKnImage({target:{files:[{type:'image/png',size:11*1024*1024}],value:''}}); ok(/10MB/.test(a._t),'>10MB ditolak');
a.setKnImage('data:image/svg+xml;base64,AAAA'); ok(a.knForm.imageData==='' ,'SVG ditolak');
a.setKnImage('data:image/jpeg;base64,'+'A'.repeat(1500000)); ok(a.knForm.imageData==='','>1.4MB ditolak');
// keselamatan paparan
ok(a.safeImg('javascript:alert(1)')===''&&a.safeImg('https://evil.com/a.png')===''&&a.safeImg('https://drive.google.com/thumbnail?id=ABC&sz=w1200')!==''&&a.safeImg('data:image/png;base64,AAAA" onerror="x')==='','safeImg: hanya data:image/drive dibenarkan');
// cari
a.knSearch='prinsip'; ok(a.filteredKnowledge.length>=1,'cari ikut kategori/tajuk'); a.knSearch='';
ok(a.filteredKnowledge[0].pinned,'ilmu dipin disusun dahulu');
// padam
a.openDeleteKnModal(pic); await a.confirmDeleteKn(); ok(!a.knowledge.some(k=>k.knId===pic.knId),'padam ilmu');
// muat semula
const b=mk(); await b.loadData(); ok(b.knowledge.length===a.knowledge.length&&b.pinnedCount===a.pinnedCount,'muat semula: ilmu kekal');
b.knowledge=[]; b.saveLocal(); const c=mk(); await c.loadData(); ok(c.knowledge.length===0,'kosong kekal kosong');
// kuota penuh
const d=mk(); await d.loadData(); d.knowledge=d.sampleKnowledge(); localStorage.quota=10; d.saveLocal(); ok(/penuh/.test(d._t)&&d.trades.length>0,'kuota storan penuh: amaran, data lain tetap disimpan'); localStorage.quota=Infinity;
// GAS mod: payload
const g=mk(); g.gasUrl='http://x'; const calls=[]; g.api=async(act,p)=>{calls.push([act,p]);return {knowledge:{...p,pinned:p.pinned,imageUrl:p.imageData?'https://drive.google.com/thumbnail?id=Z&sz=w1200':p.imageUrl,knId:p.knId}}};
g.knowledge=[]; g.openKnModal(); g.knForm={...g.knForm,title:'G',content:'c',pinned:true,imageData:'data:image/jpeg;base64,AAAA'}; await g.submitKnowledge();
ok(calls[0][0]==='createKnowledge'&&calls[0][1].pinned===1&&calls[0][1].imageData.startsWith('data:image')&&g.knowledge[0].imageUrl.startsWith('https://drive.google.com/')&&g.knowledge[0].pinned===true,'mod GAS: hantar imageData, simpan URL Drive dari server');
await g.toggleKnPin(g.knowledge[0]); ok(calls[1][0]==='updateKnowledge'&&calls[1][1].pinned===0&&!('imageData' in calls[1][1]),'mod GAS: nyahpin hantar payload ringkas');
console.log(fails?('GAGAL '+fails):'SEMUA LULUS');
})();
