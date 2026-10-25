/**
 * Real-browser smoke tests for FLOW desktop, tablet, and phone layout.
 * Run after installing playwright-core:
 *   npm install --no-save --package-lock=false playwright-core@1.56.1
 *   node tools/flow-browser-check.mjs
 * Uses Chrome/Chromium already on the runner; no tests touch personal data.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/favicon.ico'){res.writeHead(204);res.end();return}
  const target=resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!target.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const content=await readFile(target);
  res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});
  res.end(content)
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const candidates=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let executablePath;
for(const candidate of candidates){try{await access(candidate);executablePath=candidate;break}catch{}}
const browser=await chromium.launch(executablePath?{executablePath,headless:true,args:['--no-sandbox']}:{channel:'chrome',headless:true,args:['--no-sandbox']});
const failures=[],results=[];
async function scenario(name,viewport,isMobile=false){
 const compactMonth=viewport.width<=700;
 const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile,deviceScaleFactor:isMobile?2:1,acceptDownloads:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
 try{
  // Existing feature tests use a private fixture, not the public first-visit defaults.
  await page.addInitScript(()=>{
   if(localStorage.getItem('flow.projects.v1')===null){
    localStorage.setItem('flow.projects.v1',JSON.stringify(['Team Project','Personal','Design']));
   }
  });
  await page.goto(origin+'/Flow/',{waitUntil:'load'});
  await page.locator('.week-grid').waitFor();
  // Long user-entered project names must wrap, not collapse behind the management dots.
  const longName='A Very Long Project Name For Detailed Planning';
  await page.evaluate(name=>{
   const key='flow.projects.v1';
   const saved=JSON.parse(localStorage.getItem(key)||'["Team Project","Personal","Design"]');
   if(!saved.includes(name))saved.push(name);
   localStorage.setItem(key,JSON.stringify(saved));
  },longName);
  await page.reload({waitUntil:'load'});
  await page.locator('.week-grid').waitFor();
  const nameEntry=page.locator('#projectList .project-name').filter({hasText:longName});
  assert.equal(await nameEntry.count(),1,name+' should render the complete project name');
  const labelFit=await nameEntry.evaluate(el=>({
   text:el.textContent,
   width:el.clientWidth,scrollWidth:el.scrollWidth,
   height:el.getBoundingClientRect().height,
   lineHeight:parseFloat(getComputedStyle(el).lineHeight),
   naturalWidth:(()=>{
    const probe=document.createElement('canvas').getContext('2d');
    probe.font=getComputedStyle(el).font;
    return probe.measureText(el.textContent).width;
   })()
  }));
  assert.equal(labelFit.text,longName,'Project label must retain every character');
  assert(labelFit.scrollWidth<=labelFit.width+2,name+' project name must not be clipped horizontally');
  assert(labelFit.height>=labelFit.lineHeight-2,name+' should display a complete first line');
  if(labelFit.naturalWidth>labelFit.width+2){
   assert(labelFit.height>=labelFit.lineHeight*2-2,name+' should wrap long project names when needed');
  }
  assert.equal(await page.locator('#projectList .project-list-row').filter({hasText:longName}).locator('.project-manage').count(),1,
   'Each project must still have a separate management button');
  const projectPageFit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);
  assert(projectPageFit,name+' projects should not overflow the viewport');
  const mainDestinations=page.locator('.sidebar .nav [data-view]');
  assert.equal(await mainDestinations.count(),6,'Navigation must include Calendar and Inbox');
  assert.equal(await page.locator('[data-view="calendar"]').isVisible(),true,'Calendar shortcut must be discoverable');
  assert.equal(await page.locator('[data-view="inbox"] .nav-icon').count(),1,'Inbox must use a consistent vector icon');
  if(isMobile){
   const navigation=await page.locator('.sidebar .nav').evaluate(el=>({
    client:el.clientWidth,scroll:el.scrollWidth,
    controls:[...el.querySelectorAll('[data-view]')].map(button=>{
     const rect=button.getBoundingClientRect(),parent=el.getBoundingClientRect();
     return {x:rect.left-parent.left,width:rect.width,height:rect.height}
    })
   }));
   assert(navigation.scroll<=navigation.client+2,name+' should expose all primary navigation destinations without sideways scrolling');
   for(const button of navigation.controls){
    assert(button.x>=-2&&button.x+button.width<=navigation.client+2,name+' must keep every nav button within the screen');
    assert(button.height>=44,name+' nav button must be at least 44px tall')
   }
  }
  await page.locator('[data-view="inbox"]').click();
  assert.equal(await page.locator('.toolbar').isVisible(),false,'Inbox may hide calendar tabs');
  await page.locator('[data-view="calendar"]').click();
  await page.locator(compactMonth?'.mobile-month':'.month-grid').waitFor();
  assert.equal(await page.locator('[data-view="calendar"]').getAttribute('aria-current'),'page','Calendar shortcut must activate');
  await page.locator('[data-mode="week"]').click();
  await page.locator('.week-grid').waitFor();
  assert.equal(await page.locator('[data-view="calendar"]').getAttribute('aria-current'),'page','Week remains part of Calendar');
  assert.equal(await page.locator('[data-mode="week"]').getAttribute('class').then(x=>x?.includes('selected')),true);
  const dimensions=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(dimensions.body<=dimensions.viewport+2,name+' should not horizontally overflow the browser viewport');
  if(isMobile){
   assert.equal(await page.locator('.sidebar-search').isVisible(),true,name+' needs task search');
   assert.equal(await page.locator('#mobileViewHint').isVisible(),true,name+' needs touch help');
   assert.match(await page.locator('#mobileViewHint').innerText(),/Tap a task/);
   const sizes=await page.evaluate(()=>{
    const selectors=['.tabs button','.nav button','.occurrence-complete','.toolbar-right button'];
    return Object.fromEntries(selectors.map(selector=>[selector,Math.min(...[...document.querySelectorAll(selector)].filter(e=>getComputedStyle(e).display!=='none').map(e=>Math.round(e.getBoundingClientRect().height)))]))
   });
   for(const [selector,height] of Object.entries(sizes))assert(height>=40,name+' '+selector+' touch target too small: '+height);
  }else assert.equal(await page.locator('#mobileViewHint').isVisible(),false,'Desktop should not show mobile hint');
  await page.locator('[data-mode="month"]').click();
  await page.locator(compactMonth?'.mobile-month':'.month-grid').waitFor();
  if(compactMonth){
   assert.equal(await page.locator('.month-grid').count(),0,'Phone must not build desktop month cards');
   assert.equal(await page.locator('.mobile-month-day').count(),42,'Phone month must have six rows of seven days');
   assert.match(await page.locator('#mobileViewHint').innerText(),/Select a date/);
   const dimensions=await page.evaluate(()=>{
    const grid=document.querySelector('.mobile-month-grid'),planner=document.querySelector('#planner');
    return {grid:Math.round(grid.getBoundingClientRect().width),
     calendar:Math.round(grid.parentElement.getBoundingClientRect().width),
     planner:Math.round(planner.getBoundingClientRect().width),
     page:document.documentElement.scrollWidth,viewport:innerWidth}
   });
   assert(dimensions.grid<=dimensions.calendar+1,'Compact calendar must fit its card');
   assert(dimensions.calendar<=dimensions.planner+1,'Calendar card must fit its container');
   assert(dimensions.page<=dimensions.viewport+2,'Compact month must not overflow phone viewport');
   const day=page.locator('.mobile-month-day:not(.outside)').first();
   const selectedDate=await day.getAttribute('data-date');
   await day.click();
   assert.equal(await day.getAttribute('aria-pressed'),'true','Tapped date must become selected');
   assert.equal(await page.locator('.mobile-month-agenda').isVisible(),true,'Phone month needs agenda below');
   await page.locator('.mobile-month-add').click();
   assert.equal(await page.locator('#taskForm [name=date]').inputValue(),selectedDate,'Add task should use selected date');
   await page.locator('#closeDialog').click();
   assert.equal(await page.locator('#taskDialog').isVisible(),false,'Closing date-prefilled editor should work');
   await page.locator('.mobile-month-add').click();
   await page.locator('#taskForm [name=title]').fill('Browser QA agenda task');
   await page.locator('#taskForm [name=repeat]').selectOption('none');
   await page.locator('#taskForm [name=project]').selectOption('Personal');
   await page.locator('#taskForm button[type=submit]').click();
   await page.locator('.mobile-month').waitFor();
   assert.equal(await page.locator('.mobile-month-day.selected').getAttribute('data-date'),selectedDate,
    'Saving on a phone date must preserve the selected month and day');
   assert.equal(await page.locator('.mobile-agenda-task').filter({hasText:'Browser QA agenda task'}).count(),1,
    'Newly saved phone task must appear under the selected day');
   await page.locator('#undoTask').click();
   assert.equal(await page.locator('.mobile-agenda-task').filter({hasText:'Browser QA agenda task'}).count(),0,
    'Undo of calendar-created task must remove it from the agenda');
  }else{
   assert.equal(await page.locator('.mobile-month').count(),0,'Desktop and tablet must retain full month grid');
   if(isMobile)assert.match(await page.locator('#mobileViewHint').innerText(),/Swipe sideways/);
  }
  await page.locator('[data-mode="board"]').click();await page.locator('.kanban').waitFor();
  assert.equal(await page.locator('.kanban-lane').count(),3,'Board must have three stages');
  await page.locator('[data-mode="list"]').click();await page.locator('.flow-table').waitFor();
  if(isMobile)assert(await page.evaluate(()=>document.querySelector('.table-scroll').scrollWidth>=document.querySelector('.table-scroll').clientWidth),'Table must allow horizontal access to columns');
  await page.locator('[data-mode="week"]').click();
  // A scoped recurring edit must work on both pointer and touch devices.
  await page.locator('#addTaskTop').click();
  const dialog=page.locator('#taskDialog');
  assert.equal(await dialog.isVisible(),true);
  const fit=await page.evaluate(()=>{const dialog=document.querySelector('#taskDialog');return {height:dialog.getBoundingClientRect().height,window:innerHeight,scrollable:getComputedStyle(dialog).overflowY}});
  assert(fit.height<=fit.window+1,'Task dialog must fit the viewport');
  await page.locator('#taskForm [name=title]').fill('Browser QA weekly');
  await page.locator('#taskForm [name=repeat]').selectOption('weekly');
  await page.locator('#taskForm [name=project]').selectOption('Personal');
  await page.locator('#taskForm button[type=submit]').click();
  await page.locator('[data-mode="month"]').click();
  await page.locator(compactMonth?'.mobile-month':'.month-grid').waitFor();
  if(compactMonth){
   const scheduledDate=await page.evaluate(()=>{
    const items=JSON.parse(localStorage.getItem('flow.tasks.v1')||'[]');
    return items.find(item=>item.title==='Browser QA weekly'&&!item.done)?.date
   });
   assert(scheduledDate,'Saved weekly task must have a calendar date');
   const dateButton=page.locator('.mobile-month-day[data-date="'+scheduledDate+'"]');
   assert.equal(await dateButton.count(),1,'Compact month should include the task date');
   await dateButton.click();
   const matching=page.locator('.mobile-agenda-task').filter({hasText:'Browser QA weekly'});
   assert.equal(await matching.count(),1,'Selected-day agenda should show a single recurring task');
   await matching.first().locator('.mobile-agenda-edit').click();
  }else{
   const matching=page.locator('.month-task').filter({hasText:'Browser QA weekly'});
   assert(await matching.count()>=1,'Weekly task must appear on desktop/tablet calendar');
   await matching.first().click()
  }
  assert.equal(await page.locator('#recurrenceChoice').isVisible(),true,'Recurring task must require scope choice');
  await page.locator('#editOneOccurrence').click();
  assert.equal(await dialog.isVisible(),true);
  const currentTime=await page.locator('#taskForm [name=time]').inputValue();
  await page.locator('#taskForm [name=time]').fill(currentTime==='12:30'?'13:30':'12:30');
  await page.locator('#taskForm button[type=submit]').click();
  await page.locator('[data-mode="board"]').click();
  assert.equal(await page.locator('.kanban-card .task-name').filter({hasText:'Browser QA weekly'}).count(),1,'One edited occurrence must not duplicate recurring Board cards');
  await page.locator('[data-mode="list"]').click();
  assert.equal(await page.locator('.flow-table .table-task-name').filter({hasText:'Browser QA weekly'}).count(),1,'Table must list recurring schedule once');
  assert.equal(errors.length,0,'Unexpected browser errors: '+errors.join('; '));
  results.push({name,viewport:viewport.width+'×'+viewport.height,status:'PASS'});
 }catch(e){failures.push({name,error:e.stack||String(e),browserErrors:errors})}
 finally{await context.close()}
}
async function freshVisitorScenario(){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 try{
  await page.goto(origin+'/Flow/',{waitUntil:'load'});
  await page.locator('.week-grid').waitFor();
  assert.equal(await page.locator('#projectList .project-list-row').count(),0,
   'New visitors must have no starter projects');
  assert.equal(await page.locator('#projectSummary .summary-row').count(),0,
   'Overview must have no starter project rows');
  assert.equal(await page.locator('#projectCount').innerText(),'0 projects');
  assert.equal(await page.locator('#totalTasks').innerText(),'0');
  const saved=await page.evaluate(()=>({
   tasks:localStorage.getItem('flow.tasks.v1'),
   projects:localStorage.getItem('flow.projects.v1')
  }));
  assert.equal(saved.tasks,null,'Opening the app must not silently write starter tasks');
  assert.equal(saved.projects,null,'Opening the app must not silently write starter projects');
  await page.locator('#addTaskTop').click();
  assert.equal(await page.locator('#projectSelect').inputValue(),'',
   'A new task with no projects must default to Inbox');
  await page.locator('#taskForm [name=title]').fill('My first task');
  await page.locator('#taskForm [name=date]').fill('');
  await page.locator('#taskForm button[type=submit]').click();
  const firstTasks=await page.evaluate(()=>JSON.parse(localStorage.getItem('flow.tasks.v1')));
  assert.equal(firstTasks.length,1,'Saving a first-time task must work');
  assert.equal(firstTasks[0].project,'','First task must be unassigned');
  await page.locator('#undoTask').click();
  const undone=await page.evaluate(()=>JSON.parse(localStorage.getItem('flow.tasks.v1')));
  assert.deepEqual(undone,[],'Undo must restore an empty workspace');
  await page.locator('#newProject').click();
  await page.locator('#projectName').fill('My first project');
  await page.locator('#projectForm button[type=submit]').click();
  const firstProjects=await page.evaluate(()=>JSON.parse(localStorage.getItem('flow.projects.v1')));
  assert.deepEqual(firstProjects,['My first project'],'Creating a first project must work');
  results.push({name:'Fresh visitor',viewport:'390×844',status:'PASS'});
 }catch(error){failures.push({name:'Fresh visitor',error:error.stack||String(error)})}
 finally{await context.close()}
}
try{
 await freshVisitorScenario();
 await scenario('Desktop',{width:1440,height:900});
 await scenario('Tablet touch',{width:768,height:1024},true);
 await scenario('Phone touch',{width:390,height:844},true);
 await scenario('Small phone touch',{width:320,height:720},true);
 console.log('FLOW BROWSER CHECK RESULTS '+JSON.stringify(results));
 if(failures.length){console.error('FLOW BROWSER CHECK FAILURES '+JSON.stringify(failures));process.exitCode=1}
 else console.log('FLOW BROWSER CHECK PASSED: desktop, tablet, 390px and 320px phones')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
