/**
 * FLOW export-only backup behavior checks.
 * Run: node tools/flow-backup-check.mjs
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const script=readFileSync(resolve(root,'Flow/enhancements.js'),'utf8');
let onClick=null,download=null,blob=null,alerts=[];
const button={addEventListener:(type,fn)=>{assert.equal(type,'click');onClick=fn}};
const status={textContent:''};
const elements={
 exportData:button,backupStatus:status
};
const doc={
 getElementById:id=>elements[id]||null,
 createElement:tag=>{
  assert.equal(tag,'a');
  const a={href:'',download:'',click(){download={href:this.href,filename:this.download}}};
  return a
 }
};
const items=new Map([
 ['flow.tasks.v1',JSON.stringify([{id:'t',title:'Finish proposal',repeat:'none',done:false}])],
 ['flow.projects.v1',JSON.stringify(['Work'])],
 ['flow.activity.v1','[]']
]);
const storage={
 getItem:k=>items.has(k)?items.get(k):null,
 setItem:(k,v)=>items.set(k,String(v))
};
const fakeURL={
 createObjectURL:arg=>{blob=arg;return 'blob:test-flow-export'},
 revokeObjectURL:()=>{}
};
new Function('document','localStorage','URL','Blob','setTimeout','alert',script)(
 doc,storage,fakeURL,Blob,()=>0,msg=>alerts.push(msg));
assert.match(status.textContent,/Export a backup regularly/,'Default local data warning');
assert.equal(typeof onClick,'function','Export button must have a handler');
onClick();
assert.deepEqual(download,{href:'blob:test-flow-export',filename:'flow-workspace.json'});
assert(blob instanceof Blob,'Must create downloadable JSON Blob');
const data=JSON.parse(await blob.text());
assert.equal(data.app,'FLOW');
assert.deepEqual(data.tasks,[{id:'t',title:'Finish proposal',repeat:'none',done:false}]);
assert.deepEqual(data.projects,['Work']);
assert.deepEqual(data.activity,[]);
assert(items.has('flow.lastBackup.v1'),'Backup timestamp should be stored');
assert.match(status.textContent,/Last backup export requested/);
const stamp=items.get('flow.lastBackup.v1');
items.set('flow.tasks.v1','malformed JSON');
download=null;
onClick();
assert.equal(download,null,'Damaged data must not be exported as a normal backup');
assert.equal(items.get('flow.lastBackup.v1'),stamp,'Failed export must not update backup timestamp');
assert.equal(alerts.length,1,'Failed export must show an error');
assert(!/FileReader|readAsText|type=["']file/.test(script),'Backup must remain export-only');
console.log('FLOW BACKUP CHECK PASSED: JSON export, local warning, timestamp and corrupt data guard');
