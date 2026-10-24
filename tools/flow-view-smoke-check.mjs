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
 store.set('flow.tasks.v1',JSON.stringify([
  legacyTask('series-original','2026-10-23'),
  legacyTask('series-copy-1','2026-10-30'),
  legacyTask('series-copy-2','2026-11-06'),
  legacyTask('series-history','2026-10-16',true)
 ]));
 const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
 };
 const boot=new Function('document','localStorage','crypto','setTimeout','requestAnimationFrame','alert','confirm','prompt',appSource);
 boot(document,localStorage,{randomUUID:()=>String(Math.random())},()=>0,fn=>{fn();return 1},()=>{},()=>true,()=>null);
 const planner=nodes.get('#planner');
 const contains=cls=>planner.children.some(child=>child instanceof FakeElement&&child.className===cls);
 const allDescendants=(item)=>[item,...(item.children||[]).flatMap(allDescendants).filter(Boolean)];
 const select=mode=>{const button=modes.find(b=>b.dataset.mode===mode);assert(button,'Missing '+mode+' button');button.fire();assert(button.classList.contains('selected'),mode+' tab should be selected')};
 assert(contains('week-grid'),'Initial Week view must render');
 select('month');assert(contains('month-grid'),'Month view must render');
 assert(nodes.get('#overviewPeriod').textContent,'Month view must set overview period');
 assert(nodes.get('#overviewContext').textContent.includes('Individual scheduled dates'),'Overview must explain its occurrence-based counts');
 const projectRows=allDescendants(nodes.get('#projectSummary')).filter(el=>el.className==='summary-row');
 assert.equal(projectRows.length,3,'Projects panel lists existing projects');
 const personal=projectRows.find(row=>row.children.some(c=>c.textContent==='Personal'));
 assert(personal,'Personal project must be listed');
 assert(personal.children.some(c=>c.textContent==='1 active'),'Legacy recurring instances must count as one active project task');
 select('board');assert(contains('kanban'),'Board view must render');
 assert.equal(allDescendants(planner).filter(el=>el.className==='kanban-lane').length,3,'Board needs three workflow lanes');
 select('list');assert(contains('table-view'),'Table view must render');
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
 // Open the saved recurring task from Board, then stop repetition using the real form handler.
 const projects=views.find(b=>b.dataset.view==='board');projects.fire();select(editFrom==='occurrence'?'month':editFrom);
 if(editFrom==='month'||editFrom==='occurrence'){
  const now=new Date(),difference=(2026-now.getFullYear())*12+10-now.getMonth();
  const navigate=nodes.get(difference<0?'#prevWeek':'#nextWeek');
  for(let i=0;i<Math.abs(difference);i++)navigate.fire()
 }
 const selectedDay=editFrom!=='board'?allDescendants(planner).find(el=>el.className==='month-cell'&&el.children.some(child=>child.className==='month-date'&&child.textContent==='6')):null;
 const card=editFrom!=='board'?selectedDay?.children.find(el=>el.className?.startsWith('month-task ')):
  allDescendants(planner).find(el=>el instanceof FakeElement&&el.className.startsWith('task ')&&typeof el.onclick==='function');
 assert(card,'A calendar or Board card must be editable');card.fire();
 if(editFrom==='occurrence'){
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
  console.log('FLOW VIEW SMOKE CHECK PASSED: per-occurrence edit changes one date and preserves series');
  return
 }
 if(editFrom==='month'){
  assert.equal(nodes.get('#recurrenceChoice').open,true,'Series edit requires explicit scope');
  nodes.get('#editRepeatingSchedule').fire();
 }
 assert.equal(form.elements.repeat.value,'weekly','Editing should expose the current repeat schedule');
 form.elements.repeat.value='none';
 form.fire('submit');
 const saved=JSON.parse(localStorage.getItem('flow.tasks.v1'));
 const active=saved.filter(t=>!t.done&&!t.recurrenceArchived);
 assert.equal(active.length,1,'Stopping recurrence must leave exactly one active task');
 assert.equal(active[0].repeat,'none','Original task must no longer repeat');
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
simulate('board');
simulate('month');
simulate('occurrence');
