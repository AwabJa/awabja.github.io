/**
 * Behavioral regression tests for FLOW recurrence, schedule cancellation,
 * task statuses and completion history. Run: node tools/flow-recurrence-check.mjs
 * No browser storage writes or external packages.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'Flow/app.js'),'utf8');
const start=source.indexOf('const nextRepeat=');
const end=source.indexOf('const priorityLabel=',start);
assert(start>=0&&end>start,'FLOW recurrence helpers must remain extractable');
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
const create=new Function(prelude+helpers+";return {load:a=>tasks=a,get:()=>tasks,activeTasks,historyTasks,workflowTasks,calendarOccurrences,calendarDayTasks,rescheduleCalendarTask,completeTask,completeOccurrence,stopRepeating,setTaskStatus,recurrenceKey,nextRepeat};");
const task=(id,date='2026-10-23',repeat='weekly',done=false)=>({id,title:'Plan the week',date,time:'10:00',project:'Personal',repeat,done,color:'purple',subtasks:[]});
const visible=(app,date)=>app.calendarDayTasks(app.calendarOccurrences(app.get(),'2026-10-01','2027-06-30'),date);
let assertions=0;
const run=(name,fn)=>{fn();assertions++;console.log('PASS '+name)};
run('A repeating schedule appears once in Board and Table',()=>{
 const app=create();app.load([task('a'),task('b','2026-10-30'),task('c','2026-11-06')]);
 assert.equal(app.activeTasks(app.get()).length,1);
 assert.equal(visible(app,'2026-10-30').length,1)
});
run('Completed recurring tasks can repeat more than a dozen times',()=>{
 const app=create();app.load([task('a')]);
 for(let i=0;i<16;i++){
  const active=app.activeTasks(app.get());
  assert.equal(active.length,1);app.completeTask(active[0],true)
 }
 assert.equal(app.historyTasks(app.get()).length,16);
 assert.equal(app.activeTasks(app.get()).length,1);
 assert.equal(app.get().filter(x=>!x.done).length,1)
});
run('Each completed date stays in the calendar and the next remains open',()=>{
 const app=create();app.load([task('a')]);
 app.completeOccurrence(visible(app,'2026-10-23')[0]);
 assert.deepEqual(visible(app,'2026-10-23').map(t=>t.done),[true]);
 assert.deepEqual(visible(app,'2026-10-30').map(t=>t.done),[false])
});
run('Future completion does not jump the current active schedule',()=>{
 const app=create();app.load([task('a')]);app.completeOccurrence(visible(app,'2026-11-06')[0]);
 assert.equal(app.activeTasks(app.get())[0].date,'2026-10-23');
 assert.deepEqual(visible(app,'2026-11-06').map(t=>t.done),[true])
});
run('Future date already completed is skipped when previous dates finish',()=>{
 const app=create();app.load([task('a')]);
 app.completeOccurrence(visible(app,'2026-10-30')[0]);
 app.completeOccurrence(visible(app,'2026-10-23')[0]);
 assert.equal(app.activeTasks(app.get())[0].date,'2026-11-06')
});
run('Dragging one recurring occurrence does not move future weeks',()=>{
 const app=create(),t=task('a');app.load([t]);app.rescheduleCalendarTask(t,'2026-10-30','2026-10-29');
 assert.equal(visible(app,'2026-10-29').length,1);
 assert.equal(visible(app,'2026-10-30').length,0);
 assert.equal(visible(app,'2026-11-06').length,1)
});
run('Moved and completed recurrence persists without restoring the old date',()=>{
 const app=create(),t=task('a');app.load([t]);app.rescheduleCalendarTask(t,'2026-10-30','2026-10-29');
 app.completeOccurrence(visible(app,'2026-10-29')[0]);
 const restored=create();restored.load(JSON.parse(JSON.stringify(app.get())));
 assert.deepEqual(visible(restored,'2026-10-29').map(t=>t.done),[true]);
 assert.equal(visible(restored,'2026-10-30').length,0)
});
run('Reopening a completed recurrence does not create a second calendar card',()=>{
 const app=create();app.load([task('a')]);app.completeOccurrence(visible(app,'2026-10-23')[0]);
 const historical=app.historyTasks(app.get())[0];
 app.setTaskStatus(historical,'progress');
 assert.deepEqual(visible(app,'2026-10-23').map(t=>t.done),[false]);
 assert.equal(historical.status,'progress');
 app.completeTask(historical,true);
 assert.deepEqual(visible(app,'2026-10-23').map(t=>t.done),[true])
});
run('Stopping recurring schedule archives saved future copies without deletion',()=>{
 const app=create(),one=task('a'),two=task('b','2026-10-30'),three=task('c','2026-11-06');
 const completed=task('history','2026-10-16','weekly',true);
 app.load([one,two,three,completed]);
 const previous=app.recurrenceKey(one),members=app.get().filter(t=>app.recurrenceKey(t)===previous);
 for(const member of members)if(!member.seriesId)member.seriesId=one.id;
 app.stopRepeating(one);one.repeat='none';one.recurrenceMoves=[];
 assert.equal(visible(app,'2026-10-23').length,1);
 assert.equal(visible(app,'2026-10-30').length,0);
 assert.equal(visible(app,'2026-11-06').length,0);
 assert.deepEqual(visible(app,'2026-10-16').map(t=>t.done),[true]);
 assert.equal(app.get().length,4);
 assert.equal(app.get().filter(t=>t.recurrenceArchived).length,2)
});
run('Non-recurring tasks never project into future months',()=>{
 const app=create();app.load([task('a','2026-10-23','none')]);
 assert.equal(visible(app,'2026-10-23').length,1);
 assert.equal(visible(app,'2026-11-20').length,0);
 assert.equal(visible(app,'2027-02-23').length,0)
});
run('Separate series with identical titles stay distinct by seriesId',()=>{
 const app=create();app.load([{...task('a'),seriesId:'first'},{...task('b'),seriesId:'second'}]);
 assert.equal(app.activeTasks(app.get()).length,2);
 assert.equal(visible(app,'2026-10-30').length,2)
});
run('Board progress status never affects occurrence dates',()=>{
 const app=create(),t=task('a');app.load([t]);app.setTaskStatus(t,'progress');
 assert.equal(t.status,'progress');assert.equal(t.date,'2026-10-23');
 app.setTaskStatus(t,'done');
 assert.equal(app.historyTasks(app.get()).length,1);
 assert.equal(app.activeTasks(app.get())[0].status,'todo')
});
run('Monthly tasks on the 31st recover after short months',()=>{
 const app=create();app.load([{...task('jan','2027-01-31','monthly'),repeatAnchor:31}]);
 assert.equal(visible(app,'2027-02-28').length,1);
 assert.equal(visible(app,'2027-03-31').length,1);
 assert.equal(visible(app,'2027-04-30').length,1)
});
run('Ordinary tasks complete only once',()=>{
 const app=create(),t=task('a','2026-10-23','none');app.load([t]);app.completeTask(t,true);
 assert.equal(app.get().length,1);assert.equal(app.get()[0].done,true)
});
run('Storage keys and editor preservation remain unchanged',()=>{
 new Function(source);
 for(const key of ['flow.tasks.v1','flow.projects.v1','flow.activity.v1'])assert(source.includes(key));
 assert(source.includes('...(old||{})')&&source.includes('stopRepeating(old)'));
 assert(source.includes('if(damagedKeys.length){if(!storageWarned)'))
});
console.log('FLOW RECURRENCE CHECKS PASSED: '+assertions+' scenarios');
