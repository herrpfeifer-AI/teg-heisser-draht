// Spiele: Heisser Draht (digital) und Schalter-Rätsel
import { DEFS, lamp, toggle, battery, lumo, esc } from './draw.js';
import { solve } from './sim.js';
import { LEVELS } from './levels.js';
import { shell, stationState, finish, toast, sfx, celebrate, store, save } from './ui.js';

/* =================== HEISSER DRAHT =================== */
const VW = 1368, VH = 720;
const WORLDS = [
  { id:'leuchtturm', name:'Der Leuchtturm', R:46, sky:['#0B1030','#14244F'],
    path:'M110 520 C 180 380, 260 380, 320 480 S 420 560, 480 430 L 540 330 L 600 430 C 650 520, 740 520, 790 400 S 900 290, 960 420 L 1010 340 L 1060 480',
    scene: lit => `<path d="M0 600 q60 -30 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 L1368 720 L0 720Z" fill="#163C7A"/><path d="M0 650 q60 -30 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 L1368 720 L0 720Z" fill="#1B4C94"/>
      <path d="M1150 610 L1180 270 L1260 270 L1290 610Z" fill="#EAF0FF"/><path d="M1168 420 L1272 420 L1278 480 L1162 480Z" fill="#FF6B6B"/><path d="M1176 330 L1264 330 L1268 370 L1172 370Z" fill="#FF6B6B"/>
      <rect x="1170" y="220" width="100" height="50" fill="#5A6496"/><path d="M1160 220 L1220 175 L1280 220Z" fill="#3A4377"/>
      ${lit ? '<path d="M1220 245 L1368 160 L1368 330Z" fill="#FFE680" opacity=".35"/><path d="M1220 245 L900 150 L900 330Z" fill="#FFE680" opacity=".25"/>' : ''}
      <g transform="translate(1220 245) scale(.5)">${lit ? lumo(true) : lumo(false)}</g>` },
  { id:'mond', name:'Der Winter-Mond', R:40, sky:['#0A1428','#1C2E58'],
    path:'M110 470 L180 380 L240 470 L300 360 L360 470 L420 330 L480 470 L560 400 L640 470 L700 340 L760 470 L830 380 L900 470 L960 360 L1040 470',
    scene: lit => `<path d="M0 560 Q300 520 600 560 T1368 550 L1368 720 L0 720Z" fill="#E8F0FF"/>${[80,230,1000,1120,1300].map(x => `<path d="M${x} 570 l40 -120 l40 120Z" fill="#1E5A4A"/>`).join('')}
      <circle cx="1220" cy="180" r="${lit ? 92 : 80}" fill="${lit ? '#FFF3B0' : '#5A6496'}" ${lit ? 'style="filter:drop-shadow(0 0 30px #FFE680)"' : ''}/>
      <g transform="translate(1220 175) scale(.55)">${lit ? lumo(true) : lumo(false)}</g>` },
  { id:'stadt', name:'Die Stadt bei Nacht', R:36, sky:['#090D22','#1A1F44'],
    path:'M100 500 L100 380 L220 380 L220 300 L330 300 L330 430 L430 430 L430 260 L540 260 L540 380 L650 380 L650 320 L760 320 L760 450 L880 450 L880 290 L990 290 L990 400 L1060 400',
    scene: lit => `${[[60,140],[200,200],[340,110],[470,240],[600,170],[740,220],[880,130],[1010,190]].map(([x,h]) => `<rect x="${x}" y="${640 - h}" width="110" height="${h + 80}" fill="#141A38"/>${[0,1,2].map(r => [0,1,2].map(c => `<rect x="${x + 16 + c * 30}" y="${660 - h + r * 36}" width="16" height="20" fill="${lit || (r + c + x) % 3 === 0 ? '#FFD54A' : '#2A3360'}"/>`).join('')).join('')}`).join('')}
      <rect x="1200" y="260" width="12" height="400" fill="#5A6496"/><path d="M1206 260 C1206 200, 1280 200, 1280 230" stroke="#5A6496" stroke-width="12" fill="none"/>
      <g transform="translate(1280 260) scale(.45)">${lit ? lumo(true) : lumo(false)}</g>${lit ? '<path d="M1280 280 L1200 560 L1360 560Z" fill="#FFE680" opacity=".3"/>' : ''}` },
  { id:'drache', name:'Der Drachenschatz', R:32, sky:['#1A0E10','#2E1A22'],
    path:'M110 300 L200 470 L280 280 L360 480 L440 300 L520 500 L600 330 C660 250, 720 520, 780 420 L860 300 L940 480 L1060 360',
    scene: lit => `<path d="M0 0 L1368 0 L1368 120 Q1100 200 900 110 T400 130 T0 100Z" fill="#120A0C"/><path d="M0 720 L0 620 Q300 560 600 640 T1368 600 L1368 720Z" fill="#120A0C"/>
      ${[...Array(14)].map((_, i) => `<circle cx="${1100 + (i % 5) * 30}" cy="${640 - Math.floor(i / 5) * 22}" r="14" fill="#E7C65A"/>`).join('')}
      <path d="M1150 330 C1180 220, 1300 220, 1330 330 L1310 420 L1170 420Z" fill="#6A2A3A"/>
      <circle cx="1240" cy="300" r="${lit ? 34 : 26}" fill="${lit ? '#FF4A2A' : '#3A1A22'}" ${lit ? 'style="filter:drop-shadow(0 0 24px #FF6B6B)"' : ''}/>${lit ? '<circle cx="1240" cy="300" r="10" fill="#1A0505"/>' : '<path d="M1214 300 Q1240 314 1266 300" stroke="#C9A0A8" stroke-width="5" fill="none"/>'}` },
  { id:'geist', name:'Das Geisterhaus', R:28, sky:['#0B0B1E','#22163A'],
    path:'M110 560 L110 470 L230 470 L230 390 L350 390 L350 310 L470 310 C600 230, 700 330, 640 400 C580 470, 480 380, 560 330 C640 280, 760 360, 820 300 L900 220 L980 300 L1060 220',
    scene: lit => `<circle cx="1220" cy="120" r="60" fill="#E8E0C0" opacity=".8"/><path d="M1100 660 L1100 330 L1220 250 L1340 330 L1340 660Z" fill="#1A1430"/>
      <rect x="1190" y="400" width="60" height="70" fill="${lit ? '#9AFFD8' : '#2A2450'}" ${lit ? 'style="filter:drop-shadow(0 0 24px #9AFFD8)"' : ''}/>${lit ? '<path d="M1205 450 q15 -40 30 0 q-5 20 -15 10 q-10 10 -15 -10Z" fill="#fff"/>' : ''}` },
];

export function heisserDraht(root){
  const ID = 'hd';
  const data = store.s.data.hd || (store.s.data.hd = { best:{} });
  let lvl = Math.min(WORLDS.length - 1, Object.keys(data.best).filter(k => k !== 'eigen').length);
  let custom = null; // eigener Draht
  root.innerHTML = `<div class="screen" style="background:#0B1030">
    <header class="top" style="background:transparent;border:0"><a class="back" href="#/labor">‹</a><div><div class="eyebrow" id="ey"></div><div class="h1" id="ti"></div></div><div class="spacer"></div>
     <div class="pill" id="err" style="color:#FF8A8A"></div><div class="pill" id="tm">⏱ 0:00</div><div class="pill"><span class="star">★</span> <span class="funken-n">${store.s.funken}</span></div></header>
    <div class="gamewrap" style="flex:1;position:relative;min-height:0"><svg id="g" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;touch-action:none;display:block"></svg></div>
    <div id="bar" style="display:flex;gap:8px;padding:10px 20px;flex-wrap:wrap"></div></div>`;
  const svg = root.querySelector('#g');
  let P = [], R = 40, state = 'ready', ring = null, errors = 0, t0 = 0, timer = null, lastHit = 0, prog = 0, lit = false, drag = null, drawPts = null;

  function sample(d){ const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', d); svg.appendChild(el); const L = el.getTotalLength(); const out = []; for (let i = 0; i <= 600; i++){ const p = el.getPointAtLength(L * i / 600); out.push({ x:p.x, y:p.y }); } el.remove(); return out; }
  function world(){ return lvl === 'eigen' ? { id:'eigen', name:'Mein eigener Draht', R:42, sky:['#0F1530','#1E2750'], path: custom, scene: l => `<g transform="translate(1230 200) scale(.6)">${lumo(!!l)}</g>` } : WORLDS[lvl]; }
  function setup(){
    const W = world(); R = W.R; P = sample(W.path); state = 'ready'; errors = 0; prog = 0; lit = false; clearInterval(timer);
    ring = { x: P[0].x, y: P[0].y };
    root.querySelector('#ey').textContent = lvl === 'eigen' ? 'Spiel · eigener Draht' : `Spiel · Level ${lvl + 1} von ${WORLDS.length}`;
    root.querySelector('#ti').textContent = 'Draht-Spiel: ' + W.name;
    drawStatic(); bar(); hud();
  }
  function drawStatic(){
    const W = world();
    svg.innerHTML = `${DEFS}<defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${W.sky[0]}"/><stop offset="1" stop-color="${W.sky[1]}"/></linearGradient></defs>
      <rect width="${VW}" height="${VH}" fill="url(#sky)"/>${[...Array(24)].map((_, i) => `<circle cx="${(i * 197) % VW}" cy="${(i * 89) % 260 + 20}" r="${i % 3 ? 1.5 : 2.2}" fill="#fff" opacity=".6"/>`).join('')}
      <g id="scene">${W.scene(false)}</g>
      <path d="${W.path}" stroke="#7C86A8" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${W.path}" stroke="#E4E9F7" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="done" d="" stroke="#3DD6B5" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"/>
      <circle cx="${P[0].x}" cy="${P[0].y}" r="22" fill="#3DD6B5"/><text x="${P[0].x}" y="${P[0].y + 7}" text-anchor="middle" font-size="20" font-weight="900" fill="#0F1530">S</text>
      <circle cx="${P[P.length - 1].x}" cy="${P[P.length - 1].y}" r="22" fill="#FF6B6B"/><text x="${P[P.length - 1].x}" y="${P[P.length - 1].y + 7}" text-anchor="middle" font-size="20" font-weight="900" fill="#0F1530">Z</text>
      <g id="ring"></g><g id="msg"></g>`;
    drawRing(); message(state === 'ready' ? 'Ziehe die Schlinge vom Start (S) zum Ziel (Z). Berühre den Draht nicht!' : '');
  }
  function drawRing(){
    const g = svg.querySelector('#ring'); if (!g) return;
    g.innerHTML = `<g transform="translate(${ring.x} ${ring.y})"><circle r="${R}" fill="none" stroke="${lit ? '#FF6B6B' : '#E7C65A'}" stroke-width="9"/>
      <path d="M0 ${R} L0 ${R + 70}" stroke="#E7C65A" stroke-width="9" stroke-linecap="round"/><path d="M-45 ${R + 70} L45 ${R + 70} L25 ${R + 100} L-25 ${R + 100}Z" fill="#7C4DCC"/>
      ${state === 'ready' ? `<circle cy="${R + 85}" r="50" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 6" opacity=".7"/>` : ''}</g>`;
  }
  function message(t){ const g = svg.querySelector('#msg'); if (g) g.innerHTML = t ? `<rect x="${VW / 2 - 420}" y="24" width="840" height="56" rx="16" fill="#0F1530" opacity=".85"/><text x="${VW / 2}" y="60" text-anchor="middle" font-size="22" font-weight="800" fill="#FFD54A">${esc(t)}</text>` : ''; }
  function hud(){ root.querySelector('#err').textContent = `✕ ${errors} Berührung${errors === 1 ? '' : 'en'}`; }
  function setLit(v){ if (v === lit) return; lit = v; svg.querySelector('#scene').innerHTML = world().scene(v); drawRing(); }
  const pt = ev => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  function nearest(x, y, from, to){ let bi = from, bd = 1e9; for (let i = Math.max(0, from); i <= Math.min(P.length - 1, to); i++){ const d = Math.hypot(P[i].x - x, P[i].y - y); if (d < bd){ bd = d; bi = i; } } return { i: bi, d: bd }; }

  svg.addEventListener('pointerdown', ev => {
    if (drawPts){ drawPts.push(pt(ev)); svg.setPointerCapture(ev.pointerId); drag = { draw:true }; return; }
    const p = pt(ev);
    // greifen: Schlinge oder Griff
    if (Math.hypot(p.x - ring.x, p.y - (ring.y + R + 50)) < 110 || Math.hypot(p.x - ring.x, p.y - ring.y) < R + 20){
      drag = { dx: ring.x - p.x, dy: ring.y - p.y }; svg.setPointerCapture(ev.pointerId);
      if (state === 'ready'){ state = 'play'; t0 = Date.now(); timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); root.querySelector('#tm').textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250); message(''); }
    }
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag) return; const p = pt(ev);
    if (drag.draw){ const last = drawPts[drawPts.length - 1]; if (Math.hypot(p.x - last.x, p.y - last.y) > 14){ drawPts.push(p); drawCustom(); } return; }
    if (state !== 'play') return;
    ring = { x: p.x + drag.dx, y: p.y + drag.dy };
    const n = nearest(ring.x, ring.y, prog - 40, prog + 60);
    const off = n.d > R * 1.8;
    const touch = !off && n.d > R - 7;
    if (off){ setLit(false); message('Die Schlinge muss um den Draht bleiben! Zurück zur grünen Stelle.'); drawRing(); return; }
    message('');
    if (n.i > prog) prog = n.i;
    svg.querySelector('#done').setAttribute('d', 'M' + P.slice(0, prog + 1).filter((_, i) => i % 3 === 0).map(q => `${q.x} ${q.y}`).join(' L'));
    if (touch){ setLit(true); if (Date.now() - lastHit > 700){ errors++; lastHit = Date.now(); sfx('buzz'); hud(); if (navigator.vibrate) navigator.vibrate(60); } }
    else setLit(false);
    drawRing();
    if (prog >= P.length - 4) win();
  });
  const up = () => { if (drag && drag.draw){ drag = null; return; } drag = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);

  function win(){
    state = 'won'; clearInterval(timer); setLit(false); drag = null;
    const secs = Math.round((Date.now() - t0) / 1000);
    const stars = errors === 0 ? 3 : errors <= 3 ? 2 : 1;
    const key = lvl === 'eigen' ? 'eigen' : WORLDS[lvl].id;
    const old = data.best[key];
    if (!old || stars > old.stars || (stars === old.stars && secs < old.secs)) data.best[key] = { stars, secs, errors };
    store.s.funken += stars; save();
    finish(ID, Math.max(...Object.values(data.best).map(b => b.stars)), 3);
    const nextL = lvl !== 'eigen' && lvl + 1 < WORLDS.length;
    celebrate(errors === 0 ? 'Der Lichtwächter schläft weiter!' : 'Geschafft!', `${errors} Berührung${errors === 1 ? '' : 'en'} · ${secs} Sekunden`, stars, () => { if (nextL) lvl++; setup(); }, nextL ? 'Nächstes Level ›' : 'Nochmals spielen');
  }
  function bar(){
    const b = root.querySelector('#bar');
    const open = i => i === 0 || data.best[WORLDS[i - 1].id];
    b.innerHTML = WORLDS.map((w, i) => `<button class="pill" data-l="${i}" style="${lvl === i ? 'outline:3px solid #FFD54A' : ''};${open(i) ? '' : 'opacity:.4'}">${i + 1}. ${w.name.replace(/^(Der|Die|Das) /, '')} ${data.best[w.id] ? '<span class="star">' + '★'.repeat(data.best[w.id].stars) + '</span>' : (open(i) ? '' : '🔒')}</button>`).join('')
      + `<button class="pill" id="own" style="${lvl === 'eigen' ? 'outline:3px solid #FFD54A' : ''}">✎ Eigenen Draht zeichnen</button><button class="pill" id="again">↺ Neu starten</button>`;
    b.querySelectorAll('[data-l]').forEach(x => x.onclick = () => { const i = +x.dataset.l; if (!open(i)){ toast('Schaffe zuerst das Level davor.', 'info'); return; } lvl = i; setup(); });
    b.querySelector('#again').onclick = setup;
    b.querySelector('#own').onclick = startDraw;
  }
  function drawCustom(){
    const d = drawPts.length > 1 ? 'M' + drawPts.map(p => `${Math.round(p.x)} ${Math.round(p.y)}`).join(' L') : '';
    svg.innerHTML = `${DEFS}<rect width="${VW}" height="${VH}" fill="#151C3B"/><rect width="${VW}" height="${VH}" fill="url(#dots)"/>
      <text x="${VW / 2}" y="60" text-anchor="middle" font-size="24" font-weight="800" fill="#FFD54A">Zeichne deinen Draht mit dem Finger oder Stift – von links nach rechts.</text>
      <path d="${d}" stroke="#E4E9F7" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  function startDraw(){
    clearInterval(timer); state = 'draw'; drawPts = []; drawCustom();
    root.querySelector('#bar').innerHTML = `<button class="btn small" id="ok">Fertig – spielen!</button><button class="btn ghost small" id="clr">Löschen</button><button class="btn ghost small" id="cancel">Abbrechen</button>`;
    root.querySelector('#clr').onclick = () => { drawPts = []; drawCustom(); };
    root.querySelector('#cancel').onclick = () => { drawPts = null; setup(); };
    root.querySelector('#ok').onclick = () => {
      if (drawPts.length < 12){ toast('Dein Draht ist noch zu kurz.', 'info'); return; }
      // glätten
      const sm = drawPts.map((p, i, a) => { const q = a.slice(Math.max(0, i - 2), i + 3); return { x: q.reduce((s, v) => s + v.x, 0) / q.length, y: q.reduce((s, v) => s + v.y, 0) / q.length }; });
      custom = 'M' + sm.map(p => `${Math.round(p.x)} ${Math.round(Math.max(100, Math.min(VH - 140, p.y)))}`).join(' L');
      drawPts = null; lvl = 'eigen'; setup();
    };
  }
  setup();
  return () => clearInterval(timer);
}

/* =================== SCHALTER-RÄTSEL =================== */
export function schalterRaetsel(root){
  const ID = 'sr';
  const data = store.s.data.sr || (store.s.data.sr = { best:{} });
  let li = Math.min(LEVELS.length - 1, Object.keys(data.best).length);
  const ui = shell(root, { eyebrow:'Spiel', title:'Schalter-Rätsel', extraPills:'<div class="pill" id="moves"></div>' });
  ui.title('Ziel');
  let L, sw, moves, won;
  function setup(){
    L = LEVELS[li]; moves = 0; won = false;
    sw = {}; L.e.forEach((e, i) => { if (e[0] === 's' || e[0] === 't') sw[i] = !!e[3]; });
    render();
  }
  function edges(){ return L.e.map((e, i) => { const [t, a, b] = e; if (t === 'bat') return { id:'e' + i, type:'bat', a, b }; if (t === 'w') return { id:'e' + i, type:'wire', a, b }; if (t === 'l') return { id:'e' + i, type:'lamp', a, b }; return { id:'e' + i, type:'switch', a, b, closed: sw[i] }; }); }
  function render(){
    const res = solve(edges());
    const lamps = L.e.map((e, i) => e[0] === 'l' ? i : -1).filter(i => i >= 0);
    const litN = lamps.filter(i => res.bright['e' + i] > 0.02).length;
    let s = `${DEFS}<rect width="900" height="620" rx="22" fill="#18214A"/><rect width="900" height="620" rx="22" fill="url(#dots)"/>`;
    const N = L.n;
    // Leitungen zuerst
    L.e.forEach((e, i) => {
      const [t, a, b] = e; const A = N[a], B = N[b];
      const cur = Math.abs(res.cur['e' + i] || 0) > 0.05;
      const col = res.short && cur ? '#FF6B6B' : '#D9823B';
      if (t === 'bat') return;
      s += `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`;
      if (cur && t !== 'l') s += `<line class="flow ${(res.cur['e' + i] || 0) < 0 ? 'rev' : ''}" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#FFE680" stroke-width="5" stroke-dasharray="1 26" stroke-linecap="round"/>`;
    });
    L.e.forEach((e, i) => {
      const [t, a, b] = e; const A = N[a], B = N[b]; const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI;
      if (t === 'bat') s += `<g transform="translate(${mx} ${my}) rotate(${ang - 90}) scale(.55)">${battery({ hot: res.short })}</g><line x1="${A[0]}" y1="${A[1]}" x2="${mx}" y2="${my - 50}" stroke="#D9823B" stroke-width="8"/><line x1="${B[0]}" y1="${B[1]}" x2="${mx}" y2="${my + 50}" stroke="#D9823B" stroke-width="8"/>`;
      if (t === 'l') s += `<g transform="translate(${mx} ${my - 18}) scale(.85)">${lamp(res.bright['e' + i] || 0)}</g>`;
      if (t === 's' || t === 't') s += `<g transform="translate(${mx} ${my}) rotate(${ang})" data-sw="${i}" style="cursor:pointer"><rect x="-70" y="-60" width="140" height="110" fill="transparent"/><rect x="-46" y="-14" width="92" height="28" rx="8" fill="#18214A"/>${toggle(sw[i]).replace('<g>', '<g transform="scale(.8)">')}</g>`;
    });
    Object.values(N).forEach(([x, y]) => s += `<circle cx="${x}" cy="${y}" r="7" fill="#D9823B"/>`);
    ui.stage.innerHTML = `<div class="card" style="padding:12px"><svg viewBox="0 0 900 620" style="width:100%;max-height:72vh">${s}</svg></div>`;
    ui.stage.querySelectorAll('[data-sw]').forEach(g => g.addEventListener('pointerdown', () => {
      if (won) return; const i = +g.dataset.sw; sw[i] = !sw[i]; moves++; sfx('click'); render();
    }));
    root.querySelector('#moves').textContent = `Züge: ${moves}`;
    ui.tasks([{ text:`Level ${li + 1}: ${esc(L.name)}`, now:true }, { text: lamps.length === 1 ? `Bringe den Lichtwächter zum Leuchten.` : `Bringe alle ${lamps.length} Lichtwächter zum Leuchten. (${litN}/${lamps.length})`, done: litN === lamps.length && !res.short }, { text:'Kein Kurzschluss!', done: !res.short && litN === lamps.length }]);
    ui.hint(res.short ? '<b>Kurzschluss!</b> Der Strom nimmt eine Abkürzung. Die Batterie wird heiss. Öffne schnell den richtigen Schalter!' : `<b>Tipp:</b> ${esc(L.tip)}`, res.short ? 'warn' : '');
    ui.buttons([{ label:'↺ Neu starten', fn: setup }, ...LEVELS.map((x, k) => ({ k })).filter(() => false)]);
    const lv = document.createElement('div'); lv.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
    lv.innerHTML = LEVELS.map((x, k) => { const open = k === 0 || data.best[k - 1]; return `<button class="pill" data-k="${k}" style="${k === li ? 'outline:3px solid #FFD54A;' : ''}${open ? '' : 'opacity:.4'}">${k + 1} ${data.best[k] ? '<span class="star">' + '★'.repeat(data.best[k]) + '</span>' : ''}</button>`; }).join('');
    ui.side.querySelector('.btns').prepend(lv);
    lv.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = +b.dataset.k; if (k > 0 && !data.best[k - 1]){ toast('Schaffe zuerst das Level davor.', 'info'); return; } li = k; setup(); });
    if (res.short) sfx('buzz');
    if (!won && !res.short && litN === lamps.length){
      won = true;
      const min = minMoves(); const stars = moves <= min ? 3 : moves <= min + 2 ? 2 : 1;
      data.best[li] = Math.max(data.best[li] || 0, stars); store.s.funken += stars; save();
      finish(ID, Math.max(...Object.values(data.best)), 3);
      setTimeout(() => celebrate('Alle Lichtwächter leuchten!', `Du hast ${moves} Züge gebraucht. Am wenigsten geht es mit ${min}.`, stars, () => { if (li + 1 < LEVELS.length) li++; setup(); }, li + 1 < LEVELS.length ? 'Nächstes Level ›' : 'Nochmals spielen'), 500);
    }
  }
  function minMoves(){
    const ids = Object.keys(sw).map(Number); const start = {}; L.e.forEach((e, i) => { if (e[0] === 's' || e[0] === 't') start[i] = !!e[3]; });
    const key = s => ids.map(i => s[i] ? 1 : 0).join('');
    const good = s => { const save = sw; sw = s; const r = solve(edges()); sw = save; return !r.short && L.e.every((e, i) => e[0] !== 'l' || r.bright['e' + i] > 0.02); };
    const seen = new Set([key(start)]); let q = [start], d = 0;
    while (q.length){ for (const s of q) if (good(s)) return d; const nq = []; for (const s of q) for (const i of ids){ const n = { ...s, [i]: !s[i] }; const k = key(n); if (!seen.has(k)){ seen.add(k); nq.push(n); } } q = nq; d++; }
    return 0;
  }
  setup();
}
