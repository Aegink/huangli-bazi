/* @file ui-shell.js — 页面外壳：下拉初始化、事项说明、视图切换 */

/* ================= 初始化 ================= */
function initSelects(){
  const ev = document.getElementById('event');
  ev.innerHTML = '';
  BUILTIN_EVENTS.forEach(e=>{
    const o = document.createElement('option');
    o.value = e.id; o.textContent = e.k; ev.appendChild(o);
  });
  if((KB.events||[]).length){
    const g = document.createElement('optgroup');
    g.label = '我加的事项';
    KB.events.forEach(e=>{
      const o = document.createElement('option');
      o.value = e.id; o.textContent = e.name || e.k; g.appendChild(o);
    });
    ev.appendChild(g);
  }

  const z = document.getElementById('zodiac');
  z.innerHTML = '';
  const none = document.createElement('option');
  none.value = ''; none.textContent = '不填'; z.appendChild(none);
  ZODIACS.forEach(v=>{
    const o = document.createElement('option'); o.value = v; o.textContent = v; z.appendChild(o);
  });

  const c = document.getElementById('city');
  c.innerHTML = '';
  CITIES.forEach(([name],i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = name; c.appendChild(o);
  });

  /* 规则自测用的两个下拉 */
  const ste = document.getElementById('stEvent');
  if(ste){
    const keep = ste.value;
    ste.innerHTML = '';
    allEvents().forEach(e=>{
      const o = document.createElement('option');
      o.value = e.id; o.textContent = e.k || e.name; ste.appendChild(o);
    });
    if(keep) ste.value = keep;
  }
  const stz = document.getElementById('stZodiac');
  if(stz){
    const keep2 = stz.value;
    stz.innerHTML = '';
    const n2 = document.createElement('option');
    n2.value = ''; n2.textContent = '不看生肖'; stz.appendChild(n2);
    ZODIACS.forEach(v=>{
      const o = document.createElement('option'); o.value=v; o.textContent=v; stz.appendChild(o);
    });
    stz.value = keep2 || '';
  }
  const std = document.getElementById('stDate');
  if(std && !std.value){
    const t = new Date();
    std.value = t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());
  }

  const today = new Date();
  document.getElementById('fromDate').value = today.getFullYear()+'-'+pad(today.getMonth()+1)+'-'+pad(today.getDate());
  if(!document.getElementById('birthDate').value) document.getElementById('birthDate').value = '1995-06-15';

  ev.addEventListener('change', showEvNote);
  showEvNote();
}

function showEvNote(){
  const e = eventById(document.getElementById('event').value);
  const el = document.getElementById('evNote');
  el.textContent = e ? (e.note || ('黄历对应「'+(e.words||[]).join('」「')+'」')) : '';
}

/* ================= 视图切换 ================= */
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
    document.getElementById('view-'+btn.dataset.view).classList.add('on');
    const v = btn.dataset.view;
    if(v==='today') renderToday();
    if(v==='kb') renderKb();
    if(v==='chart') renderChips();
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

