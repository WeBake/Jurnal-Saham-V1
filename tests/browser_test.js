// Ujian pelayar sebenar (Chromium headless). CDN dihala ke salinan npm tempatan.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const FILE='file://'+path.resolve(process.argv[2]||'index.html');
const ALP=fs.readFileSync('node_modules/alpinejs/dist/cdn.min.js','utf8'), CH=fs.readFileSync('node_modules/chart.js/dist/chart.umd.js','utf8');
(async()=>{
 const b=await chromium.launch(); const errs=[]; let fails=0;
 const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
 async function page(vp){
  const ctx=await b.newContext({viewport:vp, acceptDownloads:true}); const p=await ctx.newPage();
  await p.route(/alpinejs/,r=>r.fulfill({body:ALP,contentType:'text/javascript'}));
  await p.route(/chart\.js/,r=>r.fulfill({body:CH,contentType:'text/javascript'}));
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  p.on('console',m=>{ if(m.type()==='error'&&!/ERR_FAILED|fonts/.test(m.text())) errs.push('console: '+m.text()); if(m.type()==='warning'&&/Alpine/.test(m.text())) errs.push('alpine warn: '+m.text()); });
  await p.goto(FILE); await p.waitForTimeout(1200); return p;
 }
 const p=await page({width:1366,height:900});
 ok(await p.evaluate(()=>!!window.Alpine),'Alpine dimuatkan');
 const tabs=await p.evaluate(()=>Alpine.$data(document.querySelector('[x-data]')).visibleTabs.map(t=>t.id));
 console.log('tabs:',tabs.join(','));
 ok(await p.locator('canvas').count()>=3,'carta dashboard dirender ('+await p.locator('canvas').count()+' canvas)');
 for(const h of ['Prestasi ikut Setup','Analisis Kesilapan','Pendedahan Sektor']) ok(await p.getByRole('heading',{name:h}).isVisible(),'kad "'+h+'" dipaparkan');
 ok(await p.evaluate(()=>!!(window.Chart&&Chart.getChart(document.getElementById('sectorChart')))),'carta donut sektor dirender');
 await p.screenshot({path:'shots/dashboard.png',fullPage:true});
 for(const t of tabs){ await p.evaluate(t=>{Alpine.$data(document.querySelector('[x-data]')).activeTab=t},t); await p.waitForTimeout(400);
   const vis=await p.locator(`section[x-show="activeTab==='${t}'"]`).first().isVisible().catch(()=>false);
   ok(vis,'tab '+t+' dipaparkan'); await p.screenshot({path:`shots/tab-${t}.png`,fullPage:true}); }
 // aliran: tambah trade melalui UI data, tukar US, dark mode
 const d=()=>p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));return {n:a.trades.length,m:a.market,cap:a.currentCapital}});
 const before=await d();
 await p.evaluate(()=>Alpine.$data(document.querySelector('[x-data]')).setMarket('US')); await p.waitForTimeout(500);
 const us=await d(); ok(us.m==='US','tukar ke US'); 
 await p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.activeTab='money';a.moneyView='calc'}); await p.waitForTimeout(300);
 ok(await p.getByText('Modal (USD)').isVisible(),'label kalkulator "Modal (USD)" dalam mod US');
 await p.evaluate(()=>Alpine.$data(document.querySelector('[x-data]')).setMarket('MY')); await p.waitForTimeout(300);
 ok(await p.getByText('Modal (MYR)').isVisible(),'label kalkulator "Modal (MYR)" dalam mod MY');
 // nama pemilik melalui Settings
 await p.evaluate(()=>{Alpine.$data(document.querySelector('[x-data]')).activeTab='dashboard'}); await p.waitForTimeout(300);
 ok(await p.getByText('Tetapkan nama anda').isVisible(),'nama: pautan "Tetapkan nama anda" bila kosong');
 await p.evaluate(()=>{Alpine.$data(document.querySelector('[x-data]')).activeTab='settings'}); await p.waitForTimeout(300);
 await p.getByLabel('Nama anda').fill('Ahmad Zaki'); await p.getByRole('button',{name:'Simpan Nama'}).click(); await p.waitForTimeout(300);
 await p.evaluate(()=>{Alpine.$data(document.querySelector('[x-data]')).activeTab='dashboard'}); await p.waitForTimeout(300);
 ok(await p.getByText('Selamat datang, Ahmad Zaki').isVisible()&&(await p.title())==='Journal Saham · Ahmad Zaki','nama: dipaparkan di dashboard dan tajuk tab');
 // DCA melalui UI sebenar
 await p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.activeTab='journal';a.statusFilter='OPEN'}); await p.waitForTimeout(400);
 await p.locator('table button:has-text("+ Beli")').first().click(); await p.waitForTimeout(300);
 ok(await p.getByRole('heading',{name:/Tambah Beli \(DCA\)/}).isVisible(),'DCA: modal dibuka dari butang "+ Beli"');
 const before2=await p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));const t=a.openTrades[0];return {q:t.quantity,p:t.buyPrice}});
 const dm=p.locator('div[x-show="showDcaModal"]');
 await dm.locator('input[type=number]').nth(0).fill(String(before2.p*0.9)); await dm.locator('input[type=number]').nth(1).fill('100'); await p.waitForTimeout(200);
 ok(await dm.getByText('Purata Harga').isVisible(),'DCA: pratonton purata dipaparkan');
 await p.screenshot({path:'shots/dca-modal.png'});
 await dm.getByRole('button',{name:'Simpan Belian'}).click(); await p.waitForTimeout(500);
 const after2=await p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));const t=a.openTrades[0];return {q:t.quantity,p:t.buyPrice,n:a.dcaCount(t)}});
 ok(after2.q===before2.q+100&&after2.n===2&&after2.p<before2.p,'DCA: disimpan melalui UI ('+before2.q+'→'+after2.q+' unit, purata '+before2.p+'→'+after2.p.toFixed(4)+')');
 ok(await p.locator('table').getByText('DCA ×2').first().isVisible(),'DCA: lencana "DCA ×2" dalam Journal');
 await p.locator('table button:has-text("Butiran")').first().click(); await p.waitForTimeout(300);
 ok(await p.getByText('Rekod Belian (2)').isVisible(),'DCA: senarai rekod belian dalam Butiran');
 await p.screenshot({path:'shots/dca-detail.png'});
 await p.keyboard.press('Escape'); await p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.showDetailModal=false;a.statusFilter='ALL'});
 // eksport CSV sebenar
 await p.evaluate(()=>{Alpine.$data(document.querySelector('[x-data]')).activeTab='settings'}); await p.waitForTimeout(300);
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}),p.getByText('Eksport CSV').click()]);
 const csv=fs.readFileSync(await dl.path(),'utf8'); ok(csv.startsWith('﻿tradeId,market'),'muat turun CSV sebenar berjaya ('+csv.split('\n').length+' baris)');
 // dark mode
 await p.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.activeTab='dashboard'; if(!document.documentElement.classList.contains('dark')) a.toggleTheme()}); await p.waitForTimeout(600);
 await p.screenshot({path:'shots/dashboard-dark.png',fullPage:true});
 // telefon
 const m=await page({width:390,height:844});
 const ov=await m.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 const fr=await m.evaluate(()=>{const els=[...document.querySelectorAll('select[aria-label=Bulan],select[aria-label=Tahun]')].concat([...document.querySelectorAll('button')].filter(x=>x.textContent.trim()==='Bulan Ini'));return els.filter(e=>e.offsetParent).map(e=>(r=>Math.round(r.top+r.height/2))(e.getBoundingClientRect()))});
 ok(fr.length===3&&Math.max(...fr)-Math.min(...fr)<=4,'telefon: penapis Bulan/Tahun/Bulan Ini dalam satu baris ('+fr.join(',')+')');
 await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.filterYear='2026';a.filterMonth='09'}); await m.waitForTimeout(300);
 const fr2=await m.evaluate(()=>[...document.querySelector('select[aria-label=Bulan]').parentElement.children].filter(e=>e.offsetParent).map(e=>(r=>Math.round(r.top+r.height/2))(e.getBoundingClientRect())));
 ok(fr2.length===4&&Math.max(...fr2)-Math.min(...fr2)<=4,'telefon: dengan butang Reset pun masih satu baris ('+fr2.join(',')+')');
 await m.screenshot({path:'shots/mobile-filter.png',clip:{x:0,y:200,width:390,height:200}});
 await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.filterYear='all';a.filterMonth='all'}); await m.waitForTimeout(300); ok(ov<=1,'telefon: tiada skrol mendatar ('+ov+'px)');
 await m.screenshot({path:'shots/mobile.png',fullPage:true});
 for(const t of tabs){ await m.evaluate(t=>{Alpine.$data(document.querySelector('[x-data]')).activeTab=t},t); await m.waitForTimeout(300);
   const o=await m.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth); if(o>1) ok(false,'telefon: tab '+t+' melimpah '+o+'px'); }
 // carian saham + sektor automatik (telefon, taip sebenar)
 await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.activeTab='journal';a.openAddModal()}); await m.waitForTimeout(400);
 const si=m.locator('input[x-model="form.stockName"]'); await si.click(); await si.fill(''); await si.type('tenaga',{delay:20}); await m.waitForTimeout(200);
 const dd=m.locator('input[x-model="form.stockName"] ~ .stock-dd'); ok(await dd.isVisible(),'taip "tenaga": senarai cadangan muncul');
 const first=await dd.locator('button').first().innerText(); ok(/5347/.test(first)&&/TENAGA NASIONAL BHD/.test(first)&&/Utilities/.test(first),'cadangan tunjuk kod, nama, sektor');
 const ddBox=await dd.boundingBox(); ok(ddBox&&ddBox.x>=0&&ddBox.x+ddBox.width<=391,'telefon: senarai cadangan muat skrin');
 await m.screenshot({path:'shots/stock-search.png'});
 await m.keyboard.press('Enter'); await m.waitForTimeout(250);
 const st=await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));return {n:a.form.stockName,s:a.fund.sector,h:a.counterHint(a.form.stockName)}});
 ok(st.n==='TENAGA NASIONAL BHD'&&st.s==='Utilities'&&st.h.ok,'Enter pilih saham; sektor Utilities diisi automatik');
 ok(!(await dd.isVisible()),'senarai ditutup selepas pilih');
 await si.fill(''); await si.type('7113',{delay:20}); await m.waitForTimeout(200); await dd.locator('button').first().click(); await m.waitForTimeout(200);
 ok(await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));return a.form.stockName==='TOP GLOVE CORPORATION BHD'&&a.fund.sector==='Healthcare'}),'ketik cadangan (cari ikut kod 7113) → Healthcare');
 await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));a.showAddModal=false;a.activeTab='settings'}); await m.waitForTimeout(400);
 await m.locator('input[x-model="ctForm.code"]').fill('1155'); await m.locator('input[x-model="ctForm.name"]').fill('Malayan Banking Bhd'); await m.locator('select[x-model="ctForm.sector"]').selectOption('Financial Services');
 await m.getByText('Simpan ke Senarai').click(); await m.waitForTimeout(400);
 ok(await m.evaluate(()=>{const a=Alpine.$data(document.querySelector('[x-data]'));return a.findCounter('1155')&&a.findCounter('1155').manual===1&&a.ctManual.length===1}),'Settings: tambah saham manual melalui UI');
 const card=m.locator('h3',{hasText:'Senarai Saham Bursa'}).locator('xpath=../..'); await card.screenshot({path:'shots/stock-list-settings.png'});
 const ovS=await m.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth); ok(ovS<=1,'Settings telefon: tiada skrol mendatar');
 const uniq=[...new Set(errs)]; ok(uniq.length===0,'tiada ralat JS/Alpine'); uniq.slice(0,15).forEach(e=>console.log('   ',e.slice(0,200)));
 await b.close(); console.log(fails?'GAGAL: '+fails:'SEMUA LULUS'); process.exitCode=fails?1:0;
})();
