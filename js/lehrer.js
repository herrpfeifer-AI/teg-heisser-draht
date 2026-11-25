// Lehrerbereich: Klassen, Fortschritt, Freischalten, Pause, Codes
import { esc } from './draw.js';
import { STATIONS, toast } from './ui.js';

const COLS = ['p1','p2','p3','p4','p5','p6','ab3','ab4','wort','hd','sr'];
const LABEL = { p1:'P1', p2:'P2', p3:'P3', p4:'P4', p5:'P5', p6:'P6', ab3:'AB 3', ab4:'AB 4', wort:'Wörter', hd:'Draht', sr:'Rätsel' };
let token = localStorage.getItem('lw-teacher') || null;
let isAdmin = true; // false = Lehrperson mit Klassen-Zugang (sieht nur ihre Klasse)

async function tapi(a, data = {}){
  const r = await fetch('/api/api', { method:'POST', headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:'Bearer ' + token } : {}) }, body: JSON.stringify({ a, ...data }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok){ const e = new Error(j.error || 'Fehler'); e.status = r.status; e.noDb = j.noDb; throw e; }
  return j;
}

export function lehrer(app){
  if (location.hash !== '#/lehrer' && !location.hash.startsWith('#/lehrer')) history.replaceState(null, '', '/#/lehrer');
  if (!token) return login(app);
  classes(app);
}

// back: was der Pfeil oben links macht (Standard: zur Kinder-Startseite)
function frame(app, title, inner, back){
  app.innerHTML = `<div class="light screen"><header class="top noprint" style="flex-wrap:wrap;row-gap:10px;height:auto;min-height:72px;padding-top:8px;padding-bottom:8px"><button class="back" id="backBtn" title="${back ? 'Zurück zu den Klassen' : 'Zur Kinder-Ansicht'}" style="background:#EEF0F8;color:#1B1E2E;border:0;cursor:pointer">‹</button><div><div class="eyebrow">Lehrerbereich · Heisser Draht</div><div class="h1">${esc(title)}</div></div><div class="spacer"></div><div id="tb" style="display:flex;gap:8px;flex-wrap:wrap"></div><a class="btn ghost small" href="/?vorschau=lp#/labor" target="_blank" rel="noopener" title="Öffnet die Kinder-App mit allen Stationen offen, nichts wird gespeichert">🧪 App testen</a><button class="btn ghost small" id="logout">Abmelden</button></header><div style="padding:22px 28px;overflow:auto;flex:1" id="body">${inner}</div></div>`;
  app.querySelector('#logout').onclick = () => { token = null; localStorage.removeItem('lw-teacher'); lehrer(app); };
  app.querySelector('#backBtn').onclick = () => { if (back) back(); else location.href = '/#/'; };
  return app.querySelector('#body');
}

function login(app){
  app.innerHTML = `<div class="light screen" style="align-items:center;justify-content:center"><div class="card" style="width:420px;box-shadow:0 10px 40px rgba(0,0,0,.08)">
   <div class="eyebrow">Heisser Draht</div><div class="h1" style="margin-bottom:14px">Lehrerbereich</div>
   <input class="inp" type="password" id="pw" placeholder="Passwort oder Zugangscode" style="width:100%"><button class="btn" id="go" style="width:100%;margin-top:12px">Anmelden</button>
   <p style="margin-top:12px;font-size:14px;color:#6B74A0"><a href="/#/" style="text-decoration:underline">Zurück zur Kinder-Ansicht</a></p></div></div>`;
  const go = async () => {
    try{ const r = await tapi('teacherLogin', { password: app.querySelector('#pw').value }); token = r.token; localStorage.setItem('lw-teacher', token); classes(app); }
    catch(e){ toast(esc(e.message), 'warn', 4000); }
  };
  app.querySelector('#go').onclick = go; app.querySelector('#pw').onkeydown = e => { if (e.key === 'Enter') go(); };
}

async function classes(app){
  const body = frame(app, 'Klassen', '<p>Lade …</p>');
  try{
    const r = await tapi('t.classes');
    isAdmin = r.admin !== false;
    if (!isAdmin){
      // Klassen-Zugang: direkt die eigene Klasse öffnen
      if (r.classes[0]) return klasse(app, r.classes[0].code);
      body.innerHTML = '<div class="card"><b>Deine Klasse wurde nicht gefunden.</b></div>'; return;
    }
    body.innerHTML = `<div style="display:flex;gap:14px;flex-wrap:wrap">${r.classes.map(c => `<button class="card" data-c="${c.code}" style="min-width:220px;text-align:left;color:#1B1E2E"><div class="h1">${esc(c.name)}</div><div style="color:#6B74A0">${c.count} Kinder</div></button>`).join('')}
      <div class="card" style="min-width:260px"><div style="font-weight:800;margin-bottom:8px">Neue Klasse</div><input class="inp" id="nn" placeholder="z. B. 5a" style="width:100%"><button class="btn small" id="mk" style="margin-top:8px;width:100%">Anlegen</button></div></div>
      <div class="card" style="margin-top:20px"><div style="font-weight:800">Einfache Version ohne Anmeldung (Parallelklasse)</div><p style="color:#4A5070;margin-top:6px">Link: <b>${location.origin}/einfach</b> – alle Stationen sind offen, gespeichert wird nur auf dem Gerät. Die Lehrperson sieht davon nichts.</p></div>
      <div class="card" style="margin-top:20px" id="zg"><div style="font-weight:800">Zugänge für andere Lehrpersonen</div><p style="color:#4A5070;margin-top:6px">Mit einem Klassen-Zugang sieht eine Lehrperson nur ihre Klasse: Fortschritt, Codes der Kinder, Freigaben, «Alle anhalten». Andere Klassen und diese Einstellungen sieht sie nicht. Sie meldet sich hier im Lehrerbereich mit dem Zugangscode an.</p><div id="zgl" style="margin-top:10px">Lade …</div></div>`;
    zugaenge(body.querySelector('#zgl'), r.classes);
    body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => klasse(app, b.dataset.c));
    body.querySelector('#mk').onclick = async () => { const n = body.querySelector('#nn').value.trim(); if (!n) return; await tapi('t.createClass', { name:n }); classes(app); };
  }catch(e){
    if (e.status === 401){ token = null; localStorage.removeItem('lw-teacher'); return login(app); }
    body.innerHTML = `<div class="card"><b>${esc(e.message)}</b>${e.noDb ? '<p style="margin-top:8px;color:#4A5070">Im Vercel-Projekt «lichtwaechter» fehlt noch die Datenbank (DATABASE_URL). Die Version «Einfach üben» funktioniert trotzdem.</p>' : ''}</div>`;
  }
}

async function zugaenge(el, klassen){
  let zg = {};
  const draw = () => {
    el.innerHTML = klassen.map(c => {
      const z = zg[c.code];
      return `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #EEF0F8">
        <b style="min-width:90px">Klasse ${esc(c.name)}</b>
        ${z ? `<span>Code: <b style="font-family:monospace;font-size:18px;letter-spacing:1px">${esc(z.code)}</b></span><span style="color:#6B74A0;font-size:13px">seit ${new Date(z.erstellt).toLocaleDateString('de-CH')}</span>
          <button class="btn ghost small" data-z="copy" data-c="${c.code}">Kopieren</button><button class="btn ghost small" data-z="new" data-c="${c.code}">Neuer Code</button><button class="btn ghost small" data-z="del" data-c="${c.code}" style="color:#C0392B">Löschen</button>`
        : `<span style="color:#6B74A0">kein Zugang</span><button class="btn small" data-z="make" data-c="${c.code}">Zugang erstellen</button>`}
      </div>`;
    }).join('');
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = async () => {
      const c = klassen.find(x => x.code === b.dataset.c); const z = zg[c.code];
      if (b.dataset.z === 'copy'){
        const text = `Lehrerbereich Heisser Draht, Klasse ${c.name}\n${location.origin}/lehrer\nZugangscode: ${z.code}`;
        try{ await navigator.clipboard.writeText(text); toast('Kopiert.', 'info'); }catch(e){ prompt('Zum Kopieren:', text); }
        return;
      }
      if (b.dataset.z === 'new' && !confirm(`Neuer Code für Klasse ${c.name}? Der alte Code funktioniert dann nicht mehr.`)) return;
      if (b.dataset.z === 'del' && !confirm(`Zugang für Klasse ${c.name} löschen? Die Lehrperson kann sich dann nicht mehr anmelden.`)) return;
      try{ zg = (await tapi('t.setZugang', { code:c.code, neu: b.dataset.z !== 'del' })).zugang; draw(); }catch(e){ toast(esc(e.message), 'warn', 4000); }
    });
  };
  try{ zg = (await tapi('t.zugang')).zugang || {}; draw(); }catch(e){ el.textContent = e.message; }
}

async function klasse(app, code){
  const body = frame(app, 'Klasse', '<p>Lade …</p>', isAdmin ? () => classes(app) : null);
  let c;
  const load = async () => { c = (await tapi('t.class', { code })).cls; draw(); };
  const cell = (st, id) => { const x = st && st.st && st.st[id]; const v = !x ? 0 : x.done ? (x.stars >= 3 ? 3 : 2) : (x.started || Object.keys(x.steps || {}).length ? 1 : 0); return `<span class="dot ${v ? 'd' + v : ''}" title="${x && x.done ? '★'.repeat(x.stars || 0) : ''}"></span>`; };
  const ago = t => { if (!t) return '–'; const d = (Date.now() - t) / 86400000; const dt = new Date(t); if (d < 1 && dt.getDate() === new Date().getDate()) return 'heute ' + dt.toTimeString().slice(0, 5); if (d < 2) return 'gestern'; return dt.toLocaleDateString('de-CH'); };
  function draw(){
    app.querySelector('.h1').textContent = 'Klasse ' + c.name;
    const tb = app.querySelector('#tb');
    tb.innerHTML = `<button class="btn small" id="pause" style="background:${c.pause ? '#3DD6B5' : '#FF6B6B'};color:#fff">${c.pause ? '▶ Weiter lassen' : '⏸ Alle anhalten'}</button>${isAdmin ? '<button class="btn ghost small" id="back2">Alle Klassen</button>' : ''}`;
    tb.querySelector('#pause').onclick = async () => { const r = await tapi('t.pause', { code, on: !c.pause }); c.pause = r.pause; draw(); toast(c.pause ? 'Alle Kinder sehen jetzt «Bitte schau nach vorne!»' : 'Die Kinder können weiterarbeiten.', 'info'); };
    if (isAdmin) tb.querySelector('#back2').onclick = () => classes(app);
    // Häufigste Fehlvorstellung Posten 2
    const wrong = {}; c.students.forEach(s => { const t = s.state && s.state.data && s.state.data.p2 && s.state.data.p2.tests; if (t) for (const [k, v] of Object.entries(t)) if (!v.ok) wrong[k] = (wrong[k] || 0) + 1; });
    const top = Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 3);
    body.innerHTML = `
     <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px" class="noprint">
      <label class="card" style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" id="all" ${c.settings.allOpen ? 'checked' : ''} style="width:22px;height:22px"> <span><b>Alle Stationen frei</b><br><span style="color:#6B74A0;font-size:14px">sonst der Reihe nach (empfohlen)</span></span></label>
      <label class="card" style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" id="games" ${c.settings.gamesOn !== false ? 'checked' : ''} style="width:22px;height:22px"> <span><b>Spiele erlaubt</b><br><span style="color:#6B74A0;font-size:14px">Heisser Draht, Schalter-Rätsel</span></span></label>
      <div class="card" style="flex:1;min-width:260px"><b>Häufigste falsche Vermutungen (Posten 2)</b><br><span style="color:#4A5070">${top.length ? top.map(([k, n]) => `${esc(k)}: ${n}×`).join(' · ') : 'noch keine Daten'}</span></div>
     </div>
     <table class="tbl"><tr><th>Kind</th>${COLS.map(k => `<th>${LABEL[k]}</th>`).join('')}<th>Funken</th><th>zuletzt</th><th class="noprint"></th></tr>
     ${c.students.map(s => `<tr class="row"><td><b>${esc(s.name)}</b><div style="font-size:12px;color:#6B74A0">Code ${s.pin}</div></td>${COLS.map(k => `<td>${cell(s.state, k)}</td>`).join('')}<td><b>★ ${(s.state && s.state.funken) || 0}</b></td><td style="color:#6B74A0;font-size:14px">${ago(s.updated)}</td>
       <td class="noprint"><button class="btn ghost small" data-more="${s.id}">…</button></td></tr>`).join('')}</table>
     <div style="display:flex;gap:16px;margin:10px 0 18px;font-size:14px;color:#6B74A0"><span><span class="dot" style="width:14px;height:14px"></span> nicht begonnen</span><span><span class="dot d1" style="width:14px;height:14px"></span> angefangen</span><span><span class="dot d2" style="width:14px;height:14px"></span> gelöst</span><span><span class="dot d3" style="width:14px;height:14px"></span> alle Sterne</span></div>
     <div style="display:flex;gap:14px;flex-wrap:wrap" class="noprint">
      <div class="card" style="flex:1;min-width:300px"><b>Kinder hinzufügen</b> (ein Name pro Zeile)<textarea class="inp" id="names" rows="3" style="width:100%;margin-top:8px"></textarea><button class="btn small" id="add" style="margin-top:8px">Hinzufügen</button></div>
      <div class="card" style="flex:1;min-width:300px"><b>Code-Kärtchen</b><p style="color:#4A5070;margin:6px 0 10px">Jedes Kind meldet sich mit seinem 4-stelligen Code an.</p><button class="btn small" id="print">Kärtchen drucken</button></div>
     </div>
     <div class="codecards" id="cards" style="display:none;margin-top:20px">${c.students.map(s => `<div class="codecard"><div style="font-size:13px">Heisser Draht · ${esc(location.host)}</div><div style="font-size:18px;font-weight:800;margin:4px 0">${esc(s.name)}</div><b>${s.pin}</b></div>`).join('')}</div>`;
    body.querySelector('#all').onchange = saveSettings; body.querySelector('#games').onchange = saveSettings;
    body.querySelector('#add').onclick = async () => { const names = body.querySelector('#names').value.split('\n').map(x => x.trim()).filter(Boolean); if (!names.length) return; await tapi('t.addStudents', { code, names }); load(); };
    body.querySelector('#print').onclick = () => { const el = body.querySelector('#cards'); el.style.display = 'grid'; setTimeout(() => { window.print(); el.style.display = 'none'; }, 100); };
    body.querySelectorAll('[data-more]').forEach(b => b.onclick = () => more(c.students.find(s => s.id === b.dataset.more)));
  }
  async function saveSettings(){
    const settings = { allOpen: body.querySelector('#all').checked, gamesOn: body.querySelector('#games').checked };
    await tapi('t.settings', { code, settings }); c.settings = settings; toast('Gespeichert. Die Kinder sehen es in wenigen Sekunden.', 'info');
  }
  function more(s){
    const el = document.createElement('div'); el.className = 'modal-bg';
    el.innerHTML = `<div class="modal" style="background:#fff;color:#1B1E2E"><div class="h1">${esc(s.name)}</div><p style="color:#4A5070">Code ${s.pin}</p>
     ${s.state && s.state.data && s.state.data.p2 ? `<p style="color:#4A5070;font-size:15px">Posten 2: ${Object.keys(s.state.data.p2.tests || {}).length} getestet, ${Object.values(s.state.data.p2.tests || {}).filter(t => t.ok).length} richtig vermutet</p>` : ''}
     <button class="btn ghost" data-a="pin">Neuen Code geben</button><button class="btn ghost" data-a="reset">Fortschritt löschen</button><button class="btn ghost" data-a="del" style="color:#C0392B">Kind entfernen</button><button class="btn" data-a="x">Schliessen</button></div>`;
    document.body.appendChild(el);
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'pin'){ const r = await tapi('t.newPin', { code, sid:s.id }); toast('Neuer Code: ' + r.pin, 'info', 5000); }
      if (a === 'reset' && confirm(`Fortschritt von ${s.name} wirklich löschen?`)) await tapi('t.resetStudent', { code, sid:s.id });
      if (a === 'del' && confirm(`${s.name} wirklich entfernen?`)) await tapi('t.deleteStudent', { code, sid:s.id });
      el.remove(); load();
    });
  }
  try{ await load(); }catch(e){ body.innerHTML = `<div class="card"><b>${esc(e.message)}</b></div>`; }
}
