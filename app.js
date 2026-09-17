/* ============================================================
   PROMPT-FORGE  |  App logic
   ============================================================ */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let lang = 'fa';                       // 'fa' | 'en'
let mode = 'img';                      // 'img' | 'vid' | 'fast'
const sel = {};                       // selected chips/commands
const weights = {};                   // weight per chip text
const custom = {};                    // free-text per anatomy section
const negCustom = new Set();

/* ---------- helpers ---------- */
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const t   = k => I18N[lang][k] || k;

function toast(msg){
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(el._h); el._h = setTimeout(()=>el.classList.remove('show'), 1800);
}

/* ---------- weight syntax ---------- */
function wrap(txt, w){
  if (w === undefined) return txt;
  return `(${txt}:${w})`;
}
function chipSelKey(sec, txt){ return sec + '|' + txt; }

/* ============================================================
   BUILD: anatomy sections
   ============================================================ */
function buildAnatomy(){
  const host = $('#anatomyList'); host.innerHTML = '';
  ANATOMY.forEach((sec, si) => {
    const d = document.createElement('div');
    d.className = 'ana-sec' + (si === 0 ? ' open' : '');
    d.innerHTML = `
      <div class="ana-head"><span>${sec.icon}</span><b>${t('_x')}</b>
        <span class="hint">${esc(sec.hint)}</span></div>
      <div class="ana-body">
        <div class="chips">${sec.chips.map(c=>
          `<span class="chip" data-k="${chipSelKey(sec.id,c)}" data-txt="${esc(c)}">${esc(c)}</span>`).join('')}
        </div>
        <input class="ana-input" data-sec="${sec.id}" placeholder="${esc(sec.placeholders[si % sec.placeholders.length])}">
        <div class="wctrl" style="display:none">
          <span>${t('weight')}:</span>
          <button class="btn small" data-w="-0.1">${t('reduce')}</button>
          <button class="btn small" data-w="0.1">${t('boost')}</button>
          <span class="wval"></span>
        </div>
      </div>`;
    // localized names
    const b = d.querySelector('b'); b.textContent = (lang==='fa'?sec.fa:sec.en);
    d.querySelector('.hint').textContent = esc(sec.hint);
    d.querySelector('.ana-input').placeholder = esc(sec.placeholders[si % sec.placeholders.length]);

    // expand
    d.querySelector('.ana-head').addEventListener('click', e=>{
      if (e.target.closest('button,input,span.chip')) return;
      d.classList.toggle('open');
    });

    // chips
    d.querySelectorAll('.chip').forEach(ch=>{
      ch.addEventListener('click', ()=>{
        const k = ch.dataset.k, txt = ch.dataset.txt;
        if (sel[k]) { delete sel[k]; delete weights[k]; ch.classList.remove('sel'); ch.querySelector('.wtag')?.remove(); }
        else { sel[k] = txt; weights[k] = undefined; ch.classList.add('sel'); }
        updateWeightUI(d, k);
        render();
      });
    });

    // free text
    const inp = d.querySelector('.ana-input');
    inp.addEventListener('input', ()=>{ custom[sec.id] = inp.value.trim(); render(); });

    // weight controls
    const wc = d.querySelector('.wctrl');
    wc.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const k = wc.dataset.k; if (!k || !sel[k]) return;
        let w = weights[k] === undefined ? 1 : weights[k];
        w = Math.round((w + parseFloat(btn.dataset.w)) * 10) / 10;
        w = Math.max(0.2, Math.min(3, w));
        weights[k] = w; updateWeightUI(d, k); render();
      });
    });

    host.appendChild(d);
  });
}

function updateWeightUI(secEl, k){
  const chip = secEl.querySelector(`.chip[data-k="${CSS.escape(k)}"]`);
  const wc = secEl.querySelector('.wctrl');
  if (!sel[k]) { wc.style.display = 'none'; return; }
  wc.style.display = 'flex'; wc.dataset.k = k;
  wc.querySelector('.wval').textContent = (weights[k] === undefined ? '1' : weights[k]) + '×';
  if (chip && !chip.querySelector('.wtag')){
    const s = document.createElement('span'); s.className = 'wtag'; chip.appendChild(s);
  }
  if (chip) chip.querySelector('.wtag').textContent = weights[k] === undefined ? '' : weights[k] + '×';
}

/* ============================================================
   BUILD: shot command groups
   ============================================================ */
function buildShot(){
  const host = $('#shotList'); host.innerHTML = '';
  COMMANDS.forEach(g=>{
    const wrapG = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'label';
    title.textContent = `${g.icon} ${lang==='fa'?g.fa:g.en}`;
    wrapG.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid';

    g.items.forEach(it=>{
      const c = document.createElement('div');
      c.className = 'cmd'; c.dataset.cmd = it.cmd;
      c.innerHTML = `
        <div class="pv ${it.anim}">
          <div class="blot"></div><div class="beam"></div>
          <div class="sun"></div><div class="moon"></div>
          <div class="subj"></div><div class="ring"></div>
          <div class="grid3"></div><div class="grain"></div>
        </div>
        <div class="cmd-top"><b>${it.cmd}</b><span class="ck">◻</span></div>
        <p>${lang==='fa'?esc(it.fa):esc(it.en)}</p>`;
      c.addEventListener('click', ()=>{
        const key = 'shot|' + it.cmd;
        if (sel[key]) { delete sel[key]; c.classList.remove('sel'); c.querySelector('.ck').textContent = '◻'; }
        else { sel[key] = it.cmd; c.classList.add('sel'); c.querySelector('.ck').textContent = '✅'; }
        render();
      });
      grid.appendChild(c);
    });

    wrapG.appendChild(grid);
    host.appendChild(wrapG);
  });
}

/* ============================================================
   RENDER: final prompt
   ============================================================ */
function part(secId, allowWeight=true){
  const out = [];
  Object.keys(sel).forEach(k=>{
    if (!k.startsWith(secId + '|')) return;
    const txt = sel[k];
    out.push(allowWeight ? wrap(txt, weights[k]) : txt);
  });
  if (custom[secId]) out.push(custom[secId]);
  return out;
}

function shotList(){
  return Object.keys(sel).filter(k=>k.startsWith('shot|')).map(k=>sel[k]);
}

function buildPrompt(){
  if (mode === 'img' || mode === 'fast'){
    const parts = [
      ...part('subject'), ...part('medium'), ...part('style'), ...part('artist'),
      ...part('website'), ...part('resolution'), ...part('details'), ...part('color'), ...part('lighting')
    ];
    if (mode === 'fast' && shotList().length) parts.push(shotList().join('  '));
    return parts.filter(Boolean).join(', ');
  }
  // video mode: description + /commands
  const subj = part('subject').join(', ') || 'a cinematic scene';
  const extra = ['medium','style','details','color','lighting']
    .flatMap(s=>part(s,false)).filter(Boolean).join(', ');
  const body = [subj, extra].filter(Boolean).join(', ');
  return (body + '  ' + shotList().join('  ')).trim();
}

function buildNegative(){
  const base = [...NEGATIVE_DEFAULTS];
  if (mode !== 'img') base.push('bad motion', 'flickering', 'distorted video', 'low fps');
  return [...base, ...negCustom].join(', ');
}

function paramsString(){
  if (mode === 'vid') {
    const ar = $('#pAr').value;
    return ar && ar !== '1:1' ? ` --ar ${ar}` : '';
  }
  const s = [];
  const steps = $('#pSteps').value, cfg = $('#pCfg').value;
  const samp = $('#pSampler').value, ar = $('#pAr').value, seed = $('#pSeed').value;
  if (steps) s.push(`Steps: ${steps}`);
  if (cfg)   s.push(`CFG scale: ${cfg}`);
  if (samp)  s.push(`Sampler: ${samp}`);
  if (ar && ar !== '1:1') s.push(`Aspect ratio: ${ar}`);
  if (seed && seed !== '-1') s.push(`Seed: ${seed}`);
  return s.length ? '\n' + s.join(' · ') : '';
}

function render(){
  const p = buildPrompt();
  $('#outMain').textContent = p ? (p + paramsString()) : (lang==='fa' ? 'یه چیپ رو انتخاب کن یا خودت تایپ کن — پرامپت همینجا ساخته میشه' : 'Pick a chip or type — the prompt builds here');
  $('#outMain').style.color = p ? 'var(--txt)' : 'var(--mut)';
  $('#outNeg').textContent = buildNegative();
}

/* ============================================================
   MODE / TABS / LANG
   ============================================================ */
function setMode(m){
  mode = m;
  $$('.modebtn').forEach(b=>b.classList.remove('on'));
  ({img:$('#modeImg'), vid:$('#modeVid'), fast:$('#modeFast')})[m].classList.add('on');
  render();
}
$('#modeImg').addEventListener('click', ()=>setMode('img'));
$('#modeVid').addEventListener('click', ()=>setMode('vid'));
$('#modeFast').addEventListener('click', ()=>setMode('fast'));

$('#tabAnatomy').addEventListener('click', ()=>{
  $('#pageAnatomy').style.display='block'; $('#pageShot').style.display='none';
  $('#tabAnatomy').classList.add('on'); $('#tabShot').classList.remove('on');
});
$('#tabShot').addEventListener('click', ()=>{
  $('#pageAnatomy').style.display='none'; $('#pageShot').style.display='block';
  $('#tabShot').classList.add('on'); $('#tabAnatomy').classList.remove('on');
});

function applyLang(){
  document.documentElement.lang = lang; document.body.className = lang==='fa' ? 'rtl' : 'ltr';
  $$('[data-i]').forEach(el=>{ if (el.dataset.i !== 'sub') el.textContent = t(el.dataset.i); });
  $('#btnLang').textContent = t('switchLang');
  buildAnatomy(); buildShot(); render();
}
$('#btnLang').addEventListener('click', ()=>{ lang = lang==='fa' ? 'en' : 'fa'; applyLang(); });

/* ============================================================
   COPY / SAVE / CLEAR / HISTORY  (localStorage)
   ============================================================ */
const HKEY = 'promptforge_history_v1';
function loadHist(){
  try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch(e){ return []; }
}
function saveHist(h){ localStorage.setItem(HKEY, JSON.stringify(h.slice(0,50))); }

async function copyText(txt){
  try { await navigator.clipboard.writeText(txt); return true; }
  catch(e){ /* fallback */
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch(_){}
    ta.remove(); return ok;
  }
}

$('#btnCopy').addEventListener('click', async ()=>{
  const txt = $('#outMain').textContent;
  if (!txt || txt.startsWith('Pick') || txt.startsWith('یه چیپ')) { toast(lang==='fa'?'اول چیزی انتخاب کن!':'Pick something first!'); return; }
  const ok = await copyText(txt + '\n' + $('#outNeg').textContent);
  toast(ok ? t('copied') : '❌');
});

$('#btnSave').addEventListener('click', ()=>{
  const txt = $('#outMain').textContent;
  if (!txt) return;
  const h = loadHist();
  h.unshift({ txt, neg: $('#outNeg').textContent, ts: Date.now() });
  saveHist(h); renderHist(); toast('💾');
});

$('#btnClear').addEventListener('click', ()=>{
  Object.keys(sel).forEach(k=>delete sel[k]);
  Object.keys(weights).forEach(k=>delete weights[k]);
  Object.keys(custom).forEach(k=>delete custom[k]);
  $$('.chip.sel').forEach(c=>c.classList.remove('sel'));
  $$('.cmd.sel').forEach(c=>{c.classList.remove('sel'); c.querySelector('.ck').textContent='◻';});
  $$('.ana-input').forEach(i=>i.value='');
  render();
});

function renderHist(){
  const h = loadHist(), host = $('#histList');
  if (!h.length){ host.innerHTML = `<div class="empty">${t('historyEmpty')}</div>`; return; }
  host.innerHTML = '';
  h.forEach((it, i)=>{
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
$('#btnHistClear').addEventListener('click', ()=>{
  saveHist([]); renderHist(); toast('🗑');
});

/* ============================================================
   SURPRISE ME
   ============================================================ */
$('#btnSurprise').addEventListener('click', ()=>{
  $('#btnClear').click();
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const n1 = 1 + Math.floor(Math.random()*2), n2 = 1 + Math.floor(Math.random()*2);
  const used = new Set();
  const take = (sec, n) => {
    let added = 0;
    while (added < n){
      const c = pick(sec.chips); const k = chipSelKey(sec.id, c);
      if (used.has(k)) continue;
      used.add(k); sel[k] = c; added++;
    }
  };
  take(ANATOMY[0], n1); take(ANATOMY[1], 1); take(ANATOMY[2], 1);
  take(ANATOMY[5], n2); take(ANATOMY[6], 1); take(ANATOMY[8], 1);
  // rebuild UI to reflect selections
  buildAnatomy();
  const g = pick(COMMANDS);
  const it = pick(g.items);
  sel['shot|'+it.cmd] = it.cmd;
  buildShot();
  render();
  toast('🎲 ' + it.cmd);
});

/* ---------- params ---------- */
$('#pSampler').innerHTML = SAMPLERS.map(s=>`<option>${s}</option>`).join('');
$('#pAr').innerHTML = ASPECTS.map(a=>`<option>${a}</option>`).join('');
$('#pAr').value = '1:1';
$('#pSteps').addEventListener('input', render);
$('#pCfg').addEventListener('input', render);
$('#pSampler').addEventListener('change', render);
$('#pAr').addEventListener('change', render);
$('#pSeed').addEventListener('input', render);
$('#btnSeed').addEventListener('click', ()=>{
  $('#pSeed').value = Math.floor(Math.random()*1000000); render();
});

/* ---------- init ---------- */
applyLang();
renderHist();
render();
