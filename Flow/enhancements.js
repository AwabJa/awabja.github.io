(()=>{'use strict';
const key='flow.tasks.v1',projectsKey='flow.projects.v1',activityKey='flow.activity.v1',backupKey='flow.lastBackup.v1';
const exportButton=document.getElementById('exportData'),backupStatus=document.getElementById('backupStatus');
const updateBackupStatus=()=>{
 if(!backupStatus)return;
 let last='';
 try{last=localStorage.getItem(backupKey)||''}catch{}
 const date=last?new Date(last):null;
 backupStatus.textContent=date&&Number.isFinite(date.getTime())?
  'Last backup export requested '+date.toLocaleDateString()+'. Keep the downloaded file safe; your tasks remain stored only in this browser.':
  'Your tasks are stored only in this browser. Export a backup regularly to avoid data loss.'
};
updateBackupStatus();
exportButton?.addEventListener('click',()=>{
 try{
  const payload={app:'FLOW',version:1,exportedAt:new Date().toISOString(),
   tasks:JSON.parse(localStorage.getItem(key)||'[]'),projects:JSON.parse(localStorage.getItem(projectsKey)||'[]'),
   activity:JSON.parse(localStorage.getItem(activityKey)||'[]')};
  if(!Array.isArray(payload.tasks)||!Array.isArray(payload.projects)||!Array.isArray(payload.activity))throw Error('Saved workspace data is not in the expected format');
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='flow-workspace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  try{localStorage.setItem(backupKey,payload.exportedAt)}catch{}
  updateBackupStatus()
 }catch(err){alert('Export failed: '+err.message)}
});
})();