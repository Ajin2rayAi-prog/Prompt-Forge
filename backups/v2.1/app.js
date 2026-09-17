/* ============================================================
   PROMPT-FORGE v2  |  Wizard engine + Persian summary
   ============================================================ */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const t = k => I18N[lang][k] || k;

let lang = 'fa';
let mode = 'img';                          // img | vid | fast
let stepIdx = 0;
let activeGroup = 0;                       // shot group tab

/* per-section state: array of {en, fa} + weight */
const sel = {};        // secId -> [ {en, fa, w} ]
const customTxt = {};   // secId -> string
const selCmds = new Set();

/* ---------- step plan ---------- */
function steps(){
  const s = [ {type:'mode'} ];
  ANATOMY.forEach(sec => s.push({type:'anatomy', sec}));
  if (mode !== 'img') s.push({type:'shots'});
  s.push({type:'params'});
  s.push({type:'final'});
  return s;
}
const cur = () => steps()[stepIdx];

/* ---------- selection helpers ---------- */
function getSec(id){ return sel[id] || []; }
function toggleChip(secId, chip){
  const arr = sel[secId] || (sel[secId] = []);
  const i = arr.findIndex(x => x.en === chip.en);
  if (i >= 0) arr.splice(i,1); else arr.push({...chip, w:1});
}
function chipOn(secId, en){ return (sel[secId]||[]).some(x=>x.en===en); }

/* ============================================================
   RENDER each step type
   ============================================================ */
function render(){
  const st = cur();
  const scr = $('#screen');
  updateProg();

  if (st.type === 'mode')      scr.innerHTML = viewMode();
  else if (st.type === 'anatomy') scr.innerHTML = viewAnatomy(st.sec);
  else if (st.type === 'shots')   scr.innerHTML = viewShots();
  else if (st.type === 'params')  scr.innerHTML = viewParams();
  else                            scr.innerHTML = viewFinal();

  bind();
  updateNav();
}

function viewMode(){
  const cards = [
    {k:'img',  ic:'🖼️', fa:'تصویر',  en:'Image',  s:{fa:'برای Midjourney، Stable Diffusion، DALL-E', en:'For Midjourney, Stable Diffusion, DALL-E'}},
    {k:'vid',  ic:'🎬', fa:'ویدیو',  en:'Video',  s:{fa:'برای Runway، Pika، Kling، Luma', en:'For Runway, Pika, Kling, Luma'}},
    {k:'fast', ic:'⚡', fa:'ترکیبی', en:'Hybrid', s:{fa:'تصویر + دستورات ویدیویی، همه با هم', en:'Image prompt + video commands together'}},
  ].map(c=>`<div class="mode ${mode===c.k?'sel':''}" data-m="${c.k}">
      <div class="ic">${c.ic}</div><b>${lang==='fa'?c.fa:c.en}</b>
      <span>${lang==='fa'?c.s.fa:c.s.en}</span></div>`).join('');
  return `<div class="card-head"><div class="q">${t('modeQ')}</div></div>
    <div class="card-body"><div class="modes">${cards}</div></div>`;
}

function viewAnatomy(sec){
  const q = lang==='fa' ? sec.question.fa : sec.question.en;
  const h = lang==='fa' ? sec.hint.fa : sec.hint.en;
  const chips = sec.chips.map(c=>{
    const on = chipOn(sec.id, c.en);
    const it = getSec(sec.id).find(x=>x.en===c.en);
    const w = it && it.w !== 1 ? `<span class="wtag">${it.w}×</span>` : '';
    return `<span class="chip ${on?'sel':''}" data-sec="${sec.id}" data-en="${esc(c.en)}"
      data-fa="${esc(c.fa)}">${lang==='fa'?esc(c.fa):esc(c.en)}${w}</span>`;
  }).join('');
  const cv = customTxt[sec.id] || '';
  const selCount = getSec(sec.id).length;
  return `<div class="card-head">
      <div class="q">${sec.icon} ${q}</div>
      <div class="h">${h}${selCount?` · <b style="color:var(--acc2)">${selCount} ${t('selected')}</b>`:''}</div>
    </div>
    <div class="card-body">
      <div class="chips" data-sec="${sec.id}">${chips}</div>
      <div class="inputwrap">
        <input class="ana-input" id="customIn" data-sec="${sec.id}" placeholder="${t('customPh')}" value="${esc(cv)}">
        <button class="btn small" id="customAdd" data-sec="${sec.id}">＋</button>
      </div>
    </div>`;
}

function viewShots(){
  const g = COMMANDS[activeGroup];
  const tabs = COMMANDS.map((gg,i)=>
    `<span class="gtab ${i===activeGroup?'on':''}" data-g="${i}">${gg.icon} ${lang==='fa'?gg.fa:gg.en}</span>`).join('');
  const items = g.items.map(it=>{
    const on = selCmds.has(it.cmd);
    return `<div class="cmd ${on?'sel':''}" data-c="${it.cmd}">
      <div class="pv ${it.anim}"><div class="blot"></div><div class="beam"></div>
        <div class="sun"></div><div class="moon"></div><div class="subj"></div>
        <div class="ring"></div><div class="grid3"></div><div class="grain"></div></div>
      <span class="ck">${on?'✅':'◻'}</span>
      <b>${it.cmd}</b><p>${lang==='fa'?esc(it.fa):esc(it.en)}</p></div>`;
  }).join('');
  return `<div class="card-head">
      <div class="q">🎬 ${t('shotQ')}</div>
      <div class="h">${t('shotHint')}</div></div>
    <div class="card-body">
      <div class="gtabs">${tabs}</div>
      <div class="grid">${items}</div>
    </div>`;
}

function viewParams(){
  const isVid = mode === 'vid';
  const fields = isVid
    ? `<div><label>${t('ar')}</label><select id="pAr">${ASPECTS.map(a=>`<option>${a}</option>`).join('')}</select></div>
       <div><label>${t('seed')}</label><input id="pSeed" type="number" value="-1"></div>`
    : `<div><label>${t('steps')}</label><input id="pSteps" type="number" value="30" min="1" max="150"></div>
       <div><label>${t('cfg')}</label><input id="pCfg" type="number" value="7" min="1" max="30" step="0.5"></div>
       <div><label>${t('sampler')}</label><select id="pSampler">${SAMPLERS.map(s=>`<option>${s}</option>`).join('')}</select></div>
       <div><label>${t('ar')}</label><select id="pAr">${ASPECTS.map(a=>`<option>${a}</option>`).join('')}</select></div>
       <div><label>${t('seed')}</label><input id="pSeed" type="number" value="-1"></div>`;
  return `<div class="card-head"><div class="q">⚙️ ${t('paramsQ')}</div></div>
    <div class="card-body"><div class="pgrid">${fields}</div></div>`;
}

function viewFinal(){
  const prompt = buildPrompt();
  const neg = buildNegative();
  const sum = persianSummary();
  return `<div class="card-head"><div class="q">${t('finalTitle')}</div></div>
    <div class="card-body"><div class="final">
      <div class="box">
        <div class="lbl">${t('summaryTitle')}</div>
        <div class="summary">${sum}</div>
      </div>
      <div class="box">
        <div class="lbl">📝 Prompt</div>
        <div class="prompt" id="outPrompt">${esc(prompt)}</div>
      </div>
      <div class="box negbox">
        <div class="lbl">🚫 ${t('negativeTitle')}</div>
        <div class="prompt" id="outNeg">${esc(neg)}</div>
      </div>
      <div class="btnrow">
        <button class="btn primary" id="btnCopy">📋 ${t('copy')}</button>
        <button class="btn" id="btnCopySum">${t('copySummary')}</button>
        <button class="btn" id="btnSave">${t('save')}</button>
      </div>
      <div class="btnrow">
        <button class="btn" id="btnRestart">${t('restart')}</button>
        <button class="btn" id="btnSurprise2">🎲 ${t('surprise')}</button>
      </div>
    </div></div>`;
}

/* ============================================================
   PROMPT BUILDING
   ============================================================ */
function part(secId, weighted){
  const arr = getSec(secId);
  const out = arr.map(x => weighted && x.w !== 1 ? `(${x.en}:${x.w})` : x.en);
  if (customTxt[secId]) out.push(customTxt[secId]);
  return out;
}
function cmds(){ return [...selCmds]; }

function buildPrompt(){
  if (mode === 'img' || mode === 'fast'){
    const parts = [
      ...part('subject',1), ...part('medium',1), ...part('style',1), ...part('artist',1),
      ...part('website',1), ...part('resolution',1), ...part('details',1),
      ...part('color',1), ...part('lighting',1)
    ];
    if (mode === 'fast' && cmds().length) parts.push(cmds().join('  '));
    return parts.filter(Boolean).join(', ');
  }
  const subj = part('subject',0).join(', ') || 'a cinematic scene';
  const extra = ['medium','style','details','color','lighting'].flatMap(s=>part(s,0)).filter(Boolean).join(', ');
  return [subj, extra].filter(Boolean).join(', ') + '  ' + cmds().join('  ');
}

function buildNegative(){
  const base = [...NEGATIVE_DEFAULTS];
  if (mode !== 'img') base.push('bad motion','flickering','distorted video','low fps');
  return base.join(', ');
}

/* ============================================================
   PERSIAN SUMMARY — "این پرامپت چی میگه؟"
   ============================================================ */
function persianSummary(){
  if (lang === 'en'){
    const parts = [];
    const s = getSec('subject'); if (s.length) parts.push(`an image of <b>${esc(s.map(x=>x.en).join(' and '))}</b>`);
    const m = getSec('medium'); if (m.length) parts.push(`as a <b>${esc(m.map(x=>x.en).join(' / '))}</b>`);
    const st = getSec('style'); if (st.length) parts.push(`in a <b>${esc(st.map(x=>x.en).join(' / '))}</b> style`);
    const l = getSec('lighting'); if (l.length) parts.push(`with <b>${esc(l.map(x=>x.en).join(' + '))}</b>`);
    const c = getSec('color'); if (c.length) parts.push(`<b>${esc(c.map(x=>x.en).join(' + '))}</b> colors`);
    const r = getSec('resolution'); if (r.length) parts.push(`at <b>${esc(r.map(x=>x.en).join(' / '))}</b> quality`);
    if (cmds().length) parts.push(`camera moves: <b>${esc(cmds().join(' '))}</b>`);
    return parts.length ? parts.join(', ') + '.' : '—';
  }

  const have = id => getSec(id).length > 0;
  const L = id => getSec(id).map(x => `<b>${esc(x.fa)}</b>`).join(' و ');
  const parts = [];

  if (have('subject')) parts.push(`تصویری از ${L('subject')}`);
  if (customTxt.subject) parts.push(`با موضوعِ <b>${esc(customTxt.subject)}</b>`);
  if (have('medium')) parts.push(`به‌صورت ${L('medium')}`);
  if (have('style')) parts.push(`در سبک ${L('style')}`);
  if (have('artist')) parts.push(`به سبک هنریِ ${L('artist')}`);
  if (have('details')) parts.push(`با جزئیاتِ ${L('details')}`);
  if (have('color')) parts.push(`با رنگ‌بندی ${L('color')}`);
  if (have('lighting')) parts.push(`با نورپردازی ${L('lighting')}`);
  if (have('resolution')) parts.push(`در کیفیت ${L('resolution')}`);
  if (have('website')) parts.push(`با الهام از ${L('website')}`);

  let out = parts.length ? parts.join('، ') + ' ساخته میشه.' : 'هنوز چیزی انتخاب نشده!';

  if (cmds().length){
    const cf = cmds().map(c=>{
      const it = COMMANDS.flatMap(g=>g.items).find(i=>i.cmd===c);
      return `<b>${c}</b> (${esc(it? it.fa : '')})`;
    }).join('، ');
    out += `<br><br>📸 دستورات دوربین هم این‌ها هستن: ${cf}.`;
  }
  return out;
}

/* ============================================================
   NAV / PROGRESS
   ============================================================ */
function updateProg(){
  const list = steps(), n = list.length;
  $('#progFill').style.width = (n===1 ? 100 : (stepIdx/(n-1))*100) + '%';
  $('#progLabel').textContent = `${t('step')} ${stepIdx+1} ${t('of')} ${n}`;
}
function updateNav(){
  const list = steps();
  $('#btnBack').disabled = stepIdx === 0;
  const nx = $('#btnNext');
  const last = stepIdx === list.length - 1;
  nx.textContent = last ? t('finish') : t('next');
  if (last){ nx.classList.remove('primary'); nx.classList.add('primary'); }
  $('#navMid').innerHTML = '';
}

function next(){
  const list = steps();
  if (stepIdx < list.length - 1){ stepIdx++; render(); }
}
function back(){ if (stepIdx > 0){ stepIdx--; render(); } }

/* ============================================================
   EVENT BINDING
   ============================================================ */
function bind(){
  /* mode cards */
  $$('.mode').forEach(m=>m.addEventListener('click', ()=>{
    mode = m.dataset.m;
    stepIdx = 0;             // rebuild step plan (shots step may appear)
    render();
  }));

  /* anatomy chips */
  $$('.chip[data-sec]').forEach(ch=>ch.addEventListener('click', ()=>{
    toggleChip(ch.dataset.sec, {en:ch.dataset.en, fa:ch.dataset.fa});
    render();
    keepFocus(ch.dataset.sec);
  }));

  /* custom text */
  const ci = $('#customIn');
  if (ci){
    ci.addEventListener('keydown', e=>{
      if (e.key === 'Enter'){ e.preventDefault(); addCustom(ci.dataset.sec); }
    });
  }
  const ca = $('#customAdd');
  if (ca) ca.addEventListener('click', ()=>addCustom(ca.dataset.sec));

  /* shot group tabs + commands */
  $$('.gtab').forEach(tb=>tb.addEventListener('click', ()=>{ activeGroup = +tb.dataset.g; render(); }));
  $$('.cmd').forEach(c=>c.addEventListener('click', ()=>{
    const k = c.dataset.c;
    selCmds.has(k) ? selCmds.delete(k) : selCmds.add(k);
    render();
  }));

  /* final actions */
  const cp = $('#btnCopy');
  if (cp) cp.addEventListener('click', async ()=>{
    await copyText($('#outPrompt').textContent + '\n' + $('#outNeg').textContent);
    toast(t('copied'));
  });
  const cs = $('#btnCopySum');
  if (cs) cs.addEventListener('click', async ()=>{
    await copyText($('#screen .summary').textContent);
    toast(t('copied'));
  });
  const sv = $('#btnSave');
  if (sv) sv.addEventListener('click', ()=>{
    const h = loadHist();
    h.unshift({ txt: $('#outPrompt').textContent, neg: $('#outNeg').textContent, sum: $('#screen .summary').textContent, ts: Date.now() });
    saveHist(h); renderHist(); toast('💾');
  });
  const rs = $('#btnRestart');
  if (rs) rs.addEventListener('click', restart);
  const sp = $('#btnSurprise2');
  if (sp) sp.addEventListener('click', ()=>{ surprise(); render(); });
}

function addCustom(secId){
  const v = ($('#customIn')?.value || '').trim();
  if (!v) return;
  const arr = sel[secId] || (sel[secId] = []);
  if (!arr.some(x => x.en === v)) arr.push({ en:v, fa:v, w:1 });
  render();
}
function keepFocus(secId){
  const inp = $('#customIn');
  if (inp && inp.dataset.sec === secId) inp.focus();
}

/* ============================================================
   CLIPBOARD / HISTORY
   ============================================================ */
const HKEY = 'promptforge_history_v2';
function loadHist(){ try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch(e){ return []; } }
function saveHist(h){ localStorage.setItem(HKEY, JSON.stringify(h.slice(0,50))); }

async function copyText(txt){
  try { await navigator.clipboard.writeText(txt); return true; }
  catch(e){
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch(_){}
    ta.remove(); return ok;
  }
}
function renderHist(){
  const h = loadHist(), host = $('#histList');
  if (!h.length){ host.innerHTML = `<div class="empty">${t('historyEmpty')}</div>`; return; }
  host.innerHTML = '';
  h.forEach((it,i)=>{
    const d = document.createElement('div'); d.className = 'hitem';
    const dt = new Date(it.ts);
    const stamp = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    d.innerHTML = `<div class="txt">${esc(it.txt)}</div>
      <div class="meta"><time>${stamp}</time>
      <span><button class="btn small" data-c="${i}">${t('copyPrompt')}</button>
      <button class="btn small danger" data-d="${i}">${t('delHistory')}</button></span></div>`;
    d.querySelector('[data-c]').addEventListener('click', async ()=>{
      await copyText(it.txt + '\n' + (it.neg||'')); toast(t('copied'));
    });
    d.querySelector('[data-d]').addEventListener('click', ()=>{
      const arr = loadHist(); arr.splice(i,1); saveHist(arr); renderHist();
    });
    host.appendChild(d);
  });
}

function restart(){
  Object.keys(sel).forEach(k=>delete sel[k]);
  Object.keys(customTxt).forEach(k=>delete customTxt[k]);
  selCmds.clear();
  stepIdx = 0; activeGroup = 0; mode = 'img';
  render();
}

/* ---------- surprise ---------- */
function surprise(){
  restart();
  const pick = a => a[Math.floor(Math.random()*a.length)];
  mode = pick(['img','vid','fast']);
  const take = (sec, n) => {
    const used = new Set();
    while (used.size < Math.min(n, sec.chips.length)) used.add(pick(sec.chips));
    sel[sec.id] = [...used].map(c=>({...c, w:1}));
  };
  take(ANATOMY[0],2); take(ANATOMY[1],1); take(ANATOMY[2],1);
  take(ANATOMY[5],2); take(ANATOMY[6],1); take(ANATOMY[8],1);
  if (mode !== 'img'){
    const g = pick(COMMANDS);
    [pick(g.items), pick(g.items)].forEach(i=>selCmds.add(i.cmd));
  }
  stepIdx = steps().length - 1;   // jump to final
}

/* ============================================================
   INIT
   ============================================================ */
$('#btnNext').addEventListener('click', next);
$('#btnBack').addEventListener('click', back);
document.addEventListener('keydown', e=>{
  if (e.key === 'ArrowLeft' && lang==='fa') next();
  if (e.key === 'ArrowRight' && lang==='fa') back();
  if (e.key === 'ArrowRight' && lang==='en') next();
  if (e.key === 'ArrowLeft' && lang==='en') back();
});

$('#btnLang').addEventListener('click', ()=>{ lang = lang==='fa' ? 'en' : 'fa'; applyLang(); });
function applyLang(){
  document.documentElement.lang = lang;
  document.body.className = lang==='fa' ? 'rtl' : 'ltr';
  $('#btnLang').textContent = t('switchLang');
  $$('[data-i]').forEach(el=>{
    const k = el.dataset.i;
    if (el.id === 'btnBack') el.textContent = t('back');
    else if (el.id === 'btnNext') el.textContent = t('next');
    else el.textContent = t(k);
  });
  render();
}
$('#btnHistClear').addEventListener('click', ()=>{ saveHist([]); renderHist(); toast('🗑'); });

/* history drawer toggle */
let drawerOpen = false;
function setDrawer(on){
  drawerOpen = on;
  $('#drawer').classList.toggle('open', on);
}
$('#drawerClose').addEventListener('click', ()=>setDrawer(false));
$('#progLabel').addEventListener('click', ()=>{ renderHist(); setDrawer(!drawerOpen); });

function toast(msg){
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(el._h); el._h = setTimeout(()=>el.classList.remove('show'), 1800);
}

applyLang();
renderHist();
render();
