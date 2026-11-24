// Gemeinsame Bausteine: Töne, Meldungen, Stations-Rahmen, Speicher
import { esc } from './draw.js';

// ---------- Töne (klein, ohne Dateien) ----------
let ac = null;
export function sfx(kind){
  try{
    if (store.muted) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime; const o = ac.createOscillator(); const g = ac.createGain(); o.connect(g); g.connect(ac.destination);
    const set = (type, f1, f2, dur, vol = .12) => { o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.start(t); o.stop(t + dur + .02); };
    if (kind === 'tick') set('sine', 880, 1200, .07, .06);
    else if (kind === 'click') set('square', 300, 200, .05, .05);
    else if (kind === 'ok') { set('sine', 660, 1320, .25, .12); }
    else if (kind === 'no') set('sawtooth', 220, 140, .22, .07);
    else if (kind === 'buzz') set('sawtooth', 110, 90, .3, .1);
    else if (kind === 'win') { set('triangle', 523, 1046, .5, .14); }
  }catch(e){}
}

// ---------- Meldung ----------
let toastTimer = null;
export function toast(msg, kind = 'ok', ms = 2600){
  let el = document.getElementById('toast');
  if (!el){ el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.className = 'toast show ' + kind; el.innerHTML = msg;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className = 'toast ' + kind, ms);
}

// ---------- Speicher ----------
export const STATIONS = [
  { id:'p1', nr:'P1', name:'Der Stromkreis', col:1 },
  { id:'p2', nr:'P2', name:'Leiter und Nichtleiter', col:1 },
  { id:'p3', nr:'P3', name:'Der Schalter', col:1 },
  { id:'p4', nr:'P4', name:'Der Kurzschluss', col:1 },
  { id:'p5', nr:'P5', name:'Serienschaltung', col:1 },
  { id:'p6', nr:'P6', name:'Parallelschaltung', col:1 },
  { id:'ab3', nr:'AB 3', name:'Stromkreis-Detektiv', sub:'Wie funktioniert der Heisse Draht?', col:2 },
  { id:'ab4', nr:'AB 4', name:'Fehler-Detektiv', sub:'Warum leuchtet das Lämpchen nicht?', col:2 },
  { id:'wort', nr:'', name:'Wortkarten', sub:'die Batterie · das Kabel · leiten …', col:2 },
  { id:'hd', nr:'', name:'Draht-Spiel', sub:'Fahre mit dem Finger – nicht berühren!', col:3 },
  { id:'sr', nr:'', name:'Schalter-Rätsel', sub:'Kippe die Schalter, bis alles leuchtet.', col:3 },
];
const NEEDS = { p2:'p1', p3:'p2', p4:'p3', p5:'p4', p6:'p4', ab3:'p2', ab4:'p3', sr:'p3' };

export const store = {
  mode: null,          // 'code' | 'simple'
  token: null, name: '', klasse: '', cls: null,
  s: fresh(), muted: false,
  saveTimer: null, onSaved: null,
};
function fresh(){ return { v:1, st:{}, funken:0, data:{} }; }

export function loadLocal(){
  if (store.vorschau){ store.s = fresh(); return; } // Eltern-Vorschau: nichts aus dem Browser laden
  try{ const raw = localStorage.getItem(localKey()); if (raw) store.s = Object.assign(fresh(), JSON.parse(raw)); else store.s = fresh(); }catch(e){ store.s = fresh(); }
}
const localKey = () => 'lw-state-' + (store.mode === 'code' ? (store.name || 'kind') : 'einfach');

export function save(){
  if (store.vorschau) return; // Eltern-Vorschau: nichts speichern
  try{ localStorage.setItem(localKey(), JSON.stringify(store.s)); }catch(e){}
  if (store.mode !== 'code') return;
  clearTimeout(store.saveTimer);
  store.saveTimer = setTimeout(async () => {
    try{ await api('save', { state: store.s }); }catch(e){ /* nächster Versuch beim nächsten Speichern */ }
  }, 1200);
}
export function stationState(id){ return store.s.st[id] || (store.s.st[id] = { done:false, stars:0, steps:{} }); }
export function step(id, key, funken = 1){
  const s = stationState(id); if (s.steps[key]) return false;
  s.steps[key] = Date.now(); s.started = s.started || Date.now(); store.s.funken += funken; save(); updateFunken(); return true;
}
export function finish(id, stars = 3, extra = 5){
  const s = stationState(id); const first = !s.done;
  s.done = true; s.stars = Math.max(s.stars || 0, stars); s.t = Date.now();
  if (first) store.s.funken += extra;
  save(); updateFunken(); return first;
}
export function isDone(id){ return !!(store.s.st[id] && store.s.st[id].done); }
export function isOpen(id){
  if (store.mode === 'simple') return true;
  if (store.cls && store.cls.settings && store.cls.settings.allOpen) return true;
  if ((id === 'hd' || id === 'sr') && store.cls && store.cls.settings && store.cls.settings.gamesOn === false) return false;
  const need = NEEDS[id]; return !need || isDone(need);
}
export function nextStation(){ return STATIONS.find(s => s.col === 1 && !isDone(s.id) && isOpen(s.id)); }
export function updateFunken(){ document.querySelectorAll('.funken-n').forEach(el => el.textContent = store.s.funken); }

export async function api(a, data = {}){
  const r = await fetch('/api/api', { method:'POST', headers:{ 'Content-Type':'application/json', ...(store.token ? { Authorization:'Bearer ' + store.token } : {}) }, body: JSON.stringify({ a, ...data }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok){ const e = new Error(j.error || 'Fehler'); e.status = r.status; throw e; }
  return j;
}

// ---------- Rahmen einer Station ----------
export function shell(root, { eyebrow, title, back = '#/labor', side = true, extraPills = '' }){
  root.innerHTML = `<div class="screen">
   <header class="top"><a class="back" href="${back}" aria-label="zurück">‹</a><div><div class="eyebrow">${esc(eyebrow)}</div><div class="h1">${esc(title)}</div></div><div class="spacer"></div>${extraPills}<div class="pill"><span class="star">★</span> <span class="funken-n">${store.s.funken}</span></div></header>
   <div class="main"><div class="stage"></div>${side ? `<aside class="side"><h2 class="side-title">Dein Auftrag</h2><div class="tasks"></div><div class="hints"></div><div class="spacer"></div><div class="btns"></div></aside>` : ''}</div></div>`;
  const q = s => root.querySelector(s);
  const ui = {
    stage: q('.stage'), side: q('.side'),
    title(t){ q('.side-title').textContent = t; },
    tasks(list){ // list: [{text, done, now}]
      q('.tasks').innerHTML = list.map((t, i) => `<div class="task ${t.done ? 'done' : ''} ${t.now ? 'now' : ''}"><div class="c">${t.done ? '✓' : (i + 1)}</div><div>${t.text}</div></div>`).join('');
    },
    hint(html, kind = ''){ q('.hints').innerHTML = html ? `<div class="hint ${kind}">${html}</div>` : ''; },
    buttons(list){ // [{label, fn, primary, id}]
      const b = q('.btns'); b.innerHTML = list.map((x, i) => `<button class="btn ${x.primary ? '' : 'ghost'}" data-i="${i}" ${x.disabled ? 'disabled' : ''}>${x.label}</button>`).join('');
      b.querySelectorAll('button').forEach(el => el.onclick = () => list[+el.dataset.i].fn());
    },
  };
  return ui;
}

/** Kleiner Fortschritts-Ablauf für Stationen mit Aufgaben: zeigt Liste, ruft check() nach jeder Änderung */
export function tasksRunner(ui, id, defs){
  // defs: [{key, text}] — erledigt, wenn stationState(id).steps[key]
  return function draw(){
    const s = stationState(id); let nowSet = false;
    ui.tasks(defs.map(d => { const done = !!s.steps[d.key]; const now = !done && !nowSet; if (now) nowSet = true; return { text: d.text, done, now }; }));
  };
}

/** Wörter in Lücken: Wort antippen, dann Lücke antippen (oder Lücke zuerst). */
export function gapText(host, { html, words, answers, onDone, onCorrect }){
  // html enthält {0} {1} … für die Lücken
  const filled = answers.map(() => null);
  const used = words.map(() => false);
  let pick = null;
  function draw(){
    host.innerHTML = `<div class="gaptext">${html.replace(/\{(\d+)\}/g, (_, i) => { const f = filled[+i]; return `<button class="gap ${f !== null ? 'ok' : ''}" data-g="${i}">${f !== null ? esc(words[f]) : '&nbsp;'}</button>`; })}</div>
     <div class="wordbank">${words.map((w, i) => `<button class="word ${used[i] ? 'used' : ''} ${pick === i ? 'picked' : ''}" data-w="${i}" ${used[i] ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>`;
    host.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { pick = +b.dataset.w; draw(); tryNext(); });
    host.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = +b.dataset.g; if (filled[g] !== null) return; if (pick === null){ toast('Tippe zuerst auf ein Wort.', 'info'); return; } place(g); });
  }
  function tryNext(){ /* Lücke automatisch: erste freie, wenn das Wort dort passt */
    const g = filled.findIndex((f, i) => f === null);
    if (g >= 0 && pick !== null && words[pick] === answers[g]) place(g);
  }
  function place(g){
    if (words[pick] === answers[g]){ filled[g] = pick; used[pick] = true; pick = null; sfx('ok'); onCorrect && onCorrect(g); draw(); if (filled.every(f => f !== null)) onDone && onDone(); }
    else { sfx('no'); toast('Passt hier noch nicht. Lies den Satz nochmals.', 'warn'); pick = null; draw(); }
  }
  draw();
}

export function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Abschluss-Fenster */
export function celebrate(title, text, stars, onNext, nextLabel = 'Zurück ins Labor'){
  const el = document.createElement('div'); el.className = 'modal-bg';
  el.innerHTML = `<div class="modal"><svg viewBox="-130 -130 260 240" width="200" height="185"><use href="#lumoAwake"/></svg>
   <div class="h1" style="margin-top:4px">${title}</div>
   ${stars ? `<div class="stars">${'★'.repeat(stars)}<span class="dim">${'★'.repeat(3 - stars)}</span></div>` : ''}
   <p>${text}</p><button class="btn">${nextLabel}</button></div>`;
  document.body.appendChild(el); sfx('win');
  el.querySelector('button').onclick = () => { el.remove(); onNext && onNext(); };
}
