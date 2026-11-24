// Werkbank: Bauteile auf den Tisch ziehen, Kabel von Anschluss zu Anschluss ziehen.
import { solve } from './sim.js';
import { DEFS, battery, lamp, toggle, taster, schlinge, clip, symbol, BAT_TERMS, LAMP_TERMS, SW_TERMS } from './draw.js';

// Schaltplan-Modus: Schaltzeichen, Anschlüsse an den Enden, gerade Leitungen
const SCH_TERMS = { bat:{ p:{x:-50,y:0}, m:{x:50,y:0} }, lamp:{ a:{x:-50,y:0}, b:{x:50,y:0} }, toggle:{ a:{x:-50,y:0}, b:{x:50,y:0} } };
function schSymbol(c, res){
  if (c.type === 'bat') return `${symbol('bat')}<text x="-22" y="-26" font-size="20" font-weight="900" fill="#EAF0FF" text-anchor="middle">+</text><text x="24" y="-26" font-size="20" font-weight="900" fill="#EAF0FF" text-anchor="middle">–</text>`;
  if (c.type === 'lamp'){ const b = res.bright[c.id] || 0; return `${b > 0.02 ? '<circle r="60" fill="url(#glow)"/><circle r="22" fill="#FFE680"/>' : ''}${symbol('lamp', b > 0.02 ? '#B8860B' : '#EAF0FF')}`; }
  if (c.type === 'toggle') return c.closed ? `<g stroke="#3DD6B5" stroke-width="5" stroke-linecap="round"><line x1="-50" y1="0" x2="50" y2="0"/><circle cx="-20" r="4" fill="#3DD6B5"/></g>` : symbol('switch', '#FF8A5B');
  return '';
}
import { sfx } from './ui.js';

const W = 920, H = 560;
const TYPES = {
  bat:    { name:'Batterie', terms: BAT_TERMS, r: 85 },
  lamp:   { name:'Lämpchen', terms: LAMP_TERMS, r: 55 },
  toggle: { name:'Kippschalter', terms: SW_TERMS, r: 60 },
  taster: { name:'Taster', terms: SW_TERMS, r: 60 },
  schlinge:{ name:'Schlinge', terms: SW_TERMS, r: 60 },
};
let uid = 0;
const nid = p => p + (++uid) + Math.random().toString(36).slice(2, 5);

/**
 * opts: parts {bat:1, lamp:2, toggle:1 …}, initial {comps, cables}, onChange(res, bench),
 *       lampTap: 'unscrew' | null, locked: [compIds die nicht bewegt/gelöscht werden]
 */
export function createBench(host, opts = {}){
  const st = { comps: [], cables: [], sel: null, drag: null };
  const parts = opts.parts || { bat:1, lamp:1 };
  if (opts.initial){ st.comps = opts.initial.comps.map(c => ({...c})); st.cables = opts.initial.cables.map(c => ({...c})); }
  host.classList.add('bench');
  host.innerHTML = `<svg class="bench-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${DEFS}<rect x="0" y="0" width="${W}" height="${H}" rx="22" fill="#18214A"/><rect x="0" y="0" width="${W}" height="${H}" rx="22" fill="url(#dots)"/><g class="layer"></g></svg>
   <div class="tray"><span class="tray-label">${opts.schema ? 'Symbole' : 'Bauteile – tippe oder ziehe auf den Tisch'}</span><div class="tray-items"></div></div>`;
  const svg = host.querySelector('svg'), layer = host.querySelector('.layer'), tray = host.querySelector('.tray-items'), trayBox = host.querySelector('.tray');
  let res = null;

  const SCH = !!opts.schema;
  const terms = c => SCH ? SCH_TERMS[c.type] : TYPES[c.type].terms;
  const tpos = id => { const [cid, t] = id.split('.'); const c = st.comps.find(x => x.id === cid); if (!c) return null; const o = terms(c)[t]; return { x: c.x + o.x, y: c.y + o.y, c }; };
  const pt = ev => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x, y: q.y }; };
  const inSvg = ev => { const r = svg.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; };
  const count = t => st.comps.filter(c => c.type === t).length;

  function edges(){
    const E = [];
    for (const c of st.comps){
      if (c.type === 'bat') E.push({ id:c.id, type:'bat', a:c.id + '.p', b:c.id + '.m', empty:c.empty });
      else if (c.type === 'lamp') E.push({ id:c.id, type:'lamp', a:c.id + '.a', b:c.id + '.b', out:c.out, broken:c.broken });
      else E.push({ id:c.id, type:'switch', a:c.id + '.a', b:c.id + '.b', closed: c.type === 'toggle' ? !!c.closed : !!c.pressed });
    }
    for (const w of st.cables) E.push({ id:w.id, type:'wire', a:w.a, b:w.b });
    return E;
  }
  function cablePath(w){
    const A = tpos(w.a), B = tpos(w.b); if (!A || !B) return '';
    if (SCH){ // gerade Linien wie mit dem Lineal
      const sx = P => Math.sign(P.x - P.c.x) || 1;
      const a1 = A.x + sx(A) * 28, b1 = B.x + sx(B) * 28;
      if (Math.abs(A.y - B.y) < 2) return `M${A.x} ${A.y} L${B.x} ${B.y}`;
      return `M${A.x} ${A.y} L${a1} ${A.y} L${a1} ${B.y} L${B.x} ${B.y}`;
    }
    const dir = (P) => { const dx = P.x - P.c.x, dy = P.y - P.c.y; const l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
    const da = dir(A), db = dir(B); const k = Math.max(60, Math.min(160, Math.hypot(A.x - B.x, A.y - B.y) * 0.45));
    return `M${A.x} ${A.y} C${A.x + da.x * k} ${A.y + da.y * k}, ${B.x + db.x * k} ${B.y + db.y * k}, ${B.x} ${B.y}`;
  }
  function render(){
    res = solve(edges());
    let s = '';
    // Kabel
    for (const w of st.cables){
      const d = cablePath(w); const i = res.cur[w.id] || 0; const flow = Math.abs(i) > 0.05;
      const sel = st.sel === w.id;
      s += `<path d="${d}" stroke="transparent" stroke-width="34" fill="none" data-cable="${w.id}"/>`;
      s += `<path d="${d}" stroke="${sel ? '#FFD54A' : (res.short && flow ? '#FF6B6B' : (SCH ? '#EAF0FF' : '#D9823B'))}" stroke-width="${SCH ? 5 : 10}" fill="none" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
      if (flow) s += `<path class="flow ${i < 0 ? 'rev' : ''}" d="${d}" stroke="#FFE680" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="1 26" pointer-events="none" style="animation-duration:${Math.max(0.25, 1.6 / Math.min(8, Math.abs(i)))}s"/>`;
    }
    // Bauteile
    for (const c of st.comps){
      let g = '';
      if (SCH) g = schSymbol(c, res);
      else if (c.type === 'bat') g = battery({ hot: res.short, empty: c.empty });
      else if (c.type === 'lamp') g = lamp(res.bright[c.id] || 0, { out: c.out, broken: c.broken });
      else if (c.type === 'toggle') g = toggle(c.closed);
      else if (c.type === 'taster') g = taster(c.pressed);
      else if (c.type === 'schlinge') g = schlinge(c.pressed);
      const r = SCH ? 55 : TYPES[c.type].r;
      s += `<g transform="translate(${c.x} ${c.y})" class="comp ${st.sel === c.id ? 'sel' : ''}" data-comp="${c.id}"><circle r="${r}" fill="transparent"/>${g}</g>`;
    }
    // Büroklammern an der Batterie
    if (!SCH) for (const w of st.cables) for (const e of [w.a, w.b]) if (/\.(p|m)$/.test(e)){ const P = tpos(e); if (P) s += clip(P.x, P.y); }
    // Anschlüsse
    for (const c of st.comps) for (const [t, o] of Object.entries(terms(c))){
      s += `<circle cx="${c.x + o.x}" cy="${c.y + o.y}" r="22" fill="transparent" data-term="${c.id}.${t}"/><circle cx="${c.x + o.x}" cy="${c.y + o.y}" r="9" fill="none" stroke="#FFD54A" stroke-width="2.5" stroke-dasharray="3 3" pointer-events="none" class="term-ring"/>`;
    }
    // ausgewähltes Kabel: Papierkorb
    if (st.sel && st.cables.some(w => w.id === st.sel)){
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', cablePath(st.cables.find(w => w.id === st.sel)));
      layer.appendChild(el); const L = el.getTotalLength(); const m = el.getPointAtLength(L / 2); el.remove();
      s += `<g transform="translate(${m.x} ${m.y})" data-trash="1" class="trash"><circle r="24" fill="#FF6B6B"/><text y="8" text-anchor="middle" font-size="24" font-weight="900" fill="#fff">✕</text></g>`;
    }
    if (st.sel && st.comps.some(c => c.id === st.sel) && !(opts.locked || []).includes(st.sel)){
      const c = st.comps.find(c => c.id === st.sel); const r = TYPES[c.type].r;
      s += `<g transform="translate(${c.x + r * 0.8} ${c.y - r * 0.9})" data-trash="1" class="trash"><circle r="22" fill="#FF6B6B"/><text y="8" text-anchor="middle" font-size="22" font-weight="900" fill="#fff">✕</text></g>`;
    }
    if (st.drag && st.drag.mode === 'wire' && st.drag.to){
      const A = tpos(st.drag.from); s += `<line x1="${A.x}" y1="${A.y}" x2="${st.drag.to.x}" y2="${st.drag.to.y}" stroke="#FFD54A" stroke-width="6" stroke-dasharray="10 8" stroke-linecap="round" pointer-events="none"/>`;
    }
    layer.innerHTML = s;
    renderTray();
    opts.onChange && opts.onChange(res, api);
  }
  function renderTray(){
    const items = Object.entries(parts).filter(([t, n]) => n > 0).map(([t, n]) => {
      const left = n - count(t);
      return `<button class="tray-item ${left <= 0 ? 'empty' : ''}" data-add="${t}">${trayIcon(t)}<span>${TYPES[t].name}${n > 1 ? ` (${Math.max(0, left)})` : ''}</span></button>`;
    }).join('');
    const extra = SCH ? `<div class="tray-tip">Leitung: Ziehe von einem <b>gelben Kreis</b> zum anderen.</div>` : `<div class="tray-tip">Kabel: Ziehe von einem <b>gelben Kreis</b> zum anderen.</div>`;
    if (tray.dataset.sig !== items){ tray.innerHTML = items + extra; tray.dataset.sig = items; }
  }
  function trayIcon(t){
    if (SCH) return `<svg viewBox="-60 -40 120 80" width="70" height="46">${symbol(t === 'toggle' ? 'switch' : t)}</svg>`;
    const inner = t === 'bat' ? `<g transform="scale(.32)">${battery({label:false})}</g>` : t === 'lamp' ? `<g transform="translate(0 -6) scale(.5)">${lamp(0)}</g>` : `<g transform="scale(.45)">${t === 'toggle' ? toggle(false) : t === 'taster' ? taster(false) : schlinge(false)}</g>`;
    return `<svg viewBox="-40 -40 80 80" width="56" height="56">${inner}</svg>`;
  }
  function freeSpot(type){
    const spots = [[200,300],[680,300],[450,150],[450,440],[200,130],[700,130],[200,460],[700,460]];
    for (const [x, y] of spots) if (!st.comps.some(c => Math.hypot(c.x - x, c.y - y) < 130)) return { x, y };
    return { x: 450, y: 300 };
  }
  function add(type, at){
    if (count(type) >= (parts[type] || 0)){ sfx('no'); return; }
    const p = at || freeSpot(type);
    const c = { id: nid(type[0].toUpperCase()), type, x: clampX(p.x), y: clampY(p.y) };
    st.comps.push(c); st.sel = null; sfx('tick'); render();
  }
  const clampX = x => Math.max(90, Math.min(W - 90, x));
  const clampY = y => Math.max(90, Math.min(H - 70, y));
  function removeComp(id){
    if ((opts.locked || []).includes(id)) return;
    st.comps = st.comps.filter(c => c.id !== id); st.cables = st.cables.filter(w => !w.a.startsWith(id + '.') && !w.b.startsWith(id + '.')); st.sel = null; render();
  }
  function nearestTerm(p, except){
    let best = null, bd = 34;
    for (const c of st.comps) for (const [t, o] of Object.entries(terms(c))){ const id = c.id + '.' + t; if (id === except) continue; const d = Math.hypot(c.x + o.x - p.x, c.y + o.y - p.y); if (d < bd){ bd = d; best = id; } }
    return best;
  }

  // ---- Zeiger ----
  svg.addEventListener('pointerdown', ev => {
    const t = ev.target.closest('[data-term],[data-comp],[data-cable],[data-trash]');
    const p = pt(ev);
    if (!t){ if (st.sel){ st.sel = null; render(); } return; }
    svg.setPointerCapture(ev.pointerId);
    if (t.dataset.trash){
      if (st.cables.some(w => w.id === st.sel)) st.cables = st.cables.filter(w => w.id !== st.sel), st.sel = null, render();
      else if (st.sel) removeComp(st.sel);
      return;
    }
    if (t.dataset.term){ st.drag = { mode:'wire', from: t.dataset.term, to: p }; st.sel = null; render(); return; }
    if (t.dataset.cable){ st.sel = st.sel === t.dataset.cable ? null : t.dataset.cable; render(); return; }
    const c = st.comps.find(x => x.id === t.dataset.comp);
    if (!c) return;
    if (c.type === 'taster' || c.type === 'schlinge'){ c.pressed = true; render(); }
    st.drag = { mode:'comp', id:c.id, start:p, ox:c.x - p.x, oy:c.y - p.y, moved:false };
  });
  svg.addEventListener('pointermove', ev => {
    if (!st.drag) return; const p = pt(ev);
    if (st.drag.mode === 'wire'){ st.drag.to = p; render(); return; }
    if (st.drag.mode === 'comp'){
      if (!st.drag.moved && Math.hypot(p.x - st.drag.start.x, p.y - st.drag.start.y) < 10) return;
      if ((opts.locked || []).includes(st.drag.id)) return;
      st.drag.moved = true; const c = st.comps.find(x => x.id === st.drag.id);
      c.x = clampX(p.x + st.drag.ox); c.y = clampY(p.y + st.drag.oy); render();
    }
  });
  const up = ev => {
    const d = st.drag; st.drag = null; if (!d) return;
    if (d.mode === 'wire'){
      const p = pt(ev); const to = nearestTerm(p, d.from);
      if (to && !st.cables.some(w => (w.a === d.from && w.b === to) || (w.b === d.from && w.a === to))){
        if (to.split('.')[0] === d.from.split('.')[0] && !opts.allowSelfWire){ /* gleiches Bauteil: trotzdem erlauben (Kurzschluss-Posten) */ }
        st.cables.push({ id: nid('w'), a: d.from, b: to }); sfx('tick');
      }
      render(); return;
    }
    if (d.mode === 'comp'){
      const c = st.comps.find(x => x.id === d.id); if (!c) return;
      if (c.type === 'taster' || c.type === 'schlinge'){ c.pressed = false; }
      if (d.moved){
        // auf die Ablage gezogen = entfernen
        const r = trayBox.getBoundingClientRect();
        if (ev.clientY > r.top && !(opts.locked || []).includes(c.id)){ removeComp(c.id); return; }
        render(); return;
      }
      if (c.type === 'toggle'){ c.closed = !c.closed; sfx('click'); }
      else if (c.type === 'lamp' && opts.lampTap === 'unscrew'){ c.out = !c.out; sfx('click'); }
      else if (c.type !== 'taster' && c.type !== 'schlinge') st.sel = st.sel === c.id ? null : c.id;
      render();
    }
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);

  // ---- Ablage: tippen = hinlegen, ziehen = an Stelle legen ----
  tray.addEventListener('pointerdown', ev => {
    const b = ev.target.closest('[data-add]'); if (!b) return;
    ev.preventDefault();
    const type = b.dataset.add; const ghost = document.createElement('div'); ghost.className = 'dragghost'; ghost.innerHTML = trayIcon(type); document.body.appendChild(ghost);
    let moved = false; const sx = ev.clientX, sy = ev.clientY;
    const mv = e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) moved = true; ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; };
    const fin = e => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', fin); ghost.remove();
      if (!moved) add(type); else if (inSvg(e)) add(type, pt(e)); };
    mv(ev); document.addEventListener('pointermove', mv); document.addEventListener('pointerup', fin);
  });

  const api = {
    get state(){ return st; }, get res(){ return res; }, render,
    set(initial){ st.comps = initial.comps.map(c => ({...c})); st.cables = initial.cables.map(c => ({...c})); st.sel = null; render(); },
    clear(){ st.comps = st.comps.filter(c => (opts.locked || []).includes(c.id)); st.cables = []; st.sel = null; render(); },
    count, setParts(p){ Object.assign(parts, p); render(); },
  };
  render();
  return api;
}

/** Hilfen für Vorlagen */
export function wire(a, b){ return { id: nid('w'), a, b }; }
