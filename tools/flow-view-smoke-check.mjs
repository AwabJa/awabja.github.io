/**
 * Dependency-free DOM startup and view-navigation smoke test for FLOW.
 * Run: node tools/flow-view-smoke-check.mjs
 * This catches runtime event-registration errors missed by syntax-only tests.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const appSource=readFileSync(resolve(root,'Flow/app.js'),'utf8');
const pageSource=readFileSync(resolve(root,'Flow/index.html'),'utf8');

// Malformed array elements must activate recovery mode instead of crashing views.
const loadSnippet=appSource.slice(appSource.indexOf('const damagedKeys=[];'),appSource.indexOf('let projects=load('));
assert(loadSnippet.includes('validLoadedArray'), 'FLOW must validate saved array records');
function loadedRecords(key,raw) {
 const storage={getItem:requested=>requested===key?raw:null};
 const state=new Function('localStorage','KEY','PK','AK',loadSnippet+';return {load,damagedKeys};')(
  storage,'flow.tasks.v1','flow.projects.v1','flow.activity.v1');
 return {data:state.load(key,[]),damagedKeys:state.damagedKeys}
}
for(const [key,raw] of [
 ['flow.tasks.v1','[null]'],
 ['flow.tasks.v1','[{"id":"bad","title":"Broken","subtasks":{}}]'],
 ['flow.projects.v1','[null]'],
 ['flow.activity.v1','[null]']
]){
 const state=loadedRecords(key,raw);
 assert.deepEqual(state.data,[],'Unsafe saved records must not enter the renderer');
 assert.deepEqual(state.damagedKeys,[key],'Unsafe records must trigger read-only recovery mode')
}
assert.deepEqual(loadedRecords('flow.tasks.v1','[{"id":3,"title":"Old valid task"}]').damagedKeys,[],
 'Legacy task IDs may still be numeric');
assert.deepEqual(loadedRecords('flow.projects.v1','["Personal","Work"]').damagedKeys,[],
 'Normal projects must remain loadable');
console.log('FLOW STORAGE VALIDATION PASSED: corrupt records protected and legacy records retained');

class FakeElement {
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.dataset={};this.attrs={};
  this.style={};this.hidden=false;this.textContent='';this.className='';
  this.value='';this.checked=false;this.events={};this.classes=new Set();
  this.classList={
   toggle:(value,force)=>{const next=force===undefined?!this.classes.has(value):!!force;if(next)this.classes.add(value);else this.classes.delete(value);return next},
   add:value=>this.classes.add(value),
   remove:value=>this.classes.delete(value),
   contains:value=>this.classes.has(value)
  };
 }
 append(...elements){this.children.push(...elements)}
 replaceChildren(...elements){this.children=[...elements]}
 setAttribute(name,value){this.attrs[name]=String(value)}
 getAttribute(name){return this.attrs[name]??null}
 get firstChild(){return this.children[0]||null}
 get childElementCount(){return this.children.filter(x=>x instanceof FakeElement&&x.tagName!=='#text').length}
 addEventListener(name,callback){this.events[name]=callback}
 fire(name='click',event={}){const handler=this.events[name]||this['on'+name];if(typeof handler!=='function')throw Error(this.tagName+' has no '+name+' handler');handler({preventDefault(){},target:this,currentTarget:this,...event})}
 querySelector(selector){return this.children.find(child=>child instanceof FakeElement&&('.'+child.className===selector||'#'+child.attrs.id===selector))||null}
 after(){}
 reset(){}
 showModal(){this.open=true}
 close(){this.open=false}
 scrollIntoView(){}
 focus(){}
}
function simulate(editFrom='board'){
 const nodes=new Map();
 for(const [,id] of pageSource.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+id,new FakeElement());
 for(const selector of ['.lower','.toolbar','.tabs','.toolbar-right','.subheading'])nodes.set(selector,new FakeElement());
 nodes.get('#heading').append(new FakeElement('#text'));
 const form=nodes.get('#taskForm');
 form.elements={};
 for(const name of ['title','description','date','time','project','color','priority','repeat','done','subtasks','attachment'])form.elements[name]=new FakeElement('input');
 const dialogs=nodes.get('#taskDialog');dialogs.open=false;
 const modes=[...pageSource.matchAll(/data-mode="([^"]+)"/g)].map(([,mode])=>{const e=new FakeElement('button');e.dataset.mode=mode;return e});
 const views=[...pageSource.matchAll(/data-view="([^"]+)"/g)].map(([,view])=>{const e=new FakeElement('button');e.dataset.view=view;return e});
 const document={
  createElement:tag=>new FakeElement(tag),
  createTextNode:text=>{const e=new FakeElement('#text');e.textContent=text;return e},
  querySelector:selector=>nodes.get(selector)||null,
  querySelectorAll:selector=>selector==='[data-mode]'?modes:selector==='[data-view]'||selector==='.nav button'?views:selector==='.kanban-lane'?[]:[]
 };
 const store=new Map();
 const legacyTask=(id,date,done=false)=>({id,title:'Weekly review',description:'Review weekly goals',date,time:'10:00',project:'Personal',repeat:'weekly',color:'purple',priority:'medium',done,subtasks:[]});
 if(editFrom!=='fresh'){
 store.set('flow.projects.v1',JSON.stringify(['Team Project','Personal','Design']));
 store.set('flow.tasks.v1',JSON.stringify([
  {...legacyTask('series-original','2026-10-23'),subtasks:editFrom==='checklist'?[{title:'Research',done:false}]:editFrom==='duplicateChecklist'?[{title:'Review',done:false},{title:'Review',done:false}]:[]},
  legacyTask('series-copy-1','2026-10-30'),
  legacyTask('series-copy-2','2026-11-06'),
  legacyTask('series-history','2026-10-16',true)
 ]));
 }
 const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
 };
 let allowConfirmation=true,confirmationCount=0,alerts=[];
 const fakeWindow={
  matchMedia:()=>({matches:editFrom==='phone'||editFrom==='phoneCreate',addEventListener(){}}),
  addEventListener(){}
 };
 const boot=new Function('document','localStorage','crypto','setTimeout','requestAnimationFrame','cancelAnimationFrame','alert','confirm','prompt','window',appSource);
 boot(document,localStorage,{randomUUID:()=>String(Math.random())},()=>0,fn=>{fn();return 1},()=>{},message=>alerts.push(message),()=>{confirmationCount++;return allowConfirmation},()=>null,fakeWindow);
 const planner=nodes.get('#planner');
 const contains=cls=>planner.children.some(child=>child instanceof FakeElement&&child.className===cls);
 const allDescendants=(item)=>[item,...(item.children||[]).flatMap(allDescendants).filter(Boolean)];
 const select=mode=>{const button=modes.find(b=>b.dataset.mode===mode);assert(button,'Missing '+mode+' button');button.fire();assert(button.classList.contains('selected'),mode+' tab should be selected')};
 if(editFrom==='fresh'){
  assert.equal(localStorage.getItem('flow.projects.v1'),null,'Fresh visitors start with no stored projects');
  assert.equal(localStorage.getItem('flow.tasks.v1'),null,'Fresh visitors start with no stored tasks');
  assert.equal(nodes.get('#projectList').children.length,0,'Fresh project sidebar must be empty');
  assert.equal(nodes.get('#projectSummary').children.length,0,'Fresh projects summary must be empty');
  assert.equal(nodes.get('#projectCount').textContent,'0 projects','Fresh project count must start at zero');
  assert.equal(nodes.get('#totalTasks').textContent,0,'Fresh task count must start at zero');
  assert(contains('week-grid'),'The week calendar should remain usable without task data');
  nodes.get('#addTaskTop').fire();
  assert.equal(dialogs.open,true,'Fresh visitors can create a task without first creating a project');
  assert.equal(form.elements.project.value,'','No project should default to Inbox');
  assert.equal(nodes.get('#projectSelect').children.length,1,'Only Inbox should appear in an empty project selector');
  form.elements.title.value='My first task';
  form.elements.project.value='';
  form.elements.date.value='';
  form.elements.repeat.value='none';
  form.fire('submit');
  const savedTasks=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  assert.equal(savedTasks.length,1,'Saving the first task must create one record');
  assert.equal(savedTasks[0].project,'','The first task must be stored in Inbox');
  assert.equal(nodes.get('#crumb').textContent,'Inbox','The first unassigned task should open Inbox');
  nodes.get('#undoTask').fire();
  assert.deepEqual(JSON.parse(localStorage.getItem('flow.tasks.v1')),[],'Undo must return to a blank task list');
  nodes.get('#newProject').fire();
  assert.equal(nodes.get('#projectDialog').open,true,'A fresh visitor can create a project');
  nodes.get('#projectName').value='First project';
  nodes.get('#projectForm').fire('submit');
  assert.deepEqual(JSON.parse(localStorage.getItem('flow.projects.v1')),['First project'],
   'The first project must be saved without introducing sample projects');
  assert.deepEqual(JSON.parse(localStorage.getItem('flow.tasks.v1')),[],'Creating a project must not create demo tasks');
  console.log('FLOW FIRST VISIT PASSED: empty workspace, task creation, Undo and first project');
  return
 }
 if(editFrom==='phone'||editFrom==='phoneCreate'){
  assert(contains('week-grid'),'Phone Week should remain available');
  select('month');
  assert(contains('mobile-month'),'Phone Month must use a compact calendar');
  assert(!contains('month-grid'),'Phone Month must not render desktop cards');
  assert.equal(nodes.get('#mobileViewHint').textContent.includes('Select a date'),true,'Mobile hint must explain tap-to-select');
  const now=new Date(),delta=(2026-now.getFullYear())*12+9-now.getMonth();
  const move=nodes.get(delta<0?'#prevWeek':'#nextWeek');
  for(let i=0;i<Math.abs(delta);i++)move.fire();
  const getDay=date=>allDescendants(planner).find(el=>el.className?.startsWith('mobile-month-day')&&el.dataset.date===date);
  const agenda=()=>allDescendants(planner).find(el=>el.className==='mobile-month-agenda');
  const entries=()=>allDescendants(planner).filter(el=>el.className==='mobile-agenda-task'||el.className==='mobile-agenda-task done');
  assert.equal(allDescendants(planner).filter(el=>el.className?.startsWith('mobile-month-day')).length,42,'Compact Month must show 42 tappable dates');
  const target=getDay('2026-10-30');
  assert(target,'Weekly October 30 occurrence must have a date button');
  assert(target.getAttribute('aria-label').includes('1 task'),'Date accessible label should announce task count');
  const beforeDaySelection=localStorage.getItem('flow.tasks.v1');
  target.fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),beforeDaySelection,'Selecting a day must never mutate saved tasks');
  assert.equal(target.getAttribute('aria-pressed'),'true','Tapped day must be visibly and accessibly selected');
  assert.equal(entries().length,1,'Agenda must show only selected date tasks');
  assert(allDescendants(agenda()).some(el=>el.className==='mobile-agenda-task-title'&&el.textContent.includes('Weekly review')),'Agenda must show full task title');
  const editTask=allDescendants(planner).find(el=>el.className==='mobile-agenda-edit');
  assert(editTask,'Selected occurrence must remain editable');
  editTask.fire();
  assert.equal(nodes.get('#recurrenceChoice').open,true,'Mobile agenda must retain occurrence-versus-series editor');
  nodes.get('#closeRecurrenceChoice').fire();
  assert.equal(nodes.get('#recurrenceChoice').open,false);
  const addTask=allDescendants(planner).find(el=>el.className==='mobile-month-add');
  assert(addTask,'Selected date must have Add task');
  addTask.fire();
  assert.equal(form.elements.date.value,'2026-10-30','Adding a task from mobile agenda must prefill selected date');
  if(editFrom==='phoneCreate'){
   const previous=localStorage.getItem('flow.tasks.v1');
   form.elements.title.value='New selected-day task';form.elements.repeat.value='none';
   form.elements.project.value='Personal';
   form.fire('submit');
   const items=JSON.parse(localStorage.getItem('flow.tasks.v1'));
   assert.equal(items.length,5,'Calendar add should create exactly one record');
   assert.equal(items.find(t=>t.title==='New selected-day task')?.date,'2026-10-30','Created task should use selected day');
   assert(contains('mobile-month'),'Saving from phone Month must keep the compact calendar');
   assert.equal(allDescendants(planner).find(el=>el.className?.startsWith('mobile-month-day')&&el.getAttribute('aria-pressed')==='true').dataset.date,'2026-10-30','Created day remains selected');
   assert.equal(entries().length,2,'Created task should immediately appear in selected-day agenda');
   nodes.get('#undoTask').fire();
   assert.equal(localStorage.getItem('flow.tasks.v1'),previous,'Undo must reverse calendar-created tasks');
   assert(contains('mobile-month'),'Undo should keep mobile calendar visible');
   console.log('FLOW MOBILE CREATE SMOKE PASSED: saving on selected date preserves Month, agenda and Undo');
   return
  }
  nodes.get('#closeDialog').fire();
  assert.equal(dialogs.open,false);
  const complete=allDescendants(planner).find(el=>el.className==='mobile-agenda-complete');
  assert(complete,'Scheduled occurrence needs a Complete action');
  complete.fire();
  assert.equal(entries().length,1,'Completing should keep selected day in agenda');
  assert.equal(allDescendants(planner).filter(el=>el.className==='mobile-agenda-complete').length,0,'Completed occurrence must not still show Complete');
  assert(allDescendants(agenda()).some(el=>el.className==='mobile-agenda-task-meta'&&el.textContent.includes('Completed')),'Agenda should show completion state');
  assert.equal(allDescendants(planner).find(el=>el.className==='mobile-agenda-summary').textContent,'1 scheduled · 1 complete','Mobile count should refresh after completion');
  const november=getDay('2026-11-01');
  assert(november,'Outside-month day must still be selectable');
  november.fire();
  assert.equal(nodes.get('#weekRange').textContent.includes('November'),true,'Tapping next-month date should navigate to that month');
  const selected=allDescendants(planner).find(el=>el.className?.startsWith('mobile-month-day')&&el.getAttribute('aria-pressed')==='true');
  assert.equal(selected.dataset.date,'2026-11-01','Outside date must remain selected after month navigation');
  assert.equal(entries().length,0,'Empty selected day should have no task cards');
  assert(allDescendants(agenda()).some(el=>el.className==='mobile-agenda-empty'),'Agenda should explain empty dates');
  select('week');
  assert(contains('week-grid'),'Phone Week view must remain intact');
  select('month');
  assert(contains('mobile-month'),'Switching back to Month must retain the compact phone layout');
  assert.equal(allDescendants(planner).find(el=>el.className?.startsWith('mobile-month-day')&&el.getAttribute('aria-pressed')==='true').dataset.date,'2026-11-01','Selected day should persist when switching views in the same month');
  console.log('FLOW MOBILE MONTH SMOKE PASSED: compact grid, selection, add, completion, adjacent month and Week');
  return
 }
 assert(contains('week-grid'),'Initial Week view must render');
 assert(nodes.get('#mobileViewHint').textContent.includes('Tap a task'),'Week mode should explain touch-compatible editing');
 assert.equal(modes.find(b=>b.dataset.mode==='week').getAttribute('aria-pressed'),'true','Selected view should expose accessibility state');
 select('month');assert(contains('month-grid'),'Month view must render');
 assert(nodes.get('#mobileViewHint').textContent.includes('Swipe sideways'),'Desktop-like Month view should retain tablet horizontal scroll guidance');
 assert.equal(modes.find(b=>b.dataset.mode==='month').getAttribute('aria-pressed'),'true','Month selected state should be announced');
 assert(nodes.get('#overviewPeriod').textContent,'Month view must set overview period');
 assert(nodes.get('#overviewContext').textContent.includes('Individual scheduled dates'),'Overview must explain its occurrence-based counts');
 const projectRows=allDescendants(nodes.get('#projectSummary')).filter(el=>el.className==='summary-row');
 assert.equal(projectRows.length,3,'Projects panel lists existing projects');
 const personal=projectRows.find(row=>row.children.some(c=>c.textContent==='Personal'));
 assert(personal,'Personal project must be listed');
 assert(personal.children.some(c=>c.textContent==='1 active'),'Legacy recurring instances must count as one active project task');
 select('board');assert(contains('kanban'),'Board view must render');
 assert(nodes.get('#mobileViewHint').textContent.includes('Use Start'),'Board should explain tap alternatives to drag');
 assert.equal(modes.find(b=>b.dataset.mode==='board').getAttribute('aria-pressed'),'true');
 assert.equal(allDescendants(planner).filter(el=>el.className==='kanban-lane').length,3,'Board needs three workflow lanes');
 select('list');assert(contains('table-view'),'Table view must render');
 assert(nodes.get('#mobileViewHint').textContent.includes('Swipe sideways'),'Table should explain horizontal access to columns');
 const filters=allDescendants(planner).filter(el=>el.className==='table-select');
 assert.equal(filters.length,2,'Table needs filtering and sorting controls');
 const filter=filters[0];filter.value='history';filter.fire('change');
 assert.equal(allDescendants(planner).filter(el=>el.tagName==='tr').length,2,'History filter should show the completed task plus header');
 const newFilter=allDescendants(planner).find(el=>el.className==='table-select');newFilter.value='active';newFilter.fire('change');
 assert.equal(allDescendants(planner).filter(el=>el.tagName==='tr').length,2,'Active filter should show one master task');
 select('week');assert(contains('week-grid'),'Week view must render again');
 for(const target of ['today','all','activity','inbox','board']){
  const button=views.find(b=>b.dataset.view===target);
  assert(button,'Missing '+target+' navigation');
  button.fire();
  assert(button.classList.contains('active'),target+' navigation should activate');
 }
if(editFrom==='checklist'){
  const source=()=>JSON.parse(localStorage.getItem('flow.tasks.v1')).find(t=>t.id==='series-original');
  const original=localStorage.getItem('flow.tasks.v1');
  views.find(b=>b.dataset.view==='board').fire();select('board');
  const card=allDescendants(planner).find(e=>e.className?.startsWith('task ')&&typeof e.onclick==='function');
  card.fire();
  assert.equal(nodes.get('#checklistPanel').hidden,false,'Checklist should be shown for a task with subtasks');
  const input=allDescendants(nodes.get('#checklistItems')).find(e=>e.tagName==='input');
  assert(input,'Checklist should show a checkbox');
  input.checked=true;input.fire('change');
  assert.equal(source().subtasks[0].done,false,'Checkbox must not silently persist before Save');
  nodes.get('#closeDialog').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),original,'Canceling editor must preserve existing checklist state');
  const reopen=allDescendants(planner).find(e=>e.className?.startsWith('task ')&&typeof e.onclick==='function');
  reopen.fire();
  const checkbox=allDescendants(nodes.get('#checklistItems')).find(e=>e.tagName==='input');
  assert.equal(checkbox.checked,false,'Draft checkmarks must reset after cancel');
  checkbox.checked=true;checkbox.fire('change');
  form.fire('submit');
  assert.equal(source().subtasks[0].done,true,'Saving task must commit the checklist draft');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),original,'Undo must restore original checklist and task history');
  console.log('FLOW CHECKLIST SMOKE PASSED: changes staged until Save, Cancel safe, Undo restores');
  return
}
if(editFrom==='duplicateChecklist'){
  const original=localStorage.getItem('flow.tasks.v1');
  views.find(b=>b.dataset.view==='board').fire();select('board');
  const card=allDescendants(planner).find(e=>e.className?.startsWith('task ')&&typeof e.onclick==='function');
  card.fire();
  const boxes=allDescendants(nodes.get('#checklistItems')).filter(e=>e.tagName==='input');
  assert.equal(boxes.length,2,'Both same-named subtasks should render');
  boxes[1].checked=true;boxes[1].fire('change');
  form.fire('submit');
  const saved=JSON.parse(localStorage.getItem('flow.tasks.v1')).find(t=>t.id==='series-original');
  assert.deepEqual(saved.subtasks,[{title:'Review',done:false},{title:'Review',done:true}],'Saving a second same-named subtask must not mark the first');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),original,'Undo restores both checkboxes separately');
  console.log('FLOW CHECKLIST IDENTITY PASSED: duplicate names do not merge checkbox states');
  return
}
if(editFrom==='unscheduled'){
  const original=localStorage.getItem('flow.tasks.v1');
  const create=nodes.get('#addTaskTop');create.fire();
  assert.equal(dialogs.open,true);
  form.elements.title.value='Unscheduled project task';
  form.elements.project.value='Personal';
  form.elements.date.value='';
  form.elements.repeat.value='weekly';
  form.fire('submit');
  assert.equal(localStorage.getItem('flow.tasks.v1'),original,'Recurring task without start date must not save');
  assert(alerts.some(message=>String(message).includes('need a start date')),'Clear repeat date requirement is shown');
  assert.equal(dialogs.open,true,'Date validation should leave the editor open');
  form.elements.repeat.value='none';
  form.fire('submit');
  const items=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  assert.equal(items.length,5,'Undated project task must be saveable without a recurrence');
  const undated=items.find(t=>t.title==='Unscheduled project task');
  assert(undated&&undated.date===''&&undated.repeat==='none','Unscheduled task must remain undated and nonrecurring');
  assert(contains('kanban'),'Undated project tasks must appear on Board');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),original,'Undo must restore state after undated create');
  console.log('FLOW UNSCHEDULED SMOKE PASSED: project backlog allowed; recurrence requires start date');
  return
}
if(editFrom==='desktopDateAdd'){
  const now=new Date(),monthOffset=(2026-now.getFullYear())*12+9-now.getMonth();
  const button=views.find(b=>b.dataset.view==='calendar');button.fire();
  const step=nodes.get(monthOffset<0?'#prevWeek':'#nextWeek');
  for(let i=0;i<Math.abs(monthOffset);i++)step.fire();
  const cell=allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(c=>c.className==='month-date'&&c.textContent==='30'));
  assert(cell,'October 30 must exist in desktop calendar');
  const add=cell.children.find(e=>e.className==='month-date');add.fire();
  assert.equal(form.elements.date.value,'2026-10-30');
  form.elements.title.value='Desktop calendar-created task';
  form.elements.repeat.value='none';
  form.elements.project.value='Personal';
  form.fire('submit');
  assert(contains('month-grid'),'Desktop Month must stay visible after date-based create');
  assert.equal(nodes.get('#crumb').textContent,'Calendar');
  const day=allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(c=>c.className==='month-date'&&c.textContent==='30'));
  assert(day.children.some(e=>e.className?.startsWith('month-task ')),'Saved task must appear on desktop Month');
  console.log('FLOW DESKTOP DATE CREATE PASSED: adding in Month stays on Month');
  return
}
if(editFrom==='calendar'){
  assert(pageSource.includes('data-view="calendar"'),'Calendar shortcut must be in navigation');
  assert(/data-view="inbox"><svg class="nav-icon"/.test(pageSource),'Inbox should use a vector icon');
  assert.equal((pageSource.match(/<svg class="nav-icon"/g)||[]).length,6,'All six destinations must use matching vector icons');
  const button=key=>views.find(b=>b.dataset.view===key);
  button('inbox').fire();
  assert.equal(nodes.get('.toolbar').hidden,true,'Inbox may hide task view tabs');
  assert.equal(button('inbox').getAttribute('aria-current'),'page');
  button('calendar').fire();
  assert.equal(nodes.get('.toolbar').hidden,false,'Calendar shortcut must restore calendar view controls');
  assert(contains('month-grid'),'Calendar shortcut must open Month');
  assert.equal(button('calendar').getAttribute('aria-current'),'page','Calendar must show active sidebar state');
  assert.equal(button('board').getAttribute('aria-current'),'false','Projects must not remain selected in Calendar');
  assert.equal(nodes.get('#heading').firstChild.textContent,'Calendar ','Calendar heading must be unambiguous');
  assert.equal(planner.getAttribute('aria-label'),'Monthly task calendar');
  select('week');
  assert(contains('week-grid'),'Calendar must support Week');
  assert.equal(button('calendar').getAttribute('aria-current'),'page');
  assert.equal(planner.getAttribute('aria-label'),'Weekly task calendar');
  button('board').fire();
  assert(contains('kanban'),'Projects shortcut must open Board');
  assert.equal(button('board').getAttribute('aria-current'),'page');
  assert.equal(button('calendar').getAttribute('aria-current'),'false');
  assert.equal(nodes.get('#heading').firstChild.textContent,'Projects ');
  const before=localStorage.getItem('flow.tasks.v1');
  button('today').fire();button('calendar').fire();button('board').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),before,'Navigation must never change task data');
  console.log('FLOW VIEW SMOKE CHECK PASSED: Inbox → Calendar Month → Week → Projects across navigation');
  return
}
if(editFrom==='undo'){
  const initial=localStorage.getItem('flow.tasks.v1');
  const projects=views.find(b=>b.dataset.view==='board');projects.fire();select('board');
  const complete=allDescendants(planner).find(el=>el.className==='kanban-toggle'&&el.textContent.includes('Complete'));
  assert(complete,'Board needs an actionable Complete button');
  complete.fire();
  assert(localStorage.getItem('flow.tasks.v1')!==initial,'Completion must change saved task data');
  assert.equal(nodes.get('#undoBar').hidden,false,'Undo should appear after completion');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),initial,'Undo must restore all original tasks exactly');
  assert.equal(nodes.get('#undoBar').hidden,true,'Undo must dismiss after restoring');
  select('week');
  const now=new Date(),thisWeek=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7);
  const targetWeek=new Date(2026,9,19),diff=Math.round((targetWeek-thisWeek)/604800000);
  const nav=nodes.get(diff<0?'#prevWeek':'#nextWeek');
  for(let i=0;i<Math.abs(diff);i++)nav.fire();
  const dayBodies=allDescendants(planner).filter(el=>el.className==='day-body');
  const draggable=allDescendants(dayBodies[4]).find(el=>el.className?.startsWith('task ')&&el.draggable);
  assert(draggable,'Weekly repeating task must support calendar drag');
  const dragValues=new Map(),dataTransfer={
   types:['text/plain'],setData:(key,value)=>dragValues.set(key,value),
   getData:key=>dragValues.get(key)||'',effectAllowed:'move'
  };
  draggable.ondragstart({dataTransfer});
  dayBodies[5].ondrop({preventDefault(){},dataTransfer});
  assert(localStorage.getItem('flow.tasks.v1')!==initial,'Calendar drag must persist its moved date');
  assert.equal(nodes.get('#undoBar').hidden,false,'Calendar moves must offer Undo');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),initial,'Undo must fully restore repeating calendar drag');
  console.log('FLOW VIEW SMOKE CHECK PASSED: Undo restores completions and calendar moves');
  return
 }
 if(editFrom==='projects'){
  const originalTasks=localStorage.getItem('flow.tasks.v1');
  const originalProjects=localStorage.getItem('flow.projects.v1')||JSON.stringify(['Team Project','Personal','Design']);
  const manager=()=>allDescendants(nodes.get('#projectList')).find(el=>el.getAttribute('aria-label')==='Manage project Personal');
  assert(manager(),'Each project needs a Manage button');
  manager().fire();
  assert.equal(nodes.get('#projectDialog').open,true,'Project manager must open');
  nodes.get('#projectName').value='Home';
  nodes.get('#projectForm').fire('submit');
  let tasks=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  assert.equal(tasks.length,4,'Renaming must preserve all task records');
  assert(tasks.every(t=>t.project==='Home'),'Renaming must update completed and scheduled task assignments');
  assert(JSON.parse(localStorage.getItem('flow.projects.v1')).includes('Home'),'New project name should be listed');
  select('month');
  const now=new Date(),difference=(2026-now.getFullYear())*12+9-now.getMonth();
  const navigate=nodes.get(difference<0?'#prevWeek':'#nextWeek');
  for(let i=0;i<Math.abs(difference);i++)navigate.fire();
  const oct30=allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='30'));
  assert.equal(oct30.children.filter(e=>e.className?.startsWith('month-task ')).length,1,'Renaming project must retain one weekly recurrence on Oct 30');
  assert.equal(nodes.get('#undoBar').hidden,false,'Project rename must be reversible');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),originalTasks,'Undo must restore all project task assignments');
  assert.equal(localStorage.getItem('flow.projects.v1'),originalProjects,'Undo must restore original project names');

  manager().fire();
  nodes.get('#removeProject').fire();
  tasks=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  assert.equal(tasks.length,4,'Removing a project must preserve task records');
  assert(tasks.every(t=>t.project===''),'Removal must move every task and history entry to Inbox');
  assert(!JSON.parse(localStorage.getItem('flow.projects.v1')).includes('Personal'),'Project must disappear');
  assert.equal(nodes.get('#crumb').textContent,'Inbox','Removal should navigate to Inbox');
  const inboxCount=allDescendants(nodes.get('#projectList')).length;
  assert(inboxCount>0,'Other projects must remain');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.tasks.v1'),originalTasks,'Undo must restore tasks after removing project');
  assert.equal(localStorage.getItem('flow.projects.v1'),originalProjects,'Undo must restore project names after removal');

  nodes.get('#newProject').fire();
  assert.equal(nodes.get('#projectDialog').open,true);
  nodes.get('#projectName').value='Sprint Alpha';nodes.get('#projectForm').fire('submit');
  assert(JSON.parse(localStorage.getItem('flow.projects.v1')).includes('Sprint Alpha'),'Creating project must persist it');
  assert.equal(localStorage.getItem('flow.tasks.v1'),originalTasks,'Creating a project must not modify task records');
  nodes.get('#undoTask').fire();
  assert.equal(localStorage.getItem('flow.projects.v1'),originalProjects,'Undo must reverse new project creation');
  console.log('FLOW VIEW SMOKE CHECK PASSED: safe project rename, removal, creation and Undo');
  return
 }
 if(editFrom==='search'){
  select('week');
  const search=nodes.get('#search');search.value='weekly';
  search.fire('input',{target:search});
  assert(contains('week-grid'),'Search must preserve Week calendar layout');
  select('month');
  assert(contains('month-grid'),'Search must preserve Month calendar layout');
  search.value='not-a-real-task';search.fire('input',{target:search});
  assert(contains('month-grid'),'Empty search results must preserve Month layout');
  assert.equal(allDescendants(planner).filter(e=>e.className?.startsWith('month-task ')).length,0,
   'Nonmatching search must hide calendar task cards');
  assert.equal(nodes.get('#totalTasks').textContent,0,'Search-filtered calendar should have zero overview scheduled tasks');
  assert.equal(nodes.get('#doneTasks').textContent,0,'Search-filtered calendar should have zero completed tasks');
  assert(nodes.get('#overviewContext').textContent.includes('matching search'),'Overview should disclose that search filtering is applied');
  console.log('FLOW VIEW SMOKE CHECK PASSED: filtering preserves selected calendar view');
  return
 }
 if(editFrom==='delete'){
  const projects=views.find(b=>b.dataset.view==='board');projects.fire();select('board');
  const card=allDescendants(planner).find(el=>el.className?.startsWith('task ')&&typeof el.onclick==='function');
  assert(card,'Repeating schedule card must be editable');card.fire();
  assert.equal(nodes.get('#deleteTask').textContent,'Remove schedule');
  nodes.get('#deleteTask').fire();
  const records=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  assert.equal(records.length,4,'Removing a repeating schedule must not destroy old records');
  assert.equal(records.filter(t=>t.recurrenceArchived).length,3,'All pending records must be archived');
  assert.equal(records.filter(t=>t.done).length,1,'Completed history must be preserved');
  assert.equal(allDescendants(planner).filter(e=>e.className?.startsWith('task ')).length,0,'Removed schedule must leave active Board');
  nodes.get('#undoTask').fire();
  assert.equal(JSON.parse(localStorage.getItem('flow.tasks.v1')).filter(t=>t.recurrenceArchived).length,0,'Undo must restore schedule');
  console.log('FLOW VIEW SMOKE CHECK PASSED: removing schedule preserves history, hides future work and supports Undo');
  return
 }
 // Open the saved recurring task from Board, then stop repetition using the real form handler.
 const projects=views.find(b=>b.dataset.view==='board');projects.fire();select(editFrom==='occurrence'||editFrom==='reset'?'month':editFrom);
 if(editFrom==='month'||editFrom==='occurrence'||editFrom==='reset'){
  const now=new Date(),difference=(2026-now.getFullYear())*12+10-now.getMonth();
  const navigate=nodes.get(difference<0?'#prevWeek':'#nextWeek');
  for(let i=0;i<Math.abs(difference);i++)navigate.fire()
 }
 const selectedDay=editFrom!=='board'?allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='6')):null;
 const card=editFrom!=='board'?selectedDay?.children.find(el=>el.className?.startsWith('month-task ')):
  allDescendants(planner).find(el=>el instanceof FakeElement&&el.className.startsWith('task ')&&typeof el.onclick==='function');
 assert(card,'A calendar or Board card must be editable');card.fire();
 if(editFrom==='occurrence'||editFrom==='reset'){
  assert.equal(dialogs.open,false,'Task editor should not open without scope choice');
  assert.equal(nodes.get('#recurrenceChoice').open,true,'Scope chooser must open first');
  nodes.get('#editOneOccurrence').fire();
  assert.equal(dialogs.open,true,'Per-date task editor must open');
  assert.equal(nodes.get('#repeatField').hidden,true,'Occurrence edit must hide repeat settings');
  assert.equal(form.elements.date.value,'2026-11-06','Occurrence date must reflect selected Friday');
  form.elements.date.value='2026-11-05';form.elements.time.value='11:30';
  form.fire('submit');
  const customized=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  const override=customized.find(t=>t.occurrenceOverride);
  assert(override,'Customized occurrence must be persisted');
  assert.equal(override.date,'2026-11-05');
  assert.equal(override.occurrenceDate,'2026-11-06');
  assert.equal(customized.find(t=>t.id==='series-original').date,'2026-10-23','Series anchor must remain unchanged');
  const allDesc=allDescendants(planner);
  const movedDay=allDesc.find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='5'));
  assert(movedDay.children.some(el=>el.className?.startsWith('month-task ')),'New occurrence must appear on chosen date');
  const originalDay=allDesc.find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='6'));
  assert(!originalDay.children.some(el=>el.className?.startsWith('month-task ')),'Original occurrence must not duplicate');
  if(editFrom==='reset'){
   const edit=allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='5')).children.find(el=>el.className?.startsWith('month-task '));
   assert(edit,'Customized date must be editable');
   edit.fire();
   nodes.get('#editOneOccurrence').fire();
   assert.equal(nodes.get('#deleteTask').textContent,'Reset occurrence','Customized occurrence needs clear reset action');
   nodes.get('#deleteTask').fire();
   const after=JSON.parse(localStorage.getItem('flow.tasks.v1'));
   assert(!after.some(t=>t.occurrenceOverride),'Reset must remove the override');
   const friday=allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='6'));
   assert(friday.children.some(el=>el.className?.startsWith('month-task ')),'Reset must restore normal recurrence date');
   nodes.get('#undoTask').fire();
   assert(JSON.parse(localStorage.getItem('flow.tasks.v1')).some(t=>t.occurrenceOverride),'Reset action must be undoable');
   console.log('FLOW VIEW SMOKE CHECK PASSED: resetting customized date and Undo restore original override');
   return
  }
  assert.equal(nodes.get('#undoBar').hidden,false,'Editing one occurrence should offer Undo');
  nodes.get('#undoTask').fire();
  const restored=JSON.parse(localStorage.getItem('flow.tasks.v1'));
  assert(!restored.some(t=>t.occurrenceOverride),'Undo must remove one-off exception without deleting the original series');
  const restoredDay=allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='6'));
  assert(restoredDay.children.some(el=>el.className?.startsWith('month-task ')),'Undo should restore the original Friday occurrence');
  console.log('FLOW VIEW SMOKE CHECK PASSED: per-occurrence edits are isolated, reversible and preserve the series');
  return
 }
 if(editFrom==='month'){
  assert.equal(nodes.get('#recurrenceChoice').open,true,'Series edit requires explicit scope');
  nodes.get('#editRepeatingSchedule').fire();
 }
 assert.equal(form.elements.repeat.value,'weekly','Editing should expose the current repeat schedule');
 form.elements.repeat.value='none';
 const beforeCancel=localStorage.getItem('flow.tasks.v1');
 allowConfirmation=false;form.fire('submit');
 assert.equal(localStorage.getItem('flow.tasks.v1'),beforeCancel,'Declining series change must keep saved tasks unchanged');
 assert.equal(dialogs.open,true,'Task editor must remain open when series edit is cancelled');
 allowConfirmation=true;form.fire('submit');
 assert(confirmationCount>=2,'Series-wide edits must request confirmation');
 const saved=JSON.parse(localStorage.getItem('flow.tasks.v1'));
 const active=saved.filter(t=>!t.done&&!t.recurrenceArchived);
 assert.equal(active.length,1,'Stopping recurrence must leave exactly one active task');
 assert.equal(active[0].repeat,'none','Original task must no longer repeat');
 assert(Array.isArray(active[0].stoppedRecurrence?.legacyIds),'Stopped series must keep exact legacy ID marker');
 if(editFrom==='month')assert.equal(active[0].date,'2026-11-06','Stopping a November occurrence must retain that occurrence date');
 assert.equal(saved.filter(t=>t.recurrenceArchived).length,2,'Old saved upcoming copies must be retired, not deleted');
 assert.equal(saved.filter(t=>t.done).length,1,'Completed history must be retained');
 const recordsBefore=JSON.stringify(saved);
 select('month');
 const nextButton=nodes.get('#nextWeek');
 for(let i=0;i<5;i++)nextButton.fire();
 const futureTasks=allDescendants(planner).filter(el=>el instanceof FakeElement&&el.className.startsWith('month-task '));
 assert.equal(futureTasks.length,0,'The stopped schedule must not recur in later months');
 assert.equal(nodes.get('#totalTasks').textContent,0,'Workspace Overview must clear scheduled total in empty future months');
 assert.equal(nodes.get('#doneTasks').textContent,0,'Workspace Overview must clear completed total in empty future months');
 assert.equal(nodes.get('#activeTasks').textContent,0,'Workspace Overview must clear remaining total in empty future months');
 assert.equal(nodes.get('#progressBar').style.width,'0%','Workspace Overview progress bar should reset to zero');
 assert(nodes.get('#progressText').textContent.includes('No scheduled tasks'),'Workspace Overview needs explicit empty-period feedback');
 assert(nodes.get('#overviewPeriod').textContent,'Workspace Overview must show the selected month');
 assert.equal(localStorage.getItem('flow.tasks.v1'),recordsBefore,'Navigating calendars must not change saved tasks');
 console.log('FLOW VIEW SMOKE CHECK PASSED: '+editFrom+' edit, navigation, archived copies and future months');
}
simulate('fresh');
simulate('board');
simulate('month');
simulate('occurrence');
simulate('undo');
simulate('projects');
simulate('search');
simulate('delete');
simulate('reset');
simulate('calendar');
simulate('phone');
simulate('phoneCreate');
simulate('checklist');
simulate('duplicateChecklist');
simulate('unscheduled');
simulate('desktopDateAdd');
