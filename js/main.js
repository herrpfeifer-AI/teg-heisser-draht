// Heisser Draht – Start, Anmeldung, Labor-Übersicht, Navigation
import { DEFS, lumo, esc } from './draw.js';
import { store, loadLocal, save, api, STATIONS, isDone, isOpen, nextStation, toast, sfx, stationState } from './ui.js';
import * as posten from './posten.js';
import * as vertiefen from './vertiefen.js';
import * as games from './games.js';
import { lehrer } from './lehrer.js';

const app = document.getElementById('app');
// Zeichnungs-Vorrat für <use>
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${DEFS}<defs><g id="lumoAwake">${lumo(true)}</g><g id="lumoSleep">${lumo(false)}</g></defs></svg>`);

const ROUTES = {
  p1: posten.p1, p2: posten.p2, p3: posten.p3, p4: posten.p4, p5: posten.p56, p6: posten.p56,
  ab3: vertiefen.ab3, ab4: vertiefen.ab4, wort: vertiefen.wort,
  hd: games.heisserDraht, sr: games.schalterRaetsel,
};
let cleanup = null;

function boot(){
  const path = location.pathname.replace(/\/+$/, '');
  if (!listening){ listening = true; window.addEventListener('hashchange', route); }
  if (path === '/lehrer' || location.hash.startsWith('#/lehrer')){ lehrer(app); return; }
  const q = new URLSearchParams(location.search);
  if (q.has('vorschau')){ startVorschau(); }
  else if (takeAusweis()) return;
  else if (path === '/einfach' || q.has('einfach')){ startSimple(false); }
  else {
    const tok = localStorage.getItem('lw-token');
    if (tok){ store.token = tok; store.mode = 'code'; store.name = localStorage.getItem('lw-name') || ''; loadLocal(); syncMe(); }
  }
  if (!listening){ listening = true; window.addEventListener('hashchange', route); }
  route();
}

function takeAusweis(){
  const aus = (location.hash.match(/ausweis=([^&]+)/) || [])[1];
  if (!aus) return false;
  history.replaceState(null, '', location.pathname + '#/labor'); loginAusweis(decodeURIComponent(aus)); return true;
}
let listening = false;
async function loginAusweis(a){
  app.innerHTML = `<div class="startbg"><svg viewBox="-130 -130 260 240" width="200" height="185"><use href="#lumoAwake"/></svg><div class="h1">Einen Moment …</div></div>`;
  if (!listening){ listening = true; window.addEventListener('hashchange', route); }
  try{
    const r = await api('loginAusweis', { ausweis: a });
    store.token = r.token; store.mode = 'code'; store.name = r.name; store.klasse = r.klasse;
    localStorage.setItem('lw-token', r.token); localStorage.setItem('lw-name', r.name);
    loadLocal(); location.hash = '#/labor'; route(); syncMe();
  }catch(e){
    const tok = localStorage.getItem('lw-token');
    if (tok){ store.token = tok; store.mode = 'code'; store.name = localStorage.getItem('lw-name') || ''; loadLocal(); route(); syncMe(); return; }
    route(); toast(esc(e.message), 'warn', 6000);
  }
}

async function syncMe(){
  try{
    const r = await api('me');
    store.name = r.name; store.cls = r.cls; store.klasse = r.cls && r.cls.name;
    const server = r.doc && r.doc.state;
    // Server-Stand übernehmen, ausser das Gerät ist weiter (mehr Lichtfunken)
    if (server && (server.funken || 0) >= (store.s.funken || 0)) store.s = Object.assign({ v:1, st:{}, funken:0, data:{} }, server);
    else if ((store.s.funken || 0) > 0) save();
    route(); pollPause();
  }catch(e){
    if (e.status === 401){ logout(); toast(esc(e.message), 'warn', 4000); }
  }
}
let pauseTimer = null;
function pollPause(){
  clearInterval(pauseTimer);
  const tick = async () => {
    if (store.mode !== 'code' || document.hidden) return;
    try{ const r = await api('status'); store.cls = r.cls || store.cls; showPause(r.paused, r.msg, r.ruhe); }catch(e){}
  };
  pauseTimer = setInterval(tick, 15000); tick();
}
function showPause(on, msg, ruhe){
  let el = document.getElementById('pause');
  if (!on){ el && el.remove(); return; }
  if (!el){ el = document.createElement('div'); el.id = 'pause'; el.className = 'pause'; document.body.appendChild(el); }
  el.innerHTML = `<svg viewBox="-130 -130 260 240" width="220" height="200"><use href="#lumoSleep"/></svg><div class="bigtitle" style="font-size:46px">${ruhe ? 'Ruhezeit – schlaf gut! 😴' : 'Bitte schau nach vorne!'}</div><p style="font-size:20px;color:#C9D3FF">${esc(msg || 'Die Lehrperson möchte etwas sagen.')}</p>`;
}
function logout(){
  localStorage.removeItem('lw-token'); localStorage.removeItem('lw-name');
  store.token = null; store.mode = null; store.name = ''; store.cls = null; clearInterval(pauseTimer); showPause(false);
  location.hash = '#/';
}
// Vorschau für Eltern (Link aus der Schapp: …?vorschau=1): alle Stationen offen, nichts wird gespeichert – auch nicht im Browser
function startVorschau(){
  const q0 = new URLSearchParams(location.search);
  store.vorschau = true; store.mode = 'simple'; store.token = null; store.name = ''; loadLocal();
  const bar = document.createElement('div');
  bar.textContent = q0.get('vorschau') === 'lp' ? '🧪 Testansicht für Lehrpersonen – alle Stationen offen, hier wird nichts gespeichert.' : '👀 Vorschau für Eltern – hier wird nichts gespeichert.';
  bar.style.cssText = 'position:sticky;top:0;z-index:50;background:#BAE3F9;color:#0B2A3C;text-align:center;font:600 15px system-ui,sans-serif;padding:8px 12px';
  document.body.prepend(bar);
  if (!location.hash || location.hash === '#/' || location.hash === '#') history.replaceState(null, '', location.pathname + location.search + '#/labor');
}
function startSimple(go = true){ store.mode = 'simple'; store.token = null; store.name = ''; loadLocal(); if (go) location.hash = '#/labor'; }

function route(){
  if (takeAusweis()) return;
  if (cleanup){ try{ cleanup(); }catch(e){} cleanup = null; }
  window.scrollTo(0, 0);
  const h = location.hash.replace(/^#\/?/, '');
  const [page] = h.split('/');
  if (page === 'lehrer'){ lehrer(app); return; }
  if (!store.mode){ startScreen(); return; }
  if (!page || page === 'labor'){ labor(); return; }
  const fn = ROUTES[page];
  if (!fn){ labor(); return; }
  if (!isOpen(page)){ toast('Diese Station ist noch zu. Löse zuerst die Station davor.', 'info'); location.hash = '#/labor'; return; }
  cleanup = fn(app, page) || null;
}

// ---------- Start ----------
function startScreen(){
  app.innerHTML = `<div class="startbg">
   <svg viewBox="-130 -130 260 240" width="230" height="210"><use href="#lumoAwake"/></svg>
   <div class="eyebrow" style="font-size:15px">Werken · TeG</div>
   <div class="bigtitle">Heisser Draht</div>
   <div style="font-size:21px;color:#C9D3FF;margin-top:6px">Entdecke, wie Strom fliesst – und wecke den Lichtwächter auf!</div>
   <div class="startcards">
    <div class="startcard primary"><h3>Mit der Schapp</h3><p>Öffne die Schapp und tippe unter <b>Fächer › TeG</b> auf «Heisser Draht». Dann bist du automatisch angemeldet.</p><details style="margin-top:6px"><summary style="cursor:pointer;color:#8E9BD6;font-size:15px">Ich habe einen Code von der Lehrperson</summary>
     <div class="pinrow">${[0,1,2,3].map(i => `<div class="pinbox" data-p="${i}"></div>`).join('')}</div>
     <div class="keypad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'OK'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}</div>
    </details></div>
    <div class="startcard"><h3>Einfach üben</h3><p>Ohne Anmeldung sofort starten. Dein Stand bleibt nur auf diesem Gerät.</p><button class="btn ghost" id="simple" style="width:100%">Los geht's</button>
     <p style="margin-top:22px;font-size:14px;color:#8E9BD6">Lehrperson? <a href="#/lehrer" style="text-decoration:underline">Zum Lehrerbereich</a></p></div>
   </div></div>`;
  let pin = '';
  const draw = () => app.querySelectorAll('.pinbox').forEach((b, i) => { b.textContent = pin[i] || ''; b.classList.toggle('f', i === pin.length); });
  draw();
  const send = async () => {
    if (pin.length !== 4){ toast('Der Code hat 4 Ziffern.', 'info'); return; }
    try{
      const r = await api('loginCode', { pin });
      store.token = r.token; store.mode = 'code'; store.name = r.name; store.klasse = r.klasse;
      localStorage.setItem('lw-token', r.token); localStorage.setItem('lw-name', r.name);
      loadLocal(); sfx('ok'); location.hash = '#/labor'; syncMe();
    }catch(e){ sfx('no'); toast(esc(e.message), 'warn', 3500); pin = ''; draw(); }
  };
  app.querySelectorAll('.key').forEach(b => b.onclick = () => {
    const k = b.dataset.k; sfx('tick');
    if (k === '⌫') pin = pin.slice(0, -1); else if (k === 'OK') return send(); else if (pin.length < 4) pin += k;
    draw(); if (pin.length === 4) send();
  });
  app.querySelector('#simple').onclick = () => startSimple();
}

// ---------- Labor-Übersicht ----------
function labor(){
  const nx = nextStation();
  const item = s => {
    const open = isOpen(s.id), done = isDone(s.id), st = store.s.st[s.id] || {};
    const right = done ? `<span class="ok">✓ ${'★'.repeat(st.stars || 0)}</span>` : (!open ? '<span>🔒</span>' : (nx && nx.id === s.id ? '<span class="go">weiter ›</span>' : (st.started ? '<span class="go">angefangen</span>' : '')));
    if (s.col === 1) return `<button class="labitem ${nx && nx.id === s.id ? 'next' : ''} ${open ? '' : 'locked'}" data-go="${s.id}"><span>${s.nr} ${s.name}</span>${right}</button>`;
    return `<button class="labitem big ${s.id === 'hd' ? 'game1' : s.id === 'sr' ? 'game2' : ''} ${open ? '' : 'locked'}" data-go="${s.id}"><span style="display:flex;width:100%;justify-content:space-between">${s.nr ? s.nr + ' · ' : ''}${s.name} ${right}</span><span class="sub">${s.sub}</span></button>`;
  };
  const allDone = STATIONS.filter(s => s.col === 1).every(s => isDone(s.id));
  const bubble = allDone ? 'Super! Alle Posten gelöst. Jetzt vertiefen oder spielen!' : nx ? `Weiter mit ${nx.nr}!` : 'Wähle eine Station.';
  app.innerHTML = `<div class="screen">
   <header class="top"><div><div class="eyebrow">${store.mode === 'code' ? 'Hallo ' + esc(store.name) : 'Einfach üben'}</div><div class="h1">Dein Labor</div></div><div class="spacer"></div>
    <button class="pill" id="mute">${store.muted ? '🔇' : '🔊'}</button>
    <div class="pill"><span class="star">★</span> <span class="funken-n">${store.s.funken}</span> Lichtfunken</div>
    <button class="pill" id="out">${store.mode === 'code' ? 'Abmelden' : 'Beenden'}</button></header>
   <div class="labgrid">
    <div class="labcol"><div class="lab-label">1 · Posten lösen</div>${STATIONS.filter(s => s.col === 1).map(item).join('')}</div>
    <div class="labcol"><div class="lab-label">2 · Vertiefen</div>${STATIONS.filter(s => s.col === 2).map(item).join('')}</div>
    <div class="labcol"><div class="lab-label">3 · Spielen</div>${STATIONS.filter(s => s.col === 3).map(item).join('')}
     <svg viewBox="0 0 400 260" style="width:100%;max-width:400px;margin-top:6px"><g transform="translate(110 130)"><use href="#lumoAwake"/></g>
      <rect x="190" y="40" width="200" height="${bubble.length > 30 ? 120 : 92}" rx="18" fill="#FFD54A"/><path d="M190 96 L168 112 L196 114Z" fill="#FFD54A"/>
      <foreignObject x="204" y="50" width="176" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#1B1B1B;font-weight:800;font-size:19px;line-height:1.3">${esc(bubble)}</div></foreignObject></svg>
    </div></div></div>`;
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const id = b.dataset.go; if (!isOpen(id)){ sfx('no'); toast('Noch zu! Löse zuerst die Station davor.', 'info'); return; }
    location.hash = '#/' + id;
  });
  app.querySelector('#out').onclick = () => { if (store.mode === 'code') logout(); else { store.mode = null; location.hash = '#/'; route(); } };
  app.querySelector('#mute').onclick = () => { store.muted = !store.muted; labor(); };
}

boot();
