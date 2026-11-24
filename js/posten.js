// Posten 1–6
import { createBench, wire } from './bench.js';
import { solve } from './sim.js';
import { DEFS, battery, lamp, symbol, clip, esc } from './draw.js';
import { shell, tasksRunner, stationState, step, finish, toast, sfx, celebrate, gapText, shuffle, store, save } from './ui.js';

const back = () => { location.hash = '#/labor'; };
const mcHtml = (q, opts, name) => `<div class="mc" data-mc="${name}"><div style="font-weight:800;font-size:19px;margin-bottom:10px">${q}</div><div style="display:grid;gap:8px">${opts.map((o, i) => `<button class="choice" data-o="${i}">${o}</button>`).join('')}</div></div>`;
/** Mehrfachauswahl: richtige Antwort = Index; ruft ok(fehler) */
function mc(host, q, opts, right, ok){
  const order = shuffle(opts.map((o, i) => i));
  host.innerHTML = mcHtml(q, order.map(i => opts[i]), 'x');
  let fails = 0;
  host.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    const pick = order[+b.dataset.o];
    if (pick === right){ b.classList.add('right'); sfx('ok'); host.querySelectorAll('[data-o]').forEach(x => x.disabled = true); setTimeout(() => ok(fails), 700); }
    else { b.classList.add('wrong'); b.disabled = true; fails++; sfx('no'); }
  });
}
function lampsOf(bench){ return bench.state.comps.filter(c => c.type === 'lamp'); }

/* =================== POSTEN 1 =================== */
export function p1(root){
  const ID = 'p1';
  const ui = shell(root, { eyebrow:'Posten 1', title:'Der Stromkreis' });
  const s = stationState(ID);
  const defs = [
    { key:'place', text:'Lege die Batterie und das Lämpchen auf den Tisch.' },
    { key:'cables', text:'Verbinde alles mit 2 Kabeln. Ziehe von einem gelben Kreis zum anderen.' },
    { key:'light', text:'Bringe das Lämpchen zum Leuchten.' },
    { key:'open', text:'Entferne ein Kabel (antippen, dann ✕). Was passiert?' },
    { key:'sym', text:'Zeichne deinen Stromkreis als Schaltplan mit Symbolen.' },
  ];
  const draw = tasksRunner(ui, ID, defs);
  let wasLit = !!s.steps.light;
  function partA(){
    ui.title('Dein Auftrag');
    createBench(ui.stage, { parts:{ bat:1, lamp:1 }, onChange(res, b){
      if (b.count('bat') && b.count('lamp')) step(ID, 'place');
      if (b.state.cables.length >= 2 && s.steps.place) step(ID, 'cables');
      if (res.anyLit && !s.steps.light){ step(ID, 'light', 2); toast('Das Lämpchen leuchtet! Der Stromkreis ist <b>geschlossen</b>.'); sfx('ok'); }
      if (res.anyLit) wasLit = true;
      if (wasLit && !res.anyLit && s.steps.light && !s.steps.open){ step(ID, 'open'); toast('Jetzt ist der Stromkreis <b>offen</b>. Das Lämpchen ist dunkel.', 'info', 3500); }
      draw();
      if (s.steps.open) ui.hint('<b>Merke:</b> Der Strom braucht einen geschlossenen Weg: von der Batterie zum Lämpchen und wieder zurück. Fehlt ein Stück, ist der Stromkreis offen.');
      else if (b.state.cables.length >= 2 && !res.anyLit) ui.hint('<b>Tipp:</b> Ein Kabel geht vom <b>Plus</b> zum Lämpchen. Das andere geht vom Lämpchen zurück zum <b>Minus</b>.');
      else ui.hint('<b>Wusstest du?</b> Deine Batterie hat zwei Streifen: einen kurzen (Plus) und einen langen (Minus).');
      ui.buttons(s.steps.open ? [{ label:'Weiter zu den Symbolen ›', primary:true, fn: partB }] : []);
    }});
  }
  function partB(){
    ui.title('Symbole');
    const parts = [ { k:'bat', n:'Batterie' }, { k:'lamp', n:'Lämpchen' }, { k:'wire', n:'Kabel' }, { k:'switch', n:'Schalter' } ];
    const symOrder = shuffle(parts.map(p => p.k));
    const matched = {}; let pick = null; let fails = 0;
    const partIcon = k => k === 'bat' ? `<g transform="scale(.45)">${battery({label:false})}</g>` : k === 'lamp' ? `<g transform="scale(.6)">${lamp(0)}</g>` : k === 'wire' ? `<path d="M-50 0 C-20 -30, 20 30, 50 0" stroke="#D9823B" stroke-width="8" fill="none" stroke-linecap="round"/>` : `<g transform="scale(.7)"><rect x="-58" y="-8" width="116" height="36" rx="8" fill="#39437A"/><circle cx="-40" cy="0" r="9" fill="#D5DBEE"/><circle cx="40" cy="0" r="9" fill="#D5DBEE"/><line x1="-40" y1="0" x2="28" y2="-42" stroke="#FF8A5B" stroke-width="9" stroke-linecap="round"/></g>`;
    function drawMatch(){
      ui.stage.innerHTML = `<div class="card"><div class="lab-label">Welches Symbol gehört zu welchem Bauteil? Tippe zuerst ein Bauteil, dann sein Symbol.</div>
       <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:10px">${parts.map(p => `<button class="choice ${pick === p.k ? 'sel' : ''} ${matched[p.k] ? 'right' : ''}" data-part="${p.k}" style="text-align:center"><svg viewBox="-70 -70 140 120" width="120" height="100">${DEFS}${partIcon(p.k)}</svg><div>${p.n}</div></button>`).join('')}</div>
       <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px">${symOrder.map(k => `<button class="choice ${matched[k] ? 'right' : ''}" data-sym="${k}" style="text-align:center"><svg viewBox="-60 -40 120 80" width="120" height="80">${symbol(k, matched[k] ? '#3DD6B5' : '#EAF0FF')}</svg><div style="font-size:15px;color:#8E9BD6">${matched[k] ? parts.find(p => p.k === k).n : 'Symbol'}</div></button>`).join('')}</div></div>
       <div id="plan" style="margin-top:16px"></div>`;
      const mDone = Object.keys(matched).length === 4;
      ui.tasks([{ text:'Verbinde jedes Bauteil mit seinem Symbol.', done: mDone, now: !mDone }, { text:'Zeichne den Schaltplan ohne Schalter.', now: mDone }, { text:'Zeichne den Schaltplan mit Schalter.' }]);
      ui.stage.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { if (matched[b.dataset.part]) return; pick = b.dataset.part; sfx('tick'); drawMatch(); });
      ui.stage.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => {
        if (!pick){ toast('Tippe zuerst auf ein Bauteil oben.', 'info'); return; }
        if (b.dataset.sym === pick){ matched[pick] = true; pick = null; sfx('ok'); if (Object.keys(matched).length === 4){ step(ID, 'match'); toast('Alle Symbole richtig! Jetzt zeichnest du selber.'); setTimeout(() => plan(0), 1200); drawMatch(); return; } }
        else { fails++; sfx('no'); toast('Das passt nicht. Schau genau!', 'warn'); }
        drawMatch();
      });
    }
    let planStep = 0;
    // Schaltpläne selber zeichnen: Symbole liegen bereit, Leitungen ziehen
    const PLANS = [
      { q:'Zeichne deinen Stromkreis: Ziehe die Leitungen von der Batterie zum Lämpchen und wieder zurück.', parts:{ bat:1, lamp:1 },
        comps:[{ id:'B1', type:'bat', x:300, y:430 }, { id:'L1', type:'lamp', x:620, y:150 }],
        ok:(res) => res.anyLit && !res.short },
      { q:'Jetzt mit Schalter: Zeichne die Leitungen und schliesse den Schalter (antippen).', parts:{ bat:1, lamp:1, toggle:1 },
        comps:[{ id:'B1', type:'bat', x:300, y:450 }, { id:'L1', type:'lamp', x:640, y:300 }, { id:'S1', type:'toggle', x:330, y:140 }],
        ok:(res) => res.anyLit && !res.short && Math.abs(res.cur.S1 || 0) > 0.05 },
    ];
    function plan(i){
      planStep = i; const P = PLANS[i];
      ui.stage.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;gap:10px"><div class="card" style="padding:14px 18px;font-size:19px;font-weight:800">${i + 1}/2 · ${P.q}</div><div id="pl" style="flex:1;min-height:0"></div></div>`;
      let fertig = false;
      createBench(ui.stage.querySelector('#pl'), { schema:true, parts:P.parts, initial:{ comps:P.comps, cables:[] }, locked:P.comps.map(c => c.id), onChange(res){
        if (fertig || !P.ok(res)) return;
        fertig = true; sfx('ok');
        toast(i === 0 ? 'Richtig! Dein Schaltplan ist ein geschlossener Stromkreis.' : 'Super! Der Schalter schliesst den Stromkreis.');
        setTimeout(() => { if (i + 1 < PLANS.length) plan(i + 1); else done(); }, 1400);
      }});
      ui.tasks([{ text:'Verbinde jedes Bauteil mit seinem Symbol.', done:true }, { text:'Zeichne den Schaltplan ohne Schalter.', done: i > 0, now: i === 0 }, { text:'Zeichne den Schaltplan mit Schalter.', now: i === 1 }]);
      ui.hint('<b>So geht\'s:</b> Ziehe mit dem Finger oder Stift von einem <b>gelben Kreis</b> zum anderen. Die Leitung wird automatisch gerade. Falsche Leitung? Antippen, dann ✕.');
      ui.buttons([]);
    }
    function done(){
      step(ID, 'sym', 2); draw();
      ui.hint('<b>Super!</b> So zeichnet man Stromkreise: mit Symbolen und geraden Linien. Zeichne den Stromplan deines Spiels jetzt in dein Dossier (1.6 Stromplan).');
      ui.buttons([{ label:'Fertig ✓', primary:true, fn(){ const stars = fails === 0 ? 3 : fails <= 2 ? 2 : 1; finish(ID, stars); celebrate('Posten 1 geschafft!', 'Du weisst jetzt: Strom fliesst nur in einem geschlossenen Stromkreis.', stars, back); } }]);
    }
    ui.hint('<b>Tipp:</b> Ein Schaltplan ist wie eine Landkarte für den Strom.');
    ui.buttons([{ label:'‹ Zurück zur Werkbank', fn: partA }]);
    drawMatch();
  }
  if (s.steps.open) partB(); else { partA(); draw(); }
}

/* =================== POSTEN 2 =================== */
export const OBJEKTE = [
  { id:'klammer', n:'Büroklammer', g:400, mat:'#C7CEE6', sh:'clip' },
  { id:'schluessel', n:'Schlüssel', g:400, mat:'#E7C65A', sh:'key' },
  { id:'muenze', n:'Münze', g:400, mat:'#D9B85C', sh:'disc' },
  { id:'alu', n:'Alufolie', g:400, mat:'#DDE2EE', sh:'sheet' },
  { id:'gabel', n:'Gabel', g:400, mat:'#C7CEE6', sh:'bar' },
  { id:'schere', n:'Schere (Metall)', g:400, mat:'#B0B8CF', sh:'bar' },
  { id:'draht', n:'Schweissdraht', g:400, mat:'#9AA3BD', sh:'wire' },
  { id:'nagel', n:'Nagel', g:400, mat:'#8E98B0', sh:'bar' },
  { id:'kupfer', n:'Kupferdraht (blank)', g:400, mat:'#D9823B', sh:'wire' },
  { id:'mine', n:'Bleistiftmine', g:0.9, mat:'#4A4F60', sh:'bar' },
  { id:'holz', n:'Holzstab', g:0, mat:'#C99A62', sh:'bar' },
  { id:'gummi', n:'Radiergummi', g:0, mat:'#F49AB0', sh:'block' },
  { id:'lineal', n:'Plastiklineal', g:0, mat:'#7FC8F0', sh:'bar' },
  { id:'wolle', n:'Wollfaden', g:0, mat:'#E07AD0', sh:'wire' },
  { id:'murmel', n:'Glasmurmel', g:0, mat:'#7FE0D0', sh:'ball' },
  { id:'isoband', n:'Isolierband', g:0, mat:'#2B2F3A', sh:'band' },
  { id:'papier', n:'Papier', g:0, mat:'#F4F5FA', sh:'sheet' },
  { id:'korken', n:'Korken', g:0, mat:'#B98A55', sh:'block' },
  { id:'gummiband', n:'Gummiband', g:0, mat:'#E0B04A', sh:'band' },
  { id:'stoff', n:'Stoffstück', g:0, mat:'#7C8CE0', sh:'sheet' },
];
function objShape(o, w = 160){
  const h = w / 2, c = o.mat;
  switch (o.sh){
    case 'disc': return `<ellipse rx="${h * .45}" ry="${h * .45}" fill="${c}" stroke="#A88A30" stroke-width="4"/>`;
    case 'ball': return `<circle r="${h * .4}" fill="${c}" opacity=".85"/><circle cx="-10" cy="-10" r="8" fill="#fff" opacity=".6"/>`;
    case 'sheet': return `<path d="M${-h} -22 L${h} -28 L${h - 6} 24 L${-(h - 4)} 20Z" fill="${c}" stroke="#9AA3BD" stroke-width="2"/>`;
    case 'block': return `<rect x="-${h * .6}" y="-22" width="${h * 1.2}" height="44" rx="10" fill="${c}"/>`;
    case 'wire': return `<path d="M-${h} 0 C-${h / 2} -26, ${h / 2} 26, ${h} 0" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    case 'band': return `<ellipse rx="${h * .7}" ry="20" fill="none" stroke="${c}" stroke-width="12"/>`;
    case 'key': return `<circle cx="${-(h - 30)}" r="${Math.min(26, h * .45)}" fill="none" stroke="${c}" stroke-width="${w > 120 ? 11 : 7}"/><rect x="${-(h - 56)}" y="-7" width="${w - 70}" height="14" rx="4" fill="${c}"/><rect x="${h - 30}" y="7" width="10" height="16" fill="${c}"/><rect x="${h - 52}" y="7" width="10" height="11" fill="${c}"/>`;
    case 'clip': return `<rect x="-${h}" y="-16" width="${w}" height="32" rx="16" fill="none" stroke="${c}" stroke-width="5"/><rect x="${-(h - 14)}" y="-8" width="${w - 40}" height="16" rx="8" fill="none" stroke="${c}" stroke-width="4"/>`;
    default: return `<rect x="-${h}" y="-9" width="${w}" height="18" rx="7" fill="${c}"/>`;
  }
}
export function p2(root){
  const ID = 'p2';
  const ui = shell(root, { eyebrow:'Posten 2', title:'Leiter und Nichtleiter' });
  const s = stationState(ID);
  const tab = store.s.data.p2 || (store.s.data.p2 = { tests:{}, chain:0 });
  let cur = null, phase = 'pick', guess = null;
  ui.title('Deine Tabelle');
  function scene(obj, lit){
    const g = obj && phase === 'tested' ? obj.g : 0;
    const res = solve([{ id:'B', type:'bat', a:'p', b:'m' }, { id:'L', type:'lamp', a:'p', b:'x' }, { id:'O', type:'cond', a:'x', b:'m', conducts: g > 0, g }]);
    const br = res.bright.L || 0;
    return `<svg viewBox="0 0 900 420" style="width:100%;max-height:44vh">${DEFS}<rect width="900" height="420" rx="22" fill="#18214A"/><rect width="900" height="420" rx="22" fill="url(#dots)"/>
     <path d="M110 140 C110 40, 520 30, 650 182" stroke="#D9823B" stroke-width="10" fill="none" stroke-linecap="round"/>
     <path d="M710 182 C780 230, 780 330, 620 340" stroke="#D9823B" stroke-width="10" fill="none" stroke-linecap="round"/>
     <path d="M186 126 C260 126, 260 340, 340 340" stroke="#D9823B" stroke-width="10" fill="none" stroke-linecap="round"/>
     ${br > 0 ? `<path d="M110 140 C110 40, 520 30, 650 182" stroke="#FFE680" stroke-width="6" fill="none" stroke-dasharray="1 26" class="flow"/>` : ''}
     <g transform="translate(150 200)">${battery()}</g>${clip(110, 142)}${clip(186, 128)}
     <g transform="translate(680 138)">${lamp(br)}</g>
     <circle cx="346" cy="340" r="13" fill="#C7CEE6"/><circle cx="614" cy="340" r="13" fill="#C7CEE6"/>
     ${obj ? `<g transform="translate(480 340)">${objShape(obj, 260)}</g><text x="480" y="400" text-anchor="middle" font-size="20" font-weight="800" fill="#FFE680">${esc(obj.n)}</text>` : `<text x="480" y="300" text-anchor="middle" font-size="19" fill="#8E9BD6">Tippe unten einen Gegenstand an.</text>`}
    </svg>`;
  }
  const tested = () => Object.keys(tab.tests).length;
  const right = () => Object.values(tab.tests).filter(t => t.ok).length;
  function render(){
    const obj = cur && OBJEKTE.find(o => o.id === cur);
    let ctl = '';
    if (phase === 'guess') ctl = `<div class="card" style="display:flex;gap:14px;align-items:center;margin-top:12px"><div style="flex:1;font-size:20px;font-weight:800">Was vermutest du? Leitet ${esc(obj.n)} Strom?</div><button class="btn" data-g="1">ja</button><button class="btn ghost" data-g="0">nein</button></div>`;
    else if (phase === 'test') ctl = `<div class="card" style="display:flex;gap:14px;align-items:center;margin-top:12px"><div style="flex:1;font-size:19px">Du vermutest: <b>${guess ? 'leitet' : 'leitet nicht'}</b>.</div><button class="btn" id="test">Testen!</button></div>`;
    else if (phase === 'tested'){ const t = tab.tests[cur]; ctl = `<div class="card" style="margin-top:12px;font-size:19px;${t.ok ? '' : 'background:#3A2A1E'}"><b>${obj.g > 0 ? (obj.g < 5 ? 'Das Lämpchen leuchtet schwach: Die Bleistiftmine leitet ein wenig!' : 'Das Lämpchen leuchtet: ' + esc(obj.n) + ' leitet Strom.') : 'Das Lämpchen bleibt dunkel: ' + esc(obj.n) + ' leitet keinen Strom.'}</b> ${t.ok ? 'Du hast richtig vermutet!' : 'Deine Vermutung war anders. Das ist nicht schlimm – so lernt man!'}</div>`; }
    const grid = `<div class="lab-label" style="margin-top:14px">Gegenstände – tippe einen an</div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${OBJEKTE.map(o => { const t = tab.tests[o.id]; return `<button class="choice" data-obj="${o.id}" style="text-align:center;font-size:15px;padding:8px 4px;${t ? 'opacity:.55' : ''}"><svg viewBox="-60 -30 120 60" width="70" height="34">${objShape(o, 90)}</svg><div>${esc(o.n)}${t ? (o.g > 0 ? ' ✓' : ' ✕') : ''}</div></button>`; }).join('')}</div>`;
    ui.stage.innerHTML = scene(obj) + ctl + grid;
    ui.stage.querySelectorAll('[data-obj]').forEach(b => b.onclick = () => { if (phase === 'test' || phase === 'guess'){ /* neu wählen erlaubt */ } cur = b.dataset.obj; phase = tab.tests[cur] ? 'tested' : 'guess'; sfx('tick'); render(); });
    ui.stage.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { guess = b.dataset.g === '1'; phase = 'test'; render(); });
    const tb = ui.stage.querySelector('#test'); if (tb) tb.onclick = () => {
      const o = OBJEKTE.find(x => x.id === cur); const leit = o.g > 0; tab.tests[cur] = { guess, ok: guess === leit }; phase = 'tested';
      store.s.funken += 1; save(); sfx(leit ? 'ok' : 'buzz'); render();
      if (tested() >= 12) step(ID, 'test12', 2);
    };
    side();
  }
  function side(){
    const L = OBJEKTE.filter(o => tab.tests[o.id] && o.g > 0), N = OBJEKTE.filter(o => tab.tests[o.id] && !(o.g > 0));
    ui.tasks([{ text:`Teste mindestens 12 Gegenstände. (${Math.min(12, tested())}/12)`, done: !!s.steps.test12, now: !s.steps.test12 }, { text:'Was hast du gelernt? Fülle den Satz aus.', done: !!s.steps.learn, now: !!s.steps.test12 && !s.steps.learn }, { text:'Bonus: Baue eine lange Kette aus Leitern.', done: !!s.steps.chain, now: !!s.steps.learn && !s.steps.chain }]);
    ui.hint(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:15px;line-height:1.6"><div><b style="color:#3DD6B5">leitet ${L.length}/10</b><br>${L.map(o => esc(o.n)).join('<br>')}</div><div><b style="color:#FF8A8A">leitet nicht ${N.length}/10</b><br>${N.map(o => esc(o.n)).join('<br>')}</div></div>${tested() ? `<div style="margin-top:8px">Richtig vermutet: <b>${right()} von ${tested()}</b></div>` : ''}`);
    const btns = [];
    if (s.steps.test12 && !s.steps.learn) btns.push({ label:'Was habe ich gelernt? ›', primary:true, fn: learn });
    if (s.steps.learn) btns.push({ label:'Bonus: Leiter-Kette ›', primary:!s.steps.chain, fn: chain });
    if (s.steps.learn) btns.push({ label:'Posten abschliessen ✓', primary: !!s.steps.chain, fn: end });
    ui.buttons(btns);
  }
  function learn(){
    ui.stage.innerHTML = `<div class="card"><div class="lab-label">Ich habe gelernt</div><div id="gt"></div></div>`;
    gapText(ui.stage.querySelector('#gt'), { html:'Gegenstände aus {0} leiten Strom. Gegenstände aus {1}, Holz, Glas, Gummi oder Stoff leiten {2} Strom. Die Bleistiftmine leitet nur ein {3}.', words: shuffle(['Metall','Kunststoff','keinen','wenig','viel','Papier']), answers:['Metall','Kunststoff','keinen','wenig'], onDone(){ step(ID, 'learn', 2); toast('Genau! Metalle sind gute Leiter.'); setTimeout(render, 900); } });
    side();
  }
  function chain(){
    let links = [];
    const drawChain = () => {
      const all = links.map(id => OBJEKTE.find(o => o.id === id));
      const ok = all.length > 0 && all.every(o => o.g > 5);
      const br = ok ? 1 : 0;
      ui.stage.innerHTML = `<div class="card"><div class="lab-label">Leiter-Kette: Tippe Gegenstände an. Leuchtet das Lämpchen noch?</div>
       <svg viewBox="0 0 900 230" style="width:100%">${DEFS}<g transform="translate(90 140) scale(.6)">${battery()}</g><g transform="translate(820 70) scale(.8)">${lamp(br)}</g>
       <path d="M70 100 C70 30, 700 20, 796 106" stroke="#D9823B" stroke-width="8" fill="none"/><path d="M114 92 C150 92, 150 190, 170 190" stroke="#D9823B" stroke-width="8" fill="none"/><path d="M844 106 C880 150, 870 190, 800 190" stroke="#D9823B" stroke-width="8" fill="none"/>
       ${all.map((o, i) => `<g transform="translate(${200 + i * 100 + 40} 190)">${objShape(o, 90)}</g>`).join('')}
       ${all.length < 6 ? `<rect x="${200 + all.length * 100}" y="165" width="80" height="50" rx="10" fill="none" stroke="#FFD54A" stroke-width="3" stroke-dasharray="6 6"/>` : ''}
       </svg><div style="font-size:19px;font-weight:800;margin:6px 0">${all.length ? (ok ? `Es leuchtet! Deine Kette: ${all.length} Gegenstände.` : 'Dunkel! Ein Gegenstand in der Kette leitet nicht.') : 'Noch leer.'}</div>
       <div style="display:flex;gap:8px;flex-wrap:wrap">${OBJEKTE.map(o => `<button class="word" data-c="${o.id}">${esc(o.n)}</button>`).join('')}</div>
       <button class="btn ghost small" id="clr" style="margin-top:10px">Kette leeren</button></div>`;
      ui.stage.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { if (links.length >= 6) return toast('Die Kette ist voll (6).', 'info'); links.push(b.dataset.c); sfx('tick'); drawChain();
        const L = links.map(id => OBJEKTE.find(o => o.id === id)); if (L.every(o => o.g > 5) && L.length > (tab.chain || 0)){ tab.chain = L.length; save(); } if (L.length >= 5 && L.every(o => o.g > 5)){ if (step(ID, 'chain', 3)) toast('Super! Eine Kette mit 5 Leitern!'); side(); } });
      ui.stage.querySelector('#clr').onclick = () => { links = []; drawChain(); };
    };
    drawChain(); side();
  }
  function end(){
    const r = right(), t = tested(); const q = t ? r / t : 0;
    const stars = q >= .9 ? 3 : q >= .7 ? 2 : 1;
    finish(ID, stars + (s.steps.chain ? 0 : 0));
    celebrate('Posten 2 geschafft!', `Du hast ${t} Gegenstände getestet und ${r}-mal richtig vermutet. Zeige deine Tabelle der Lehrperson.`, stars, back);
  }
  render();
}

/* =================== POSTEN 3 =================== */
export function p3(root){
  const ID = 'p3';
  const ui = shell(root, { eyebrow:'Posten 3', title:'Der Schalter' });
  const s = stationState(ID);
  const seen = store.s.data.p3 || (store.s.data.p3 = {});
  const NAMES = { toggle:'Kippschalter', taster:'Taster', schlinge:'Schlinge am Draht' };
  const defs = [
    { key:'build', text:'Baue einen Schalter in deinen Stromkreis ein. Schalte das Lämpchen ein und aus.' },
    { key:'all3', text:'Probiere alle 3 Schalter aus: Kippschalter, Taster und Schlinge.' },
    { key:'frage', text:'Beantworte die Frage: Was macht ein Schalter?' },
    { key:'eigen', text:'Baue deinen eigenen Schalter in der Werkstatt.' },
    { key:'heft', text:'Zeichne den Plan mit dem Schaltersymbol in dein Heft.' },
  ];
  const draw = tasksRunner(ui, ID, defs);
  const controls = (b, res) => {
    // Welche Schalter schalten das Lämpchen wirklich?
    const out = [];
    for (const c of b.state.comps.filter(c => ['toggle','taster','schlinge'].includes(c.type))){
      const closed = c.type === 'toggle' ? !!c.closed : !!c.pressed;
      const E = [];
      for (const k of b.state.comps){
        if (k.type === 'bat') E.push({ id:k.id, type:'bat', a:k.id + '.p', b:k.id + '.m' });
        else if (k.type === 'lamp') E.push({ id:k.id, type:'lamp', a:k.id + '.a', b:k.id + '.b' });
        else E.push({ id:k.id, type:'switch', a:k.id + '.a', b:k.id + '.b', closed: k.id === c.id ? !closed : (k.type === 'toggle' ? !!k.closed : !!k.pressed) });
      }
      b.state.cables.forEach(w => E.push({ id:w.id, type:'wire', a:w.a, b:w.b }));
      const r2 = solve(E);
      if (r2.anyLit !== res.anyLit && !res.short) out.push({ c, closed, lit: res.anyLit });
    }
    return out;
  };
  function bench(){
    ui.title('Dein Auftrag');
    createBench(ui.stage, { parts:{ bat:1, lamp:1, toggle:1, taster:1, schlinge:1 }, onChange(res, b){
      for (const x of controls(b, res)){
        const k = seen[x.c.type] || (seen[x.c.type] = {});
        if (x.closed && x.lit && !k.on){ k.on = 1; save(); }
        if (!x.closed && !x.lit && !k.off){ k.off = 1; save(); }
        if (k.on && k.off && step(ID, 'build', 2)) toast('Super! Mit dem Schalter machst du den Stromkreis <b>auf und zu</b>.');
      }
      const ok3 = ['toggle','taster','schlinge'].every(t => seen[t] && seen[t].on && seen[t].off);
      if (ok3 && step(ID, 'all3', 2)) toast('Alle 3 Schalter ausprobiert!');
      draw();
      const tried = ['toggle','taster','schlinge'].map(t => `${NAMES[t]}: ${seen[t] && seen[t].on && seen[t].off ? '✓' : '–'}`).join('<br>');
      ui.hint(`<b>So geht's:</b> Kippschalter antippen. Taster und Schlinge gedrückt halten.<br><br>${tried}<br><br><b>Tausch:</b> Ziehe einen Schalter auf die Ablage, dann einen anderen auf den Tisch.`);
      ui.buttons(s.steps.all3 ? [{ label:'Weiter ›', primary:true, fn: frage }] : []);
    }});
  }
  function frage(){
    ui.title('Dein Auftrag'); draw();
    ui.stage.innerHTML = `<div class="card" id="q"></div>`;
    mc(ui.stage.querySelector('#q'), 'Was macht ein Schalter?', ['Er öffnet und schliesst den Stromkreis.', 'Er macht den Strom stärker.', 'Er braucht eine eigene Batterie.', 'Er macht aus Holz einen Leiter.'], 0, fails => { step(ID, 'frage'); s.fails = (s.fails || 0) + fails; save(); draw(); werkstatt(); });
    ui.hint('<b>Aha!</b> Ein Schalter ist wie eine Brücke für den Strom. Ist die Brücke offen, kommt der Strom nicht weiter.');
    ui.buttons([{ label:'‹ Zurück zur Werkbank', fn: bench }]);
  }
  function werkstatt(){
    draw();
    const MAT = [ { n:'Holzbrettchen', ok:1 }, { n:'2 Reissnägel', ok:1 }, { n:'Büroklammer', ok:1 }, { n:'2 Kabel', ok:1 }, { n:'Gummiband', ok:0 }, { n:'Wollfaden', ok:0 }, { n:'Radiergummi', ok:0 }, { n:'Plastiklöffel', ok:0 } ];
    const order = shuffle(MAT.map((m, i) => i)); const chosen = new Set(); let closed = false;
    const drawW = () => {
      const allOk = MAT.every((m, i) => m.ok ? chosen.has(i) : !chosen.has(i));
      ui.stage.innerHTML = `<div class="card"><div class="lab-label">Werkstatt: Wähle das Material für deinen Schalter</div>
       <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${order.map(i => `<button class="choice ${chosen.has(i) ? 'sel' : ''}" data-m="${i}" style="text-align:center">${MAT[i].n}</button>`).join('')}</div>
       ${allOk ? `<svg viewBox="0 0 900 330" style="width:100%;margin-top:12px">${DEFS}
          <rect x="250" y="190" width="420" height="90" rx="10" fill="url(#wood)"/>
          <circle cx="360" cy="230" r="16" fill="#C7CEE6" stroke="#8E98B0" stroke-width="3"/><circle cx="560" cy="230" r="16" fill="#C7CEE6" stroke="#8E98B0" stroke-width="3"/>
          <g transform="rotate(${closed ? 0 : -35} 360 230)" data-sw="1" style="cursor:pointer"><rect x="350" y="214" width="230" height="32" rx="16" fill="none" stroke="#DDE2EE" stroke-width="6"/><rect x="368" y="222" width="180" height="16" rx="8" fill="none" stroke="#DDE2EE" stroke-width="4"/><rect x="340" y="190" width="260" height="80" fill="transparent"/></g>
          <path d="M360 230 C300 120, 160 120, 120 140" stroke="#D9823B" stroke-width="8" fill="none"/><path d="M560 230 C620 120, 700 90, 740 110" stroke="#D9823B" stroke-width="8" fill="none"/>
          <g transform="translate(110 220) scale(.55)">${battery()}</g><g transform="translate(790 120) scale(.8)">${lamp(closed ? 1 : 0)}</g>
          <text x="460" y="318" text-anchor="middle" font-size="19" font-weight="800" fill="#FFD54A">Tippe auf die Büroklammer!</text></svg>` : `<div style="margin-top:12px;color:#C9D3FF;font-size:17px">Wähle genau das Material, das du brauchst. ${chosen.size ? '' : '(Tipp: 4 Dinge)'}</div>`}
      </div>`;
      ui.stage.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const i = +b.dataset.m; if (chosen.has(i)) chosen.delete(i); else { chosen.add(i); if (!MAT[i].ok){ sfx('no'); toast(`${MAT[i].n}? Leitet das Strom? Brauchst du das wirklich?`, 'info'); } else sfx('tick'); } drawW(); });
      const sw = ui.stage.querySelector('[data-sw]'); if (sw) sw.onclick = () => { closed = !closed; sfx('click'); drawW(); if (closed && step(ID, 'eigen', 3)){ toast('Dein eigener Schalter funktioniert!'); heft(); } };
    };
    drawW();
    ui.hint('<b>So funktioniert er:</b> Die Büroklammer hängt an einem Reissnagel. Drehst du sie zum zweiten Reissnagel, ist der Stromkreis geschlossen.');
    ui.buttons([]);
  }
  function heft(){
    draw();
    ui.hint('<b>Heft:</b> Zeichne einen Stromkreis mit Batterie, Lämpchen und Schalter. So sieht das Schaltersymbol aus:<br><svg viewBox="-60 -40 120 60" width="160" height="80">' + symbol('switch', '#FFD54A') + '</svg>');
    ui.buttons([{ label:'Ich habe gezeichnet ✓', primary:true, fn(){ const f = s.fails || 0; const stars = f === 0 ? 3 : f === 1 ? 2 : 1; finish(ID, stars); celebrate('Posten 3 geschafft!', 'Ein Schalter öffnet und schliesst den Stromkreis. Dein Heisser Draht ist auch ein Schalter: die Schlinge!', stars, back); } }]);
  }
  if (s.steps.eigen) { werkstatt(); heft(); } else if (s.steps.frage) werkstatt(); else if (s.steps.all3) frage(); else bench();
  draw();
}

/* =================== POSTEN 4 =================== */
export function p4(root){
  const ID = 'p4';
  const ui = shell(root, { eyebrow:'Posten 4', title:'Der Kurzschluss' });
  const s = stationState(ID);
  const defs = [
    { key:'short', text:'Verbinde Plus und Minus direkt mit einem Kabel. (Nur in der App!)' },
    { key:'obs', text:'Beobachte: Was passiert mit dem Lämpchen und der Batterie?' },
    { key:'fix', text:'Klemme das Kurzschluss-Kabel sofort ab. Leuchtet das Lämpchen wieder?' },
    { key:'text', text:'Schreibe Sätze: Wie entsteht ein Kurzschluss?' },
  ];
  const draw = tasksRunner(ui, ID, defs);
  const initial = { comps:[{ id:'B1', type:'bat', x:230, y:330 }, { id:'L1', type:'lamp', x:680, y:250 }], cables:[ wire('B1.p', 'L1.a'), wire('B1.m', 'L1.b') ] };
  let fails = 0;
  function benchPart(){
    ui.stage.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;gap:12px"><div id="b" style="flex:1;min-height:0"></div><div id="q"></div></div>`;
    createBench(ui.stage.querySelector('#b'), { parts:{ bat:1, lamp:1 }, initial, locked:['B1','L1'], onChange(res){
      if (res.short && step(ID, 'short', 2)){ toast('Achtung! Die Batterie wird heiss. Sofort abklemmen!', 'warn', 4000); sfx('buzz'); setTimeout(ask, 900); }
      if (s.steps.obs && !res.short && res.anyLit && step(ID, 'fix', 2)){ toast('Gut gemacht! Kein Kurzschluss mehr.'); setTimeout(textPart, 900); }
      draw();
      ui.hint(res.short ? '<b>Kurzschluss!</b> Der Strom nimmt die Abkürzung und fliesst nicht mehr durch das Lämpchen. Die Batterie wird heiss.' : '<b>Nie im Werkraum ausprobieren!</b> Und nie etwas an die Steckdose anschliessen.', res.short ? 'warn' : 'warn');
    }});
  }
  function ask(){
    const q = ui.stage.querySelector('#q'); if (!q) return;
    q.innerHTML = '<div class="card" id="q1"></div>';
    mc(q.querySelector('#q1'), 'Was passiert mit dem Lämpchen?', ['Es geht aus.', 'Es leuchtet heller.', 'Es blinkt.'], 0, f1 => { fails += f1;
      mc(q.querySelector('#q1'), 'Was passiert mit der Batterie?', ['Sie wird heiss.', 'Sie wird kalt.', 'Nichts.'], 0, f2 => { fails += f2; step(ID, 'obs'); draw(); q.innerHTML = '<div class="card" style="font-size:19px;font-weight:800">Jetzt schnell: Tippe auf das Kurzschluss-Kabel und entferne es mit ✕!</div>'; });
    });
  }
  function textPart(){
    draw();
    ui.stage.innerHTML = `<div class="card"><div style="font-weight:800;font-size:21px;margin-bottom:8px">Wie entsteht ein Kurzschluss? Setze die Wörter ein.</div><div id="gt"></div></div>`;
    gapText(ui.stage.querySelector('#gt'), { html:'Bei einem Kurzschluss sind Plus und Minus direkt mit einem {0} verbunden. Der Strom nimmt eine {1}. Er fliesst nicht mehr durch das {2}. Die Batterie wird {3}. Das ist {4}! Darum schliesse ich nie etwas an die {5} an.',
      words: shuffle(['Kabel','Abkürzung','Lämpchen','heiss','gefährlich','Steckdose','kalt','Wasser']), answers:['Kabel','Abkürzung','Lämpchen','heiss','gefährlich','Steckdose'],
      onCorrect(){}, onDone(){ step(ID, 'text', 2); draw(); const stars = fails === 0 ? 3 : fails <= 2 ? 2 : 1; finish(ID, stars); celebrate('Posten 4 geschafft!', 'Ein Kurzschluss ist gefährlich. Bei deinem Heissen Draht passiert das nicht, weil das Lämpchen immer im Stromkreis ist.', stars, back); } });
    ui.hint('<b>Gut zu wissen:</b> Bei der Steckdose ist ein Kurzschluss sehr gefährlich. Darum gibt es im Haus Sicherungen.');
  }
  if (s.steps.fix) textPart(); else benchPart();
  draw();
}

/* =================== POSTEN 5 und 6 =================== */
export function p56(root){
  const ID5 = 'p5', ID6 = 'p6';
  const ui = shell(root, { eyebrow:'Posten 5 und 6', title:'Zwei Lämpchen: Serie oder parallel?' });
  const s5 = stationState(ID5), s6 = stationState(ID6);
  let helpUsed = 0;
  const T = () => [
    { text:'Baue 2 Lämpchen <b>hintereinander</b> ein (Serie).', done: !!s5.steps.build },
    { text:'Drehe ein Lämpchen heraus (antippen). Was passiert?', done: !!s5.steps.raus },
    { text:'Baue 2 Lämpchen <b>nebeneinander</b> ein (parallel).', done: !!s6.steps.build },
    { text:'Drehe wieder ein Lämpchen heraus. Was passiert jetzt?', done: !!s6.steps.raus },
    { text:'Vergleiche: Wo leuchten die Lämpchen heller?', done: !!s6.steps.heller },
  ];
  const draw = () => { const t = T(); const i = t.findIndex(x => !x.done); ui.tasks(t.map((x, k) => ({ ...x, now: k === i }))); };
  const SERIE = { comps:[{ id:'B1', type:'bat', x:200, y:400 }, { id:'L1', type:'lamp', x:430, y:130 }, { id:'L2', type:'lamp', x:720, y:330 }], cables:[ wire('B1.p','L1.a'), wire('L1.b','L2.a'), wire('L2.b','B1.m') ] };
  const PARA = { comps:[{ id:'B1', type:'bat', x:200, y:400 }, { id:'L1', type:'lamp', x:470, y:130 }, { id:'L2', type:'lamp', x:740, y:300 }], cables:[ wire('B1.p','L1.a'), wire('L1.b','B1.m'), wire('B1.p','L2.a'), wire('L2.b','B1.m') ] };
  let mode = !s5.steps.raus ? 'serie' : 'para';
  let bench = null;
  function build(){
    ui.stage.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;gap:10px"><div id="b" style="flex:1;min-height:0"></div><div id="q"></div></div>`;
    bench = createBench(ui.stage.querySelector('#b'), { parts:{ bat:1, lamp:2 }, lampTap:'unscrew', onChange(res, b){
      const L = lampsOf(b); const lit = L.filter(l => (res.bright[l.id] || 0) > 0.02);
      const bothIn = L.length === 2 && L.every(l => !l.out);
      if (bothIn && lit.length === 2 && !res.short){
        const [a, c] = L.map(l => res.bright[l.id]);
        const series = Math.abs(Math.abs(res.cur[L[0].id]) - Math.abs(res.cur[L[1].id])) < 0.05 && a < 0.5;
        const para = a > 0.6 && c > 0.6;
        if (mode === 'serie' && series && step(ID5, 'build', 2)){ toast('Serienschaltung! Die Lämpchen leuchten <b>schwächer</b>.'); }
        if (mode === 'para' && para && step(ID6, 'build', 2)){ toast('Parallelschaltung! Beide leuchten <b>hell</b>.'); }
      }
      // Herausdrehen
      const out = L.filter(l => l.out);
      if (L.length === 2 && out.length === 1){
        const other = L.find(l => !l.out); const on = (res.bright[other.id] || 0) > 0.02;
        if (mode === 'serie' && s5.steps.build && !s5.steps.raus && !on) askRaus('serie');
        if (mode === 'para' && s6.steps.build && !s6.steps.raus && on) askRaus('para');
      }
      draw();
      ui.hint(mode === 'serie'
        ? '<b>Serie:</b> Der Strom hat nur <b>einen</b> Weg. Er fliesst zuerst durch das eine, dann durch das andere Lämpchen.<br><br>Tippe auf ein Lämpchen, um es heraus- oder hineinzudrehen.'
        : '<b>Parallel:</b> Der Strom hat <b>zwei</b> Wege. Jedes Lämpchen hat seinen eigenen Weg zur Batterie.<br><br>Tipp: Von einem Batteriestreifen dürfen zwei Kabel weggehen.');
      const btn = [];
      if (mode === 'serie' && s5.steps.raus) btn.push({ label:'Weiter: Parallelschaltung ›', primary:true, fn(){ mode = 'para'; bench.set({ comps:[], cables:[] }); } });
      if (mode === 'para' && s6.steps.raus && !s6.steps.heller) btn.push({ label:'Vergleichen ›', primary:true, fn: compare });
      btn.push({ label:'Hilfe: Vorlage laden', fn(){ helpUsed++; bench.set(mode === 'serie' ? SERIE : PARA); toast('Hier ist eine Vorlage. Schau genau, wie die Kabel laufen!', 'info'); } });
      if (mode === 'para') btn.push({ label:'‹ Serie nochmals ansehen', fn(){ mode = 'serie'; bench.set(SERIE); } });
      ui.buttons(btn);
    }});
  }
  let asking = false;
  function askRaus(which){
    if (asking) return; asking = true;
    const q = ui.stage.querySelector('#q');
    q.innerHTML = '<div class="card" id="q1"></div>';
    mc(q.querySelector('#q1'), which === 'serie' ? 'Serie: Du hast ein Lämpchen herausgedreht. Was passiert mit dem anderen?' : 'Parallel: Du hast ein Lämpchen herausgedreht. Was passiert mit dem anderen?',
      ['Das andere geht auch aus.', 'Das andere leuchtet weiter.'], which === 'serie' ? 0 : 1, f => {
        helpUsed += f; asking = false; q.innerHTML = '';
        if (which === 'serie'){ step(ID5, 'raus', 2); finish(ID5, helpUsed === 0 ? 3 : helpUsed <= 2 ? 2 : 1); toast('Posten 5 geschafft! Bei der Serie ist der einzige Weg unterbrochen.'); }
        else { step(ID6, 'raus', 2); toast('Richtig! Das andere Lämpchen hat seinen eigenen Weg.'); }
        draw(); bench.render();
      });
  }
  function compare(){
    const SV = (bright) => `<svg viewBox="0 0 400 260" style="width:100%">${DEFS}<g transform="translate(90 190) scale(.6)">${battery()}</g><g transform="translate(170 80) scale(.8)">${lamp(bright)}</g><g transform="translate(300 80) scale(.8)">${lamp(bright)}</g></svg>`;
    ui.stage.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div class="card"><div class="h1" style="font-size:21px">Serienschaltung</div>${SV(0.26)}</div><div class="card"><div class="h1" style="font-size:21px">Parallelschaltung</div>${SV(0.91)}</div></div><div class="card" id="q1" style="margin-top:14px"></div>`;
    mc(ui.stage.querySelector('#q1'), 'Wo leuchten die Lämpchen heller?', ['Bei der Parallelschaltung.', 'Bei der Serienschaltung.', 'Gleich hell.'], 0, f => {
      helpUsed += f; step(ID6, 'heller', 2); draw();
      const stars = helpUsed === 0 ? 3 : helpUsed <= 2 ? 2 : 1; finish(ID6, stars); if (!s5.done) finish(ID5, stars);
      celebrate('Posten 5 und 6 geschafft!', 'Für einen zweiten Lichtwächter an deinem Heissen Draht brauchst du die Parallelschaltung: Beide leuchten hell, und wenn eins kaputt ist, leuchtet das andere weiter.', stars, back);
    });
    ui.buttons([{ label:'‹ Zurück zur Werkbank', fn: build }]);
  }
  if (s6.steps.raus && !s6.steps.heller) compare(); else build();
  draw();
}
