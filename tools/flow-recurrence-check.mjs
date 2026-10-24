/**
 * Regression checks for FLOW recurrence across Week, Month, Board and Table.
 * Run: node tools/flow-recurrence-check.mjs
 * No external packages, DOM, or browser-storage writes.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'Flow/app.js'),'utf8');
const start=source.indexOf('const nextRepeat=');
const end=source.indexOf('const priorityLabel=',start);
assert(start>=0&&end>start,'FLOW recurrence helpers must remain accessible for tests');
const helpers=source.slice(start,end);
const prelude=[
  "const pad=n=>String(n).padStart(2,'0');",
  "const localDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());",
  "const parseDate=s=>new Date(s+'T12:00:00');",
  "const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};",
  "let tasks=[];",
  "const log=()=>{};",
  "const save=()=>true;",
  "const render=()=>{};"
].join('\n');
const create=new Function(prelude+helpers+";return {load:a=>tasks=a,get:()=>tasks,workflowTasks,calendarOccurrences,calendarDayTasks,rescheduleCalendarTask,completeTask,completeOccurrence};");
const task=(id,date='2026-10-23',repeat='weekly',done=false)=>({id,title:'Plan the week',description:'Weekly planning',date,time:'22:00',project:'Personal',repeat,priority:'medium',done,subtasks:[]});
const visible=(h,date)=>h.calendarDayTasks(h.calendarOccurrences(h.get(),'2026-10-01','2026-11-30'),date);
const run=(name,fn)=>{fn();console.log('PASS '+name)};
run('Only one active task for a recurring series in Board and Table',()=>{
  const h=create();h.load([task('a','2026-10-23'),task('b','2026-10-30')]);
  assert.equal(h.workflowTasks(h.get()).filter(t=>!t.done).length,1);
  assert.equal(visible(h,'2026-10-30').length,1)
});
run('Recurring tasks can be completed repeatedly without a fixed limit',()=>{
  const h=create();h.load([task('a')]);
  for(let i=0;i<12;i++){
    const active=h.workflowTasks(h.get()).find(t=>!t.done);
    assert(active,'next active recurring task must exist');
    h.completeTask(active,true)
  }
  assert.equal(h.get().filter(t=>t.done).length,12);
  assert.equal(h.workflowTasks(h.get()).filter(t=>!t.done).length,1)
});
run('Finishing next occurrence preserves calendar history',()=>{
  const h=create(),t=task('a');h.load([t]);h.completeTask(t,true);
  assert.deepEqual(visible(h,'2026-10-23').map(t=>t.done),[true]);
  assert.deepEqual(visible(h,'2026-10-30').map(t=>t.done),[false])
});
run('Completing a future preview does not skip the earlier active task',()=>{
  const h=create();h.load([task('a')]);
  h.completeOccurrence(visible(h,'2026-11-06')[0]);
  assert.equal(h.get().find(t=>!t.done).date,'2026-10-23');
  assert.deepEqual(visible(h,'2026-11-06').map(t=>t.done),[true]);
  assert.deepEqual(visible(h,'2026-11-13').map(t=>t.done),[false])
});
run('Finishing an earlier date skips a date already finished in advance',()=>{
  const h=create(),t=task('a');h.load([t]);
  h.completeOccurrence(visible(h,'2026-10-30')[0]);
  h.completeTask(t,true);
  assert.deepEqual(h.get().filter(t=>!t.done).map(t=>t.date),['2026-11-06'])
});
run('Moving and finishing one occurrence keeps the weekly pattern',()=>{
  const h=create(),t=task('a');h.load([t]);
  h.rescheduleCalendarTask(t,'2026-10-30','2026-10-29');
  h.completeOccurrence(visible(h,'2026-10-29')[0]);
  assert.deepEqual(visible(h,'2026-10-29').map(t=>t.done),[true]);
  assert.equal(visible(h,'2026-10-30').length,0);
  assert.deepEqual(visible(h,'2026-11-06').map(t=>t.done),[false])
});
run('Moved date survives the same JSON serialization as browser storage',()=>{
  const h=create(),t=task('a');h.load([t]);
  h.rescheduleCalendarTask(t,'2026-10-30','2026-10-29');
  const reloaded=create();reloaded.load(JSON.parse(JSON.stringify(h.get())));
  assert.equal(visible(reloaded,'2026-10-29').length,1);
  assert.equal(visible(reloaded,'2026-10-30').length,0)
});
run('Independent repeat series with the same title are not merged',()=>{
  const h=create();h.load([{...task('a'),seriesId:'series-a'},{...task('b'),seriesId:'series-b'}]);
  assert.equal(h.workflowTasks(h.get()).length,2);
  assert.equal(visible(h,'2026-10-30').length,2)
});
run('Ordinary tasks remain single instances',()=>{
  const h=create(),t=task('a','2026-10-23','none');h.load([t]);h.completeTask(t,true);
  assert.equal(h.get().length,1)
});
run('Existing FLOW storage and edit preservation remain intact',()=>{
  new Function(source);
  assert(source.includes("flow.tasks.v1")&&source.includes("flow.projects.v1")&&source.includes("flow.activity.v1"));
  assert(source.includes('...(old||{})')&&source.includes('recurrenceMoves'))
});
console.log('FLOW RECURRENCE CHECKS PASSED: 10 scenarios');
