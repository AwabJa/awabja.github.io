/**
 * Deterministic performance/regression coverage of projected recurrence workload.
 * Run: node tools/flow-performance-check.mjs
 * No DOM, network, plugins, or browser data access.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'Flow/app.js'),'utf8');
const start=source.indexOf('const nextRepeat=');
const end=source.indexOf('const priorityLabel=',start);
assert(start>0&&end>start,'FLOW task helpers must remain extractable');
const prelude=[
 "const pad=n=>String(n).padStart(2,'0');",
 "const localDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());",
 "const parseDate=s=>new Date(s+'T12:00:00');",
 "const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};",
 "let tasks=[];",
 "const log=()=>{};const save=()=>true;const render=()=>{};const captureUndo=()=>{};"
].join('\n');
const create=new Function(prelude+source.slice(start,end)+";return {load:v=>tasks=v,activeTasks,calendarOccurrences,overviewSnapshot,nextScheduledDates};");
const app=create(),tasks=[];
for(let i=0;i<500;i++){
 const id='repeat-'+i,repeat=i%4===0?'daily':i%4===1?'monthly':'weekly';
 const base={id,seriesId:id,title:'Work item '+i,description:'Synthetic task',
  project:i%2?'Work':'Personal',repeat,date:'2026-09-'+String(i%28+1).padStart(2,'0'),
  done:false,priority:i%3===0?'high':'medium',subtasks:[]};
 tasks.push(base);
 for(let j=0;j<3;j++){
  tasks.push({...base,id:id+'-done-'+j,date:'2026-08-'+String((i+j)%28+1).padStart(2,'0'),
    occurrenceDate:'2026-08-'+String((i+j)%28+1).padStart(2,'0'),done:true});
 }
}
for(let i=0;i<500;i++)tasks.push({id:'once-'+i,title:'One time '+i,date:'2026-10-'+String(i%28+1).padStart(2,'0'),
 project:'Work',repeat:'none',done:i%3===0,subtasks:[]});
app.load(tasks);
const before=JSON.stringify(tasks);
function sample(fn){
 const start=performance.now(),value=fn();
 return {value,ms:Math.round((performance.now()-start)*100)/100};
}
const board=sample(()=>app.activeTasks(tasks));
const calendar=sample(()=>app.calendarOccurrences(tasks,'2026-10-01','2026-11-11'));
const overview=sample(()=>app.overviewSnapshot(tasks,'2026-10-01','2026-10-31'));
const next=sample(()=>app.nextScheduledDates(tasks,'2026-10-24'));
assert.equal(tasks.length,2500,'Fixture size');
assert.equal(board.value.length,833,'One master per recurring series plus open one-offs');
assert(calendar.value.length>2000,'Projected occurrences must include many dates');
assert(overview.value.total>1500,'Monthly overview must count projected dates');
assert.equal(overview.value.days.length,31);
assert.equal(next.value.size,500,'Next due date must exist for all 500 active recurring series');
assert.equal(JSON.stringify(tasks),before,'Derived views must never mutate saved records');
const timings={active:board.ms,calendar:calendar.ms,overview:overview.ms,next:next.ms};
const total=Object.values(timings).reduce((a,b)=>a+b,0);
console.log('FLOW PERFORMANCE RESULTS '+JSON.stringify({savedTasks:tasks.length,projectedDates:calendar.value.length,boardRows:board.value.length,ms:timings,totalMs:Math.round(total*100)/100}));
assert(total<8000,'Synthetic workload exceeded generous 8s regression threshold');
console.log('FLOW PERFORMANCE CHECK PASSED: 2500 records, derived views stable and no task mutation');
