const fs=require('fs'); const vm=require('vm');
class Range{constructor(sh,r,c,nr,nc){Object.assign(this,{sh,r,c,nr,nc})}
 getValues(){const o=[];for(let i=0;i<this.nr;i++){const row=[];for(let j=0;j<this.nc;j++)row.push((this.sh.d[this.r-1+i]||[])[this.c-1+j]??'');o.push(row)}return o}
 setValues(v){v.forEach((row,i)=>row.forEach((x,j)=>{const R=this.r-1+i;this.sh.d[R]=this.sh.d[R]||[];this.sh.d[R][this.c-1+j]=x}));return this}
 clearContent(){for(let i=0;i<this.nr;i++)for(let j=0;j<this.nc;j++){const R=this.r-1+i;if(this.sh.d[R])this.sh.d[R][this.c-1+j]=''}return this}
 getValue(){return this.getValues()[0][0]} setValue(v){return this.setValues([[v]])} setNumberFormat(){return this} setFontWeight(){return this} setBackground(){return this} setFontColor(){return this}}
class Sheet{constructor(n){this.n=n;this.d=[]}
 getRange(r,c,nr=1,nc=1){return new Range(this,r,c,nr,nc)}
 getLastRow(){let l=0;this.d.forEach((r,i)=>{if(r&&r.some(x=>x!==''&&x!==undefined))l=i+1});return l}
 getMaxRows(){return Math.max(this.getLastRow()+50,100)}
 deleteRow(r){this.d.splice(r-1,1)} setFrozenRows(){} getMaxColumns(){return this.maxCols||26} insertColumnsAfter(c,n){this.maxCols=(this.maxCols||26)+n} insertRowsAfter(){}}
const sheets={};
const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=new Sheet(n),getSheets:()=>Object.values(sheets),deleteSheet(){}};
const out=o=>({_:o,setMimeType(){return this}});
const ctx={SpreadsheetApp:{getActiveSpreadsheet:()=>ss,openById:()=>ss},
 ContentService:{createTextOutput:t=>({t,setMimeType(){return this}}),MimeType:{JSON:1}},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Utilities:{formatDate:(d,tz,f)=>d.toISOString().slice(0,10),base64Decode:b=>Array.from(Buffer.from(b,'base64')),newBlob:(bytes,mime,name)=>({bytes,mime,name})},
 DriveApp:(()=>{const files={};let n=0;const folders={};
  const mkFolder=name=>({name,createFile:b=>{const id='FILE'+(++n);files[id]={id,blob:b,trashed:false,sharing:null,getId(){return id},setSharing(a,p){this.sharing=[a,p]},setTrashed(t){this.trashed=t}};return files[id]}});
  return {_files:files,_folders:folders,Access:{ANYONE_WITH_LINK:'ANYONE_WITH_LINK'},Permission:{VIEW:'VIEW'},
   getFoldersByName:name=>{const f=folders[name];let used=false;return {hasNext:()=>!!f&&!used,next:()=>{used=true;return f}}},
   createFolder:name=>folders[name]=mkFolder(name),
   getFileById:id=>{if(!files[id])throw new Error('no file');return files[id]}}})(),console};
vm.createContext(ctx); vm.runInContext(fs.readFileSync('Code.gs','utf8'),ctx);
const post=(action,payload)=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({action,payload})}}).t);
const get=(a)=>JSON.parse(ctx.doGet({parameter:{action:a}}).t);
module.exports={Sheet,sheets,ctx,post,get};
