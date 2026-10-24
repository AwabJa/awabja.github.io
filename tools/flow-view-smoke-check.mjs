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
  this.value='';this.events={};this.classes=new Set();
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
 scrollIntoView(){}
 focus(){}
}
function simulate(){
 const nodes=new Map();
 for(const [,id] of pageSource.matchAll(/\bid="([^"]+)"/g))nodes.set('#'+id,new FakeElement());
 for(const selector of ['.lower','.toolbar','.tabs','.toolbar-right','.subheading'])nodes.set(selector,new FakeElement());
 nodes.get('#heading').append(new FakeElement('#text'));
 const modes=[...pageSource.matchAll(/data-mode="([^"]+)"/g)].map(([,mode])=>{const e=new FakeElement('button');e.dataset.mode=mode;return e});
 const views=[...pageSource.matchAll(/data-view="([^"]+)"/g)].map(([,view])=>{const e=new FakeElement('button');e.dataset.view=view;return e});
 const document={
  createElement:tag=>new FakeElement(tag),
  createTextNode:text=>{const e=new FakeElement('#text');e.textContent=text;return e},
  querySelector:selector=>nodes.get(selector)||null,
  querySelectorAll:selector=>selector==='[data-mode]'?modes:selector==='[data-view]'||selector==='.nav button'?views:selector==='.kanban-lane'?[]:[]
 };
 const store=new Map();
 const localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
 };
 const boot=new Function('document','localStorage','crypto','setTimeout','requestAnimationFrame','alert','confirm','prompt',appSource);
 boot(document,localStorage,{randomUUID:()=>String(Math.random())},()=>0,fn=>{fn();return 1},()=>{},()=>true,()=>null);
 const planner=nodes.get('#planner');
 const contains=cls=>planner.children.some(child=>child instanceof FakeElement&&child.className===cls);
 const select=mode=>{const button=modes.find(b=>b.dataset.mode===mode);assert(button,'Missing '+mode+' button');button.fire();assert(button.classList.contains('selected'),mode+' tab should be selected')};
 assert(contains('week-grid'),'Initial Week view must render');
 select('month');assert(contains('month-grid'),'Month view must render');
 select('board');assert(contains('kanban'),'Board view must render');
 select('list');assert(contains('list-view'),'Table view must render');
 select('week');assert(contains('week-grid'),'Week view must render again');
 for(const target of ['today','all','activity','inbox','board']){
  const button=views.find(b=>b.dataset.view===target);
  assert(button,'Missing '+target+' navigation');
  button.fire();
  assert(button.classList.contains('active'),target+' navigation should activate');
 }
 console.log('FLOW VIEW SMOKE CHECK PASSED: Week, Month, Board, Table and 5 navigation buttons');
}
simulate();
