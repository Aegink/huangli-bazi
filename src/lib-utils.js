/* @file lib-utils.js — 工具函数与主题：转义、日期、均时差、真太阳时、下载、明暗主题 */

/* ================= 工具函数 ================= */
const pad = n => (n<10?'0':'')+n;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function esc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function uid(p){
  return (p||'r') + Date.now().toString(36) + Math.floor(Math.random()*1000).toString(36);
}
function dayOfYear(y,m,d){
  const t = Date.UTC(y,m-1,d), t0 = Date.UTC(y,0,0);
  return Math.floor((t-t0)/86400000);
}
/* 均时差（分钟），Meeus 常用近似式，误差约半分钟 */
function eotMinutes(y,m,d){
  const n = dayOfYear(y,m,d);
  const B = 2*Math.PI*(n-81)/364;
  return 9.87*Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B);
}
/* 按经度与均时差把北京时间换算成当地真太阳时 */
function toTrueSolar(y,m,d,hh,mi,lng){
  const eot = eotMinutes(y,m,d);
  const offsetMin = (lng-120)*4 + eot;
  const t = Date.UTC(y,m-1,d,hh,mi,0) + offsetMin*60000;
  const u = new Date(t);
  return {
    y:u.getUTCFullYear(), m:u.getUTCMonth()+1, d:u.getUTCDate(),
    h:u.getUTCHours(), mi:u.getUTCMinutes(), offsetMin:offsetMin
  };
}
function solarOf(y,m,d,hh,mi){
  return Solar.fromYmdHms(y,m,d,hh||0,mi||0,0);
}
function ageNow(by,bm,bd){
  const now = new Date();
  let a = now.getFullYear()-by;
  if(now.getMonth()+1<bm || (now.getMonth()+1===bm && now.getDate()<bd)) a--;
  return Math.max(0,a);
}
function downloadText(name, text, mime){
  const blob = new Blob([text], {type:(mime||'text/plain')+';charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1200);
}

/* ================= 主题 ================= */
const THEME_KEY = 'mybazi.theme';
function themeMode(){
  try{ return localStorage.getItem(THEME_KEY) || 'auto'; }catch(e){ return 'auto'; }
}
function applyTheme(mode){
  const mq = (window.matchMedia) ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const dark = (mode==='dark') || (mode==='auto' && mq && mq.matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const btn = document.getElementById('themeBtn');
  if(btn) btn.textContent = (mode==='auto') ? ('跟随系统 · '+(dark?'深':'浅')) : (mode==='dark'?'深色':'浅色');
  try{ localStorage.setItem(THEME_KEY, mode); }catch(e){}
}
function cycleTheme(){
  const cur = themeMode();
  const next = (cur==='auto') ? 'dark' : (cur==='dark' ? 'light' : 'auto');
  applyTheme(next);
}

