/* @file kb-profile.js — 多人档案与事项查找 */

/* ================= 档案 ================= */
const PROF_KEY = 'mybazi.profiles.v2';
let PROFILES = [];
let CUR_PROF = '';

function loadProfiles(){
  try{
    const o = JSON.parse(localStorage.getItem(PROF_KEY)||'[]');
    if(Array.isArray(o)) PROFILES = o.filter(p=>p && p.bd);
  }catch(e){ PROFILES = []; }
}
function saveProfiles(){
  try{ localStorage.setItem(PROF_KEY, JSON.stringify(PROFILES)); }catch(e){}
}

/* ================= 事项 ================= */
function allEvents(){ return BUILTIN_EVENTS.concat(KB.events||[]); }
function eventById(id){
  const l = allEvents();
  for(let i=0;i<l.length;i++) if(l[i].id===id) return l[i];
  return null;
}

