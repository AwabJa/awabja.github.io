(()=>{'use strict';const KEY='flow.tasks.v1',PK='flow.projects.v1',AK='flow.activity.v1';const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const pad=n=>String(n).padStart(2,'0');const localDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());const parseDate=s=>new Date(s+'T12:00:00');const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};const monday=d=>addDays(d,-(d.getDay()+6)%7);const currentToday=()=>localDate(new Date());const today=currentToday();const seedProjects=['Team Project','Personal','Design'];const damagedKeys=[];const load=(key,fallback)=>{let raw;try{raw=localStorage.getItem(key);if(raw===null)return fallback;const v=JSON.parse(raw);if(Array.isArray(v))return v;damagedKeys.push(key);return fallback}catch{damagedKeys.push(key);return fallback}};let projects=load(PK,seedProjects),activity=load(AK,[]),tasks=load(KEY,[{id:'demo-1',title:'Plan the week',description:'Decide what matters most.',date:today,time:'10:00',project:'Personal',color:'yellow',done:false},{id:'demo-2',title:'Design review',description:'Refine the dashboard layout.',date:localDate(addDays(new Date(),1)),time:'13:30',project:'Team Project',color:'purple',done:false},{id:'demo-3',title:'Ship a small win',description:'Finish one meaningful task.',date:localDate(addDays(new Date(),2)),time:'15:00',project:'Design',color:'pink',done:false}]);let view='board',mode='week',offset=0,filterProject='',query='',editing=null,editingOccurrenceDate=null,editingOccurrence=null,calendarChoiceTask=null,tableFilter='active',tableSort='date';const log=(action,title)=>{activity.unshift({id:Date.now()+'-'+Math.random(),action,title,at:new Date().toISOString()});activity=activity.slice(0,120)};let storageWarned=false;const save=()=>{if(damagedKeys.length){if(!storageWarned){storageWarned=true;alert('FLOW detected damaged saved data. Saving is disabled to protect the original records. Download the recovery backup before making changes.')}return false}let oldTasks,oldProjects,oldActivity;try{oldTasks=localStorage.getItem(KEY);oldProjects=localStorage.getItem(PK);oldActivity=localStorage.getItem(AK);localStorage.setItem(KEY,JSON.stringify(tasks));localStorage.setItem(PK,JSON.stringify(projects));localStorage.setItem(AK,JSON.stringify(activity));return true}catch{try{for(const [key,value] of [[KEY,oldTasks],[PK,oldProjects],[AK,oldActivity]]){if(value===null)localStorage.removeItem(key);else if(value!==undefined)localStorage.setItem(key,value)}}catch{}if(!storageWarned){storageWarned=true;alert('FLOW could not save changes to this browser. Your previous saved workspace was retained where possible. Export a backup before continuing.')}return false}};const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};const shown=()=>tasks.filter(t=>(view!=='board'||!filterProject||t.project===filterProject)&&(view!=='inbox'||!t.project)&&(view!=='today'||t.date===currentToday())&&(!query||(t.title+' '+t.description+' '+(t.project||'')).toLowerCase().includes(query)));const weekStart=()=>addDays(monday(new Date()),offset*7);const nextRepeat=(date,repeat,anchorDay)=>{if(!date||!repeat||repeat==='none')return '';const d=parseDate(date);if(repeat==='daily')d.setDate(d.getDate()+1);else if(repeat==='weekly')d.setDate(d.getDate()+7);else if(repeat==='monthly'){const day=Number.isInteger(anchorDay)&&anchorDay>=1&&anchorDay<=31?anchorDay:d.getDate();d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}else return '';return localDate(d)};const isRepeating=t=>['daily','weekly','monthly'].includes(t?.repeat);
const isArchived=t=>!!t.recurrenceArchived;
const recurrenceKey=t=>t.seriesId||[t.title,t.project||'',t.repeat||'none',t.time||''].join('\u001f');
const recurrenceAnchor=t=>{
 if(Number.isInteger(t.repeatAnchor)&&t.repeatAnchor>=1&&t.repeatAnchor<=31)return t.repeatAnchor;
 const history=tasks.filter(x=>!isArchived(x)&&isRepeating(x)&&recurrenceKey(x)===recurrenceKey(t)&&x.date)
  .sort((a,b)=>(a.occurrenceDate||a.date).localeCompare(b.occurrenceDate||b.date));
 return parseDate((history[0]?.occurrenceDate||history[0]?.date)||t.date).getDate()
};
// Legacy versions stored upcoming instances as independent records. A stopped
// one-off keeps its original series ID; use its original signature to suppress
// uncoupled legacy copies without modifying or deleting the saved records.
const recurrenceSignature=t=>[t.title||'',t.project||'',t.time||''].join('\u001f');
const stoppedSeries=()=>tasks.filter(t=>!isRepeating(t)&&!isArchived(t)&&(t.seriesId||t.stoppedRecurrence));
const stoppedMatches=(candidate,stop)=>{
 if(!isRepeating(candidate)||candidate.id===stop.id)return false;
 const marker=stop.stoppedRecurrence;
 if(candidate.seriesId&&stop.seriesId&&candidate.seriesId===stop.seriesId)return true;
 if(candidate.seriesId)return false; // Distinct named series must stay distinct.
 if(Array.isArray(marker?.legacyIds))return marker.legacyIds.includes(candidate.id);
 // Historical stop markers lacked IDs: use the legacy signature for those only.
 return recurrenceSignature(candidate)===(marker?.signature||recurrenceSignature(stop))
  &&(!marker?.repeat||candidate.repeat===marker.repeat);
};
const stoppedCopy=t=>isRepeating(t)&&stoppedSeries().some(stop=>stoppedMatches(t,stop));
const invisibleCalendarTask=t=>isArchived(t)||!!t.calendarHidden||stoppedCopy(t);
const newTaskId=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
const displayDate=t=>{const move=(Array.isArray(t.recurrenceMoves)?t.recurrenceMoves:[]).find(m=>m.from===t.date);return move?.to||t.date};
const activeTasks=items=>{
 const pending=new Map(),ordinary=[];
 for(const t of items){
  if(isArchived(t)||stoppedCopy(t)||t.done)continue;
  if(!isRepeating(t)||t.occurrenceOverride){ordinary.push(t);continue}
  const key=recurrenceKey(t),prior=pending.get(key);
  const due=displayDate(t),priorDue=prior?displayDate(prior):'9999';
  if(!prior||due<priorDue||(due===priorDue&&t.occurrenceOverride&&!prior.occurrenceOverride))pending.set(key,t);
 }
 return [...ordinary,...pending.values()];
};
const historyTasks=items=>items.filter(t=>!isArchived(t)&&t.done);
const workflowTasks=items=>[...activeTasks(items),...historyTasks(items)];
const calendarOccurrences=(items,first,last)=>{
 const available=items.filter(t=>!invisibleCalendarTask(t)),masters=new Map(),moves=new Map();
 for(const t of available){
  if(!t.date||!isRepeating(t))continue;
  const key=recurrenceKey(t);
  if(Array.isArray(t.recurrenceMoves))for(const m of t.recurrenceMoves){
   if(m&&/^\d{4}-\d{2}-\d{2}$/.test(m.from||'')&&/^\d{4}-\d{2}-\d{2}$/.test(m.to||'')){
    if(!moves.has(key))moves.set(key,new Map());
    moves.get(key).set(m.from,m.to);
   }
  }
  if(t.done||t.occurrenceOverride)continue;
  const current=masters.get(key);
  if(!current||t.date<current.date)masters.set(key,t);
 }
 const result=available.filter(t=>t.date&&t.date>=first&&t.date<=last&&(!isRepeating(t)||t.done||t.occurrenceOverride));
 const finished=new Set(available.filter(t=>isRepeating(t)&&(t.done||t.occurrenceOverride)).map(t=>recurrenceKey(t)+'\u001f'+(t.occurrenceDate||t.date)));
 const scheduled=new Set();
 for(const [key,source] of masters){
  const changes=moves.get(key)||new Map();
  const add=(original,target)=>{
   const signature=key+'\u001f'+original;
   if(target<first||target>last||finished.has(signature)||scheduled.has(signature))return;
   scheduled.add(signature);
   result.push({...source,date:target,occurrenceDate:original,virtualSource:source,movedOccurrence:original!==target,done:false,subtasks:(source.subtasks||[]).map(x=>typeof x==='string'?x:{...x,done:false})});
  };
  let date=source.date;
  if(source.repeat==='daily'||source.repeat==='weekly'){
   const step=source.repeat==='daily'?1:7;
   const distance=Math.floor((parseDate(first)-parseDate(date))/86400000);
   if(distance>step)date=localDate(addDays(parseDate(date),Math.max(0,Math.floor((distance-1)/step))*step));
  }
  for(let i=0;i<2400&&date<=last;i++){
   add(date,changes.get(date)||date);
   const next=nextRepeat(date,source.repeat,recurrenceAnchor(source));
   if(!next||next<=date)break;
   date=next;
  }
  for(const [original,target] of changes)if(original>=source.date&&target>=first&&target<=last)add(original,target);
 }
 return result;
};
const calendarDayTasks=(items,key)=>{
 const seen=new Set();
 return items.filter(t=>t.date===key).sort((a,b)=>Number(b.done)-Number(a.done)).filter(t=>{
  if(!isRepeating(t))return true;
  const identity=recurrenceKey(t)+'\u001f'+(t.occurrenceDate||t.date);
  if(seen.has(identity))return false;
  seen.add(identity);return true
 });
};
const overviewSnapshot=(items,from,to)=>{
 const occurrences=calendarOccurrences(items,from,to);
 const days=[],byWeekday=Array(7).fill(0);
 for(let day=parseDate(from),n=0;localDate(day)<=to&&n<42;day=addDays(day,1),n++){
  const date=localDate(day),visible=calendarDayTasks(occurrences,date);
  const done=visible.filter(t=>t.done).length;
  days.push({date,total:visible.length,done,remaining:visible.length-done});
  byWeekday[(day.getDay()+6)%7]+=visible.length;
 }
 const total=days.reduce((sum,d)=>sum+d.total,0),done=days.reduce((sum,d)=>sum+d.done,0);
 return {total,done,remaining:total-done,days,byWeekday};
};
const seriesMembers=task=>tasks.filter(t=>isRepeating(t)&&recurrenceKey(t)===recurrenceKey(task));
const archiveOtherPending=source=>{
 for(const t of seriesMembers(source)){
  if(t!==source&&!t.done&&!t.occurrenceOverride)t.recurrenceArchived=true;
 }
};
const rescheduleCalendarTask=(task,original,to)=>{
 if(!task||!original)return;
 const source=task.virtualSource||task;
 if(isRepeating(source)&&!source.occurrenceOverride){
  const key=recurrenceKey(source);
  let changed=false;
  for(const t of tasks){
   if(recurrenceKey(t)!==key||!Array.isArray(t.recurrenceMoves))continue;
   const before=t.recurrenceMoves.length;
   t.recurrenceMoves=t.recurrenceMoves.filter(m=>m.from!==original);
   if(t.recurrenceMoves.length!==before)changed=true;
  }
  if(to!==original){
   source.recurrenceMoves=[...(source.recurrenceMoves||[]),{from:original,to}];
   changed=true;
  }
  if(!changed)return;
 }else{
  if(source.date===to)return;
  source.date=to;
 }
 log('Rescheduled',source.title);save();render();
};
const nextPendingRepeat=(date,repeat,series,anchorDay)=>{
 let next=nextRepeat(date,repeat,anchorDay);
 for(let i=0;i<2400&&next;i++){
  if(!tasks.some(t=>!isArchived(t)&&t.done&&isRepeating(t)&&recurrenceKey(t)===series&&(t.occurrenceDate||t.date)===next))return next;
  next=nextRepeat(next,repeat,anchorDay);
 }
 return next;
};
const finishOneOff=(task,done)=>{
 if(!task||!!task.done===!!done)return false;
 task.done=!!done;
 task.status=done?'done':'todo';
 task.completedAt=done?new Date().toISOString():'';
 if(!done&&task.isOccurrenceHistory)task.occurrenceOverride=true;
 log(done?'Completed':'Reopened',task.title);return true;
};
const completeOccurrence=t=>{
 if(!t||t.done)return;
 const source=t.virtualSource||t;
 if(!isRepeating(source)||source.occurrenceOverride){
  if(finishOneOff(source,true)){save();render()}
  return
 }
 const key=recurrenceKey(source),original=t.occurrenceDate||t.date;
 if(tasks.some(x=>!isArchived(x)&&x.done&&isRepeating(x)&&recurrenceKey(x)===key&&(x.occurrenceDate||x.date)===original))return;
 const moved=(Array.isArray(source.recurrenceMoves)?source.recurrenceMoves:[]).find(m=>m.from===original)?.to;
 const calendarDate=t.virtualSource?t.date:(moved||source.date);
 const history={...source,id:newTaskId(),date:calendarDate,occurrenceDate:original,done:true,status:'done',
  isOccurrenceHistory:true,occurrenceOverride:false,completedAt:new Date().toISOString(),recurrenceMoves:[],
  subtasks:(source.subtasks||[]).map(x=>typeof x==='string'?{title:x,done:false}:{...x})};
 tasks.push(history);
 const active=activeTasks(tasks).find(x=>isRepeating(x)&&!x.occurrenceOverride&&recurrenceKey(x)===key);
 if(active&&active.date===original){
  archiveOtherPending(active);
  const next=nextPendingRepeat(original,active.repeat,key,recurrenceAnchor(active));
  if(next)active.date=next;
  active.status='todo';
  active.subtasks=(active.subtasks||[]).map(x=>typeof x==='string'?{title:x,done:false}:{...x,done:false});
 }
 log('Completed recurring occurrence',source.title);save();render();
};
const completeTask=(t,done)=>{
 if(!t)return;
 if(done&&isRepeating(t)&&!t.done&&!t.occurrenceOverride){completeOccurrence(t);return}
 if(finishOneOff(t,done)){save();render()}
};
const ensureSeriesId=source=>{
 if(!isRepeating(source))return source?.seriesId||source?.id;
 const key=recurrenceKey(source),stableId=source.seriesId||source.id;
 for(const t of tasks)if(isRepeating(t)&&recurrenceKey(t)===key&&!t.seriesId)t.seriesId=stableId;
 return stableId
};
const stopRepeating=(source)=>{
 if(!source||!isRepeating(source)||source.isOccurrenceHistory)return;
 const oldSeries=recurrenceKey(source),stableId=source.seriesId||source.id;
 const signature=recurrenceSignature(source),legacyIds=tasks.filter(t=>t!==source&&!t.seriesId&&isRepeating(t)&&recurrenceSignature(t)===signature&&t.repeat===source.repeat).map(t=>t.id);
 const marker={seriesId:stableId,signature,repeat:source.repeat,legacyIds};
 for(const t of tasks){
  if(!isRepeating(t))continue;
  const sameSeries=recurrenceKey(t)===oldSeries||(!t.seriesId&&recurrenceSignature(t)===signature&&t.repeat===source.repeat);
  if(!sameSeries)continue;
  if(!t.seriesId)t.seriesId=stableId;
  if(t!==source){
   if(t.done)t.calendarHidden=true;
   else t.recurrenceArchived=true;
  }
 }
 source.seriesId=stableId;
 source.stoppedRecurrence=marker;
};
const taskStatus=t=>t.done?'done':t.status==='progress'?'progress':'todo';
const setTaskStatus=(t,status)=>{
 if(!t)return;
 if(status==='done'){completeTask(t,true);return}
 const wasDone=!!t.done;
 if(wasDone){t.done=false;t.completedAt='';if(t.isOccurrenceHistory)t.occurrenceOverride=true}
 if(t.status===status&&!wasDone)return;
 t.status=status;log(status==='progress'?'Started':'Moved to To Do',t.title);save();render()
};
const recentlyCompleted=items=>{
 const cutoff=Date.now()-14*86400000;
 return historyTasks(items).filter(t=>t.completedAt&&Number.isFinite(Date.parse(t.completedAt))&&Date.parse(t.completedAt)>=cutoff)
  .sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||'')).slice(0,12)
};
const calendarEditor=t=>{
 if(!t||!isRepeating(t)){openTask(t?.virtualSource||t);return}
 calendarChoiceTask=t;
 $('#recurrenceChoiceTitle').textContent=t.title;
 $('#recurrenceChoiceDate').textContent=dateText(t.date)+(t.time?' · '+formatTime(t.time):'');
 $('#recurrenceChoice').showModal()
};
const closeRecurrenceChoice=()=>{$('#recurrenceChoice').close();calendarChoiceTask=null};

const priorityLabel=t=>t.priority&&t.priority!=='none'?' · '+t.priority.toUpperCase():'';const timeFormatKey='flow.timeFormat.v1';let timeFormat='12';try{timeFormat=localStorage.getItem(timeFormatKey)==='24'?'24':'12'}catch{}const formatTime=value=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||''))return value||'';if(timeFormat==='24')return value;const [hours,minutes]=value.split(':').map(Number);return (hours%12||12)+':'+pad(minutes)+(hours>=12?' PM':' AM')};const dateText=s=>s?parseDate(s).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Unscheduled';function renderSidebar(){const list=$('#projectList');list.replaceChildren();projects.forEach(p=>{const b=el('button',filterProject===p?'active':'');b.append(el('span','project-dot'),document.createTextNode(p));b.onclick=()=>{filterProject=filterProject===p?'':p;view='board';mode='board';render()};list.append(b)});$$('.nav button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view==='inbox'){let count=b.querySelector('.inbox-count');if(!count){count=el('span','inbox-count');b.append(count)}const n=tasks.filter(t=>!t.project).length;count.textContent=String(n);count.hidden=n===0;count.setAttribute('aria-label',n+' unorganized tasks')}})}function renderPlanner(){const host=$('#planner');host.replaceChildren();const baseList=view==='today'?tasks.filter(t=>!query||(t.title+' '+(t.description||'')+' '+(t.project||'')).toLowerCase().includes(query)):shown();const list=view==='today'?calendarOccurrences(baseList,currentToday(),currentToday()).filter(t=>t.date===currentToday()):(view==='board'||view==='all')&&(mode==='week'||mode==='month')&&!query?calendarOccurrences(baseList,mode==='month'?localDate(monday(new Date(new Date().getFullYear(),new Date().getMonth()+offset,1))):localDate(weekStart()),mode==='month'?localDate(addDays(monday(new Date(new Date().getFullYear(),new Date().getMonth()+offset,1)),41)):localDate(addDays(weekStart(),6))):workflowTasks(baseList);if(view==='inbox'){const capture=el('form','quick-capture');const input=el('input','quick-capture-input');input.type='text';input.maxLength=100;input.required=true;input.placeholder='What do you need to remember?';input.setAttribute('aria-label','Quick capture a task');const add=el('button','quick-capture-add','＋ Capture');add.type='submit';capture.append(input,add);capture.onsubmit=e=>{e.preventDefault();const title=input.value.trim();if(!title)return;tasks.unshift({id:(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString()),title,description:'',date:'',time:'',project:'',color:'purple',done:false,subtasks:[],attachment:''});log('Captured',title);save();render();const next=$('.quick-capture-input');if(next)next.focus()};host.append(capture);const help=el('p','capture-help','Capture now, organize later. Assign a project when you are ready.');host.append(help)}const fullViews=view==='board'||view==='all';$('.lower').hidden=view!=='board';$('#addTaskTop').hidden=view==='inbox'||view==='activity';$('.toolbar').hidden=!fullViews;$('.tabs').hidden=!fullViews;$('.toolbar-right').hidden=!fullViews||(mode!=='week'&&mode!=='month');const start=weekStart();const end=addDays(start,6);const monthDate=new Date(new Date().getFullYear(),new Date().getMonth()+offset,1);$('#weekRange').textContent=mode==='month'?monthDate.toLocaleDateString(undefined,{month:'long',year:'numeric'}):dateText(localDate(start))+' – '+dateText(localDate(end));$('#dateLabel').textContent=new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});$('#crumb').textContent=view==='today'?'Today':view==='all'?'All Tasks':view==='activity'?'Activity':view==='inbox'?'Inbox':'Project Board';$('.subheading').textContent=view==='inbox'?'A place for thoughts and tasks that need organizing.':view==='today'?'Focus on what matters today.':view==='all'?'Every task, one clear view.':view==='activity'?'Your recent workspace changes.':'Plan with clarity. Make room for what matters.';$('#addTaskTop').textContent='＋ Add task';$('#heading').firstChild.textContent=(filterProject|| (view==='today'?'Today':view==='all'?'All Tasks':view==='activity'?'Activity':view==='inbox'?'Inbox':'Projects'))+' ';$$('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));if(view==='activity'){const wrap=el('div','activity-list');if(!activity.length)wrap.append(el('div','empty-state','Your task activity will appear here.'));activity.forEach(a=>{const row=el('div','activity-row');row.append(el('span','activity-icon','◷'),el('span','',a.action+' · '+a.title),el('small','',new Date(a.at).toLocaleString()));wrap.append(row)});host.append(wrap);return}
if(mode==='list'&&fullViews){
 const wrap=el('div','table-view'),controls=el('div','table-controls');
 const intro=el('p','recurrence-note','One active task per repeating schedule. Future dates live in Week and Month; completed occurrences are available under History.');
 wrap.append(intro);
 const makeSelect=(label,value,options,change)=>{
  const group=el('label','table-control-label',label),select=el('select','table-select');
  select.setAttribute('aria-label',label);select.value=value;
  for(const [v,text] of options){const option=el('option','',text);option.value=v;select.append(option)}
  select.value=value;select.onchange=()=>change(select.value);
  group.append(select);return group
 };
 controls.append(
  makeSelect('Show',tableFilter,[['active','Active tasks'],['history','Completed history'],['all','All tasks']],value=>{tableFilter=value;renderPlanner()}),
  makeSelect('Sort',tableSort,[['date','Due date'],['priority','Priority'],['project','Project'],['name','Task name']],value=>{tableSort=value;renderPlanner()})
 );
 wrap.append(controls);
 const pending=activeTasks(baseList),finished=historyTasks(baseList);
 const rows=(tableFilter==='history'?finished:tableFilter==='all'?[...pending,...finished]:pending).sort((a,b)=>{
  if(tableSort==='priority')return ({high:0,medium:1,low:2,none:3}[a.priority||'none']-({high:0,medium:1,low:2,none:3}[b.priority||'none']))||(displayDate(a)||'9999').localeCompare(displayDate(b)||'9999');
  if(tableSort==='project')return (a.project||'').localeCompare(b.project||'')||(displayDate(a)||'9999').localeCompare(displayDate(b)||'9999');
  if(tableSort==='name')return a.title.localeCompare(b.title);
  return (displayDate(a)||'9999').localeCompare(displayDate(b)||'9999')||(a.time||'').localeCompare(b.time||'')
 });
 const count=el('p','table-count',rows.length+' '+(tableFilter==='history'?'completed occurrences':tableFilter==='all'?'tracked entries':'active tasks'));
 controls.append(count);
 if(!rows.length)wrap.append(el('div','empty-state',tableFilter==='history'?'No completed tasks yet.':'No tasks match this view.'));
 else{
  const scroller=el('div','table-scroll'),table=el('table','flow-table'),head=el('thead'),header=el('tr');
  for(const label of ['Task','Status','Priority','Due date','Time','Project','Repeat'])header.append(el('th','',label));
  head.append(header);table.append(head);
  const body=el('tbody');
  for(const t of rows){
   const tr=el('tr',t.done?'table-done':''),name=el('td'),link=el('button','table-task-name',t.title);
   link.onclick=()=>openTask(t);name.append(link);
   if(t.description)name.append(el('small','table-task-note',t.description));
   const statusCell=el('td'),status=el('select','table-status-select');
   const states=[['todo','To Do'],['progress','In Progress'],['done','Done']];
   for(const [value,label] of states){const option=el('option','',label);option.value=value;status.append(option)}
   status.value=taskStatus(t);status.setAttribute('aria-label','Change status for '+t.title);
   status.onchange=()=>setTaskStatus(t,status.value);statusCell.append(status);
   tr.append(name,statusCell,el('td','',t.priority&&t.priority!=='none'?t.priority:'—'),
    el('td','',t.date?dateText(t.done?t.date:displayDate(t)):'—'),
    el('td','',t.time?formatTime(t.time):'—'),
    el('td','',t.project||'Inbox'),
    el('td','',isRepeating(t)?t.repeat+(t.done?' · history':''):'—'));
   body.append(tr);
  }
  table.append(body);scroller.append(table);wrap.append(scroller)
 }
 host.append(wrap);return
}
if(view==='today'||view==='inbox'||query){
 const wrap=el('div','list-view');
 const sorted=[...list].sort((a,b)=>view==='inbox'?0:(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'').localeCompare(b.time||''));
 if(!sorted.length)wrap.append(el('div','empty-state',view==='inbox'?'Inbox is clear. Add a task here to capture something for later.':'No tasks here yet. Add one to get started.'));
 sorted.forEach(t=>{
  const row=el('div','list-row'+(t.done?' done':''));
  row.append(el('span','color-dot '+t.color));
  const title=el('button','',t.title+priorityLabel(t)+(isRepeating(t)?' ↻ '+t.repeat:''));
  title.onclick=()=>openTask(t.virtualSource||t);
  const info=el('div','list-item-main');info.append(title);
  if(isRepeating(t))info.append(el('small','list-recurrence',t.done?'Completed occurrence':'Scheduled occurrence · '+t.repeat));
  else if(t.description)info.append(el('small','list-recurrence',t.description));
  row.append(info,el('span','date',(t.date?dateText(t.date):'No date')+(t.time?' · '+formatTime(t.time):'')));
  const done=el('input');done.type='checkbox';done.checked=!!t.done;done.setAttribute('aria-label','Complete '+t.title);
  done.onchange=()=>{if(done.checked)completeOccurrence(t);else if(!t.virtualSource)completeTask(t,false)};
  row.append(done);
  if(view==='inbox'){const assign=el('button','inbox-organize','Organize →');assign.onclick=()=>openTask(t);row.append(assign)}
  wrap.append(row)
 });
 host.append(wrap);return
}
if(mode==='board'){
 const note=el('p','recurrence-note','Board tracks actionable work. Repeating tasks appear once; each finished occurrence is saved in history. Done shows only the 12 most recent completions from the last 14 days.');
 host.append(note);
 const pending=activeTasks(baseList),recent=recentlyCompleted(baseList);
 const lanes=[
  ['To Do','todo',pending.filter(t=>taskStatus(t)==='todo')],
  ['In Progress','progress',pending.filter(t=>taskStatus(t)==='progress')],
  ['Recently Done','done',recent]
 ],board=el('div','kanban');
 for(const [name,status,laneTasks] of lanes){
  const lane=el('div','kanban-lane');
  lane.setAttribute('aria-label',name+' drop zone');
  lane.append(el('h3','',name+' · '+laneTasks.length));
  lane.ondragover=e=>{if(e.dataTransfer.types.includes('text/plain')){e.preventDefault();e.dataTransfer.dropEffect='move';lane.classList.add('drag-target')}};
  lane.ondragleave=e=>{if(!lane.contains(e.relatedTarget))lane.classList.remove('drag-target')};
  lane.ondrop=e=>{e.preventDefault();lane.classList.remove('drag-target');const t=tasks.find(x=>x.id===e.dataTransfer.getData('text/plain'));if(t&&taskStatus(t)!==status)setTaskStatus(t,status)};
  for(const t of laneTasks){
   const card=el('div','kanban-card'),button=el('button','task '+t.color);
   button.append(el('span','task-name',t.title+priorityLabel(t)));
   if(t.date||t.time)button.append(el('span','task-time',(t.done?'Finished ':'Due ')+(t.date?dateText(t.done?t.date:displayDate(t)):'')+(t.time?' · '+formatTime(t.time):'')));
   if(t.project)button.append(el('span','task-project',t.project));
   if(t.description)button.append(el('span','task-description',t.description));
   if(isRepeating(t))button.append(el('span','task-progress','↻ '+t.repeat+(t.done?' · Completed occurrence':' · Next occurrence')));
   if(t.subtasks?.length)button.append(el('span','task-progress',t.subtasks.filter(x=>typeof x==='object'&&x.done).length+'/'+t.subtasks.length+' subtasks'));
   button.draggable=true;
   button.ondragstart=e=>{e.dataTransfer.setData('text/plain',t.id);e.dataTransfer.effectAllowed='move';card.classList.add('dragging')};
   button.ondragend=()=>{card.classList.remove('dragging');$$('.kanban-lane').forEach(l=>l.classList.remove('drag-target'))};
   button.onclick=()=>openTask(t);
   card.append(button);
   const actions=el('div','kanban-actions');
   const addAction=(label,target)=>{const action=el('button','kanban-toggle',label);action.type='button';action.onclick=()=>setTaskStatus(t,target);actions.append(action)};
   if(status==='todo'){addAction('◷ Start','progress');addAction('✓ Complete','done')}
   if(status==='progress'){addAction('↶ To Do','todo');addAction('✓ Complete','done')}
   if(status==='done')addAction('↶ Reopen','todo');
   card.append(actions);lane.append(card)
  }
  board.append(lane)
 }
 host.append(board);return
}
if(mode==='month'){const monthStart=new Date(new Date().getFullYear(),new Date().getMonth()+offset,1);const first=monday(monthStart);const month=el('div','month-grid');for(const label of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])month.append(el('div','month-weekday',label));for(let i=0;i<42;i++){const day=addDays(first,i),key=localDate(day);const cell=el('div','month-cell'+(day.getMonth()!==monthStart.getMonth()?' outside':'')+(key===currentToday()?' today':''));const dayButton=el('button','month-date',String(day.getDate()));dayButton.type='button';dayButton.setAttribute('aria-label','Add task for '+key);dayButton.onclick=()=>openTask(null,key);cell.append(dayButton);calendarDayTasks(list,key).sort((a,b)=>({high:0,medium:1,low:2,none:3}[a.priority||'none']-({high:0,medium:1,low:2,none:3}[b.priority||'none']))).forEach(t=>{const b=el('button','month-task '+(t.done?'done ':'')+t.color);b.type='button';b.append(el('span','month-task-title',t.title+priorityLabel(t)));if(t.time)b.append(el('span','month-task-meta','◷ '+formatTime(t.time)));if(t.project)b.append(el('span','month-task-meta',t.project));if(t.description)b.append(el('span','month-task-description',t.description));if(t.subtasks?.length){const completed=t.subtasks.filter(x=>typeof x==='object'&&x.done).length;b.append(el('span','month-task-meta','✓ '+completed+'/'+t.subtasks.length+' subtasks'))}if(t.repeat&&t.repeat!=='none')b.append(el('span','month-task-meta','↻ '+t.repeat));if(!t.done&&taskStatus(t)==='progress')b.append(el('span','month-task-meta','◷ In Progress'));if(t.attachment)b.append(el('span','month-task-meta','↗ Attachment'));if(t.movedOccurrence)b.append(el('span','month-task-meta','↪ Moved from '+dateText(t.occurrenceDate)));if(t.done)b.append(el('span','month-task-meta','✓ Completed'));b.onclick=()=>calendarEditor(t);if(t.virtualSource)b.title=t.movedOccurrence?'Moved occurrence · Click to edit repeating task':'Upcoming occurrence · Click to edit repeating task';cell.append(b);if(!t.done){const finish=el('button','occurrence-complete','✓ Complete');finish.type='button';finish.setAttribute('aria-label','Complete '+t.title+' on '+dateText(t.date));finish.onclick=()=>completeOccurrence(t);cell.append(finish)}});month.append(cell)}host.append(month);return}const grid=el('div','week-grid');for(let i=0;i<7;i++){const day=addDays(start,i),key=localDate(day);const col=el('div','day'+(key===currentToday()?' today':''));const head=el('div','day-header');head.append(el('strong','',String(day.getDate())),el('span','',day.toLocaleDateString(undefined,{weekday:'short'})));col.append(head);const body=el('div','day-body');body.ondragover=e=>{e.preventDefault();body.classList.add('drag-target')};body.ondragleave=()=>body.classList.remove('drag-target');body.ondrop=e=>{e.preventDefault();body.classList.remove('drag-target');let payload;try{payload=JSON.parse(e.dataTransfer.getData('application/x-flow-task')||'null')}catch{}const task=tasks.find(x=>x.id===(payload?.id||e.dataTransfer.getData('text/plain')));if(task){const scheduled=payload?.occurrenceDate||task.date;if(payload?.displayDate===key)return;rescheduleCalendarTask(task,scheduled,key)}};calendarDayTasks(list,key).sort((a,b)=>(a.time||'').localeCompare(b.time||'')).forEach(t=>{const b=el('button','task '+t.color+(t.done?' done':''));b.draggable=!t.done;b.ondragstart=e=>{e.dataTransfer.setData('text/plain',(t.virtualSource||t).id);e.dataTransfer.setData('application/x-flow-task',JSON.stringify({id:(t.virtualSource||t).id,occurrenceDate:t.occurrenceDate||t.date,displayDate:t.date}));e.dataTransfer.effectAllowed='move'};b.append(el('span','task-name',t.title+priorityLabel(t)+(t.repeat&&t.repeat!=='none'?' ↻':'')));if(t.time)b.append(el('span','task-time',formatTime(t.time)));if(t.project)b.append(el('span','task-project',t.project));if(t.description)b.append(el('span','task-description',t.description));if(t.repeat&&t.repeat!=='none')b.append(el('span','task-progress','↻ '+t.repeat));if(!t.done&&taskStatus(t)==='progress')b.append(el('span','task-progress','◷ In Progress'));if(t.attachment)b.append(el('span','task-progress','↗ Attachment'));if(t.movedOccurrence)b.append(el('span','task-progress','↪ Moved from '+dateText(t.occurrenceDate)));if(t.done)b.append(el('span','task-progress','✓ Completed'));b.onclick=()=>calendarEditor(t);if(t.virtualSource){b.title='Upcoming occurrence · Drag to move this date only; click to edit the repeating task'}if(t.subtasks?.length){const count=t.subtasks.filter(x=>typeof x==='object'&&x.done).length;b.append(el('span','task-progress',count+'/'+t.subtasks.length+' subtasks'))}body.append(b);if(!t.done){const finish=el('button','occurrence-complete','✓ Complete');finish.type='button';finish.setAttribute('aria-label','Complete '+t.title+' on '+dateText(t.date));finish.onclick=()=>completeOccurrence(t);body.append(finish)}});const add=el('button',body.childElementCount?'empty-day':'add-slot',body.childElementCount?'＋ Add task':'＋');add.setAttribute('aria-label','Add task for '+dateText(key));add.onclick=()=>openTask(null,key);body.append(add);col.append(body);grid.append(col)}host.append(grid)}function renderStats(){
 if(view!=='board')return;
 const now=new Date();
 let first,last,period;
 if(mode==='month'){
  first=new Date(now.getFullYear(),now.getMonth()+offset,1);
  last=new Date(first.getFullYear(),first.getMonth()+1,0);
  period=first.toLocaleDateString(undefined,{month:'long',year:'numeric'})
 }else if(mode==='week'){
  first=weekStart();last=addDays(first,6);
  period=dateText(localDate(first))+' – '+dateText(localDate(last))
 }else{
  first=monday(now);last=addDays(first,6);
  period='This week · '+dateText(localDate(first))+' – '+dateText(localDate(last))
 }
 const snapshot=overviewSnapshot(tasks,localDate(first),localDate(last));
 $('#overviewPeriod').textContent=period;
 $('#totalTasks').textContent=snapshot.total;
 $('#doneTasks').textContent=snapshot.done;
 $('#activeTasks').textContent=snapshot.remaining;
 const pct=snapshot.total?Math.round(snapshot.done*100/snapshot.total):0;
 $('#progressBar').style.width=pct+'%';
 $('#progressText').textContent=snapshot.total?
  snapshot.done+' of '+snapshot.total+' scheduled occurrences completed · '+snapshot.remaining+' remaining':
  'No scheduled tasks in this period';
 $('#projectCount').textContent=projects.length+' projects';
 const summary=$('#projectSummary');summary.replaceChildren();
 const open=activeTasks(tasks);
 for(const p of projects){
  const count=open.filter(t=>t.project===p).length;
  const row=el('div','summary-row');
  row.append(el('span','',p),el('small','',count+' open'));
  summary.append(row)
 }
 const bars=$('#bars');bars.replaceChildren();
 bars.setAttribute('aria-label','Scheduled tasks by weekday for '+period);
 const counts=mode==='month'||mode==='week'?snapshot.byWeekday:overviewSnapshot(tasks,localDate(monday(now)),localDate(addDays(monday(now),6))).byWeekday;
 const max=Math.max(1,...counts);
 for(let i=0;i<7;i++){
  const count=counts[i],wrap=el('div','bar-wrap'),bar=el('div','bar'),line=el('i');
  line.style.height=(count?Math.max(4,Math.round(count/max*50)):0)+'px';
  line.title=count+' scheduled on '+['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i];
  bar.append(line);
  wrap.append(bar,el('span','',['M','T','W','T','F','S','S'][i]));
  bars.append(wrap)
 }
}
function render(){renderSidebar();renderPlanner();renderStats()}function openTask(t,date){editingOccurrenceDate=null;editingOccurrence=null;editing=t?t.id:null;$('#repeatField').hidden=false;$('#taskScopeNote').hidden=true;const f=$('#taskForm');f.reset();$('#dialogTitle').textContent=t?'Edit task':'New task';$('#deleteTask').classList.toggle('hidden',!t);const sel=$('#projectSelect');sel.replaceChildren();const inboxOption=el('option','','Inbox · Unorganized');inboxOption.value='';sel.append(inboxOption);projects.forEach(p=>{const o=el('option','',p);o.value=p;sel.append(o)});f.elements.title.value=t?.title||'';f.elements.description.value=t?.description||'';f.elements.date.value=t?.date||date||(view==='inbox'?'':currentToday());f.elements.time.value=t?.time||'';f.elements.project.value=t?t.project:(view==='inbox'?'':filterProject||projects[0]);f.elements.color.value=t?.color||'purple';f.elements.priority.value=t?.priority||'none';f.elements.repeat.value=t?.repeat||'none';f.elements.done.checked=!!t?.done;f.elements.subtasks.value=(t?.subtasks||[]).map(x=>typeof x==='string'?x:x.title).join('\n');f.elements.attachment.value=t?.attachment||'';const panel=$('#checklistPanel'),items=$('#checklistItems');items.replaceChildren();panel.hidden=!(t?.subtasks?.length);if(t?.subtasks?.length){t.subtasks.forEach((sub,i)=>{const item=typeof sub==='string'?{title:sub,done:false}:sub;const label=el('label','checklist-item');const input=el('input');input.type='checkbox';input.checked=!!item.done;input.onchange=()=>{t.subtasks[i]={title:item.title,done:input.checked};log(input.checked?'Completed subtask':'Reopened subtask',item.title);save();$('#checklistCount').textContent=t.subtasks.filter(x=>typeof x==='object'&&x.done).length+'/'+t.subtasks.length};label.append(input,document.createTextNode(item.title));items.append(label)});$('#checklistCount').textContent=t.subtasks.filter(x=>typeof x==='object'&&x.done).length+'/'+t.subtasks.length}const preview=$('#attachmentPreview');preview.replaceChildren();preview.hidden=!t?.attachment;if(t?.attachment&&/^https?:\/\//i.test(t.attachment)){const link=el('a','','↗ Open attachment');link.href=t.attachment;link.target='_blank';link.rel='noopener noreferrer';preview.append(link)}$('#taskDialog').showModal();f.elements.title.focus()}$('#closeRecurrenceChoice').onclick=closeRecurrenceChoice;
$('#recurrenceChoice').onclick=e=>{if(e.target===$('#recurrenceChoice'))closeRecurrenceChoice()};
$('#editRepeatingSchedule').onclick=()=>{
 const t=calendarChoiceTask;
 closeRecurrenceChoice();
 if(!t)return;
 const source=t.virtualSource||t;
 const master=activeTasks(tasks).find(x=>isRepeating(x)&&!x.occurrenceOverride&&recurrenceKey(x)===recurrenceKey(source));
 openTask(master||source);
 $('#taskScopeNote').hidden=false;
 $('#taskScopeNote').textContent='Editing the entire repeating schedule. Future occurrences may change; completed history is retained.'
};
$('#editOneOccurrence').onclick=()=>{
 const t=calendarChoiceTask;
 closeRecurrenceChoice();
 if(!t)return;
 const original=t.occurrenceDate||t.date,source=t.virtualSource||t,key=recurrenceKey(source);
 const saved=tasks.find(x=>isRepeating(x)&&recurrenceKey(x)===key&&
  (x.occurrenceOverride||x.isOccurrenceHistory)&&(x.occurrenceDate||x.date)===original);
 const record=saved||source;
 openTask(record);
 editingOccurrence={sourceId:source.id,existingId:saved?.id||null,original,date:t.date};
 $('#dialogTitle').textContent='Edit this occurrence';
 $('#taskScopeNote').hidden=false;
 $('#taskScopeNote').textContent='Only this date changes. The rest of the repeating schedule stays the same.';
 $('#repeatField').hidden=true;
 const form=$('#taskForm');
 form.elements.date.value=t.date;
 form.elements.repeat.value=source.repeat;
 if(!saved){form.elements.done.checked=false;form.elements.subtasks.value=(source.subtasks||[]).map(x=>typeof x==='string'?x:x.title).join('\n')}
};
$('#taskForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;const old=tasks.find(x=>x.id===editing);const t={...(old||{}),id:editing||newTaskId(),title:f.elements.title.value.trim(),description:f.elements.description.value.trim(),date:f.elements.date.value,time:f.elements.time.value,project:f.elements.project.value,color:f.elements.color.value,priority:f.elements.priority.value,repeat:f.elements.repeat.value,done:!!old?.done,subtasks:f.elements.subtasks.value.split('\n').map(x=>x.trim()).filter(Boolean).map(title=>({title,done:!!old?.subtasks?.find(x=>typeof x==='object'&&x.title===title&&x.done)})),attachment:f.elements.attachment.value.trim()};if(!t.title||(!t.date&&t.project))return;if(old?.done&&isRepeating(old)&&t.repeat==='none'){const master=activeTasks(tasks).find(x=>isRepeating(x)&&!x.isOccurrenceHistory&&recurrenceKey(x)===recurrenceKey(old));if(master){stopRepeating(master);master.date=displayDate(master);master.repeat='none';master.recurrenceMoves=[];log('Stopped repeating schedule',master.title)}}
if(old&&!old.done&&isRepeating(old)&&!old.isOccurrenceHistory){
 const changedSchedule=t.repeat!==old.repeat;
 const changedIdentity=t.title!==old.title||t.project!==old.project||t.time!==old.time;
 if(changedSchedule||changedIdentity){
  const members=seriesMembers(old),stable=old.seriesId||old.id;
  for(const member of members)if(!member.seriesId)member.seriesId=stable;
  t.seriesId=stable;
  if(changedSchedule){
   if(t.repeat==='none')stopRepeating(old);
   else archiveOtherPending(old);
   t.stoppedRecurrence=t.repeat==='none'?{seriesId:old.seriesId||old.id,signature:recurrenceSignature(old),repeat:old.repeat}:undefined;
   t.recurrenceMoves=[];
   if(t.repeat==='none'){t.date=f.elements.date.value!==old.date?f.elements.date.value:(editingOccurrenceDate||displayDate(old));t.occurrenceDate=undefined;t.status=t.done?'done':'todo'}
  }
 }
 if(old.date!==t.date&&t.repeat!=='none')t.recurrenceMoves=[];
}
if(isRepeating(t)&&!t.seriesId)t.seriesId=t.id;
if(t.repeat==='monthly'&&(!old||old.repeat!=='monthly'||old.date!==t.date))t.repeatAnchor=parseDate(t.date).getDate();
const idx=tasks.findIndex(x=>x.id===editing);
if(idx>=0)tasks[idx]=t;else tasks.push(t);
if(f.elements.done.checked&&!t.done)completeTask(t,true);
else if(!f.elements.done.checked&&t.done)completeTask(t,false);log(idx>=0?'Updated':'Created',t.title);save();$('#taskDialog').close();if(idx<0){filterProject='';query='';$('#search').value='';view=t.project?'board':'inbox';mode=t.project?'week':'list';offset=t.date?Math.round((monday(parseDate(t.date))-monday(new Date()))/(7*86400000)):0}render();$('#planner').scrollIntoView({block:'nearest',behavior:'smooth'})};$('#deleteTask').onclick=()=>{if(!editing||!confirm('Delete this task?'))return;const removed=tasks.find(t=>t.id===editing);tasks=tasks.filter(t=>t.id!==editing);log('Deleted',removed?.title||'Task');save();$('#taskDialog').close();render()};$('#closeDialog').onclick=()=>$('#taskDialog').close();$('#taskDialog').onclick=e=>{if(e.target===$('#taskDialog'))$('#taskDialog').close()};$('#addTaskTop').onclick=()=>openTask();$('#newProject').onclick=()=>{const p=prompt('New project name');if(!p||!p.trim())return;const name=p.trim().slice(0,40);if(projects.includes(name))return alert('Project already exists');projects.push(name);filterProject=name;view='board';mode='board';log('Created project',name);save();render()};let searchFrame=0;$('#search').oninput=e=>{query=e.target.value.trim().toLowerCase();if(searchFrame)cancelAnimationFrame(searchFrame);searchFrame=requestAnimationFrame(()=>{searchFrame=0;renderPlanner()})};$$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;if(view==='all')mode='list';if(view==='board'&&mode==='list')mode='board';filterProject='';query='';$('#search').value='';render()});let returnWeekOffset=null,returnWeekMonth='';
$$('[data-mode]').forEach(b=>{b.type='button';b.addEventListener('click',()=>{
 const next=b.dataset.mode;
 if(mode==='week'&&next==='month'){
  const focus=addDays(weekStart(),3),now=new Date();
  returnWeekOffset=offset;
  returnWeekMonth=focus.getFullYear()+'-'+focus.getMonth();
  offset=(focus.getFullYear()-now.getFullYear())*12+focus.getMonth()-now.getMonth();
 }else if(mode==='month'&&next==='week'){
  const now=new Date(),focus=new Date(now.getFullYear(),now.getMonth()+offset,1);
  const monthKey=focus.getFullYear()+'-'+focus.getMonth();
  if(monthKey===returnWeekMonth&&returnWeekOffset!==null)offset=returnWeekOffset;
  else if(focus.getFullYear()===now.getFullYear()&&focus.getMonth()===now.getMonth())offset=0;
  else offset=Math.round((monday(focus)-monday(now))/(7*86400000));
 }else if(next!==mode)offset=0;
 mode=next;renderPlanner();renderStats()
})});$('#prevWeek').onclick=()=>{offset--;renderPlanner();renderStats()};$('#nextWeek').onclick=()=>{offset++;renderPlanner();renderStats()};$('#currentWeek').onclick=()=>{offset=0;renderPlanner();renderStats()};const timeFormatSelect=$('#timeFormat');timeFormatSelect.value=timeFormat;timeFormatSelect.onchange=()=>{timeFormat=timeFormatSelect.value;try{localStorage.setItem(timeFormatKey,timeFormat)}catch{alert('Time display preference could not be saved in this browser.')}renderPlanner()};const scheduleDayChange=()=>{const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);setTimeout(()=>{if(view==='today'&&!$('#taskDialog').open)render();scheduleDayChange()},Math.max(1000,next-now+100))};scheduleDayChange();render();if(damagedKeys.length){const button=el('button','new-project','↓ Download recovery backup');button.type='button';button.id='recoveryBackup';button.onclick=()=>{try{const raw={};for(const key of [KEY,PK,AK])raw[key]=localStorage.getItem(key);const payload={app:'FLOW',type:'raw-recovery',exportedAt:new Date().toISOString(),damagedKeys:[...damagedKeys],raw};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='flow-recovery-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{alert('Recovery download failed. Do not clear this site\'s browser data.')}};$('#exportData').after(button);const warning=el('p','capture-help','Saved workspace data is damaged. Changes cannot be saved until the original data is recovered. Download a recovery backup and keep it safe.');button.after(warning);alert('FLOW detected damaged browser data ('+damagedKeys.join(', ')+'). Saving is locked to prevent overwriting it. Use Download recovery backup to preserve the original data.')}})();