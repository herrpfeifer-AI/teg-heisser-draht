// Vertiefen: AB 3 (Stromkreis-Detektiv), AB 4 (Fehler-Detektiv), Wortkarten
import { DEFS, battery, lamp, toggle, clip, symbol, esc } from './draw.js';
import { shell, stationState, step, finish, toast, sfx, celebrate, gapText, shuffle, store, save, isDone } from './ui.js';

const back = () => { location.hash = '#/labor'; };

/* =================== AB 3 =================== */
export function ab3(root){
  const ID = 'ab3';
  const ui = shell(root, { eyebrow:'Vertiefen · AB 3', title:'Stromkreis-Detektiv' });
  const s = stationState(ID); let fails = s.fails || 0;
  const list = () => [
    { text:'Mini-Stromkreis bauen (Posten 1)', done: isDone('p1') },
    { text:'Was leitet Strom? (Posten 2)', done: isDone('p2') },
    { text:'Röntgenblick: So funktioniert der Heisse Draht', done: !!s.steps.xray },
    { text:'Lückentext zum Heissen Draht', done: !!s.steps.luecke },
    { text:'Fehlersuche: 2 Ideen', done: !!s.steps.fehler },
    { text:'Sicherheit: richtig oder falsch?', done: !!s.steps.sicher },
  ];
  const draw = () => { const t = list(); const i = t.findIndex(x => !x.done); ui.title('AB 3 in der App'); ui.tasks(t.map((x, k) => ({ ...x, now: k === i }))); };
  const WIRE = 'M150 380 L150 230 C200 150, 250 300, 320 230 S 440 150, 500 240 S 590 300, 640 210 L640 380';

  function xray(){
    let ring = { x: 150, y: 175 }, xr = false, touched = false;
    ui.stage.innerHTML = `<div class="card" style="padding:12px"><svg id="sc" viewBox="0 0 900 470" style="width:100%;touch-action:none;max-height:58vh"></svg></div>`;
    const svg = ui.stage.querySelector('#sc');
    // Punkte entlang des Drahts
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('d', WIRE); svg.appendChild(tmp);
    const L = tmp.getTotalLength(); const P = []; for (let i = 0; i <= 300; i++){ const p = tmp.getPointAtLength(L * i / 300); P.push({ x: p.x, y: p.y }); } tmp.remove();
    const R = 24;
    const render = () => {
      const d = Math.min(...P.map(p => Math.hypot(p.x - ring.x, p.y - ring.y)));
      const touch = d > R - 6 && d < R + 6; // Schlinge berührt den Draht
      const lit = touch;
      if (lit && !touched){ touched = true; sfx('buzz'); }
      if (!lit) touched = false;
      if (lit && xr && step(ID, 'xray', 2)){ toast('Berührt! Jetzt ist der Stromkreis <b>geschlossen</b>.'); draw(); ui.buttons([{ label:'Weiter zum Lückentext ›', primary:true, fn: luecke }]); }
      svg.innerHTML = `${DEFS}<rect width="900" height="470" rx="16" fill="#18214A"/>
       <rect x="90" y="30" width="700" height="350" rx="10" fill="${xr ? '#1B2A50' : '#1B3A6B'}" ${xr ? 'stroke="#5A6496" stroke-dasharray="10 8" stroke-width="3"' : ''}/>
       ${xr ? '' : `<path d="M90 300 q40 -20 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t60 0 L790 380 L90 380Z" fill="#244F8A"/>
       <rect x="680" y="130" width="50" height="170" fill="#EAF0FF"/><rect x="680" y="170" width="50" height="22" fill="#FF6B6B"/><rect x="680" y="230" width="50" height="22" fill="#FF6B6B"/><rect x="670" y="110" width="70" height="24" fill="#5A6496"/>`}
       <g transform="translate(705 70)">${lamp(lit ? 1 : 0)}</g>
       <rect x="60" y="380" width="760" height="56" rx="8" fill="url(#wood)"/>
       ${xr ? `<g transform="translate(830 300) scale(.55)">${battery()}</g>
         <path d="M808 268 C770 200, 760 130, 735 114" stroke="#D9823B" stroke-width="7" fill="none"/>
         <path d="M850 260 C900 360, 700 410, 640 380" stroke="#3B82F0" stroke-width="7" fill="none"/>
         <path d="M675 114 C600 120, 500 420, ${ring.x} ${ring.y + 110}" stroke="#3DB06B" stroke-width="7" fill="none"/>
         ${lit ? `<path d="M808 268 C770 200, 760 130, 735 114" stroke="#FFE680" stroke-width="4" fill="none" stroke-dasharray="1 20" class="flow"/><path d="M675 114 C600 120, 500 420, ${ring.x} ${ring.y + 110}" stroke="#FFE680" stroke-width="4" fill="none" stroke-dasharray="1 20" class="flow"/><path d="${WIRE}" stroke="#FFE680" stroke-width="4" fill="none" stroke-dasharray="1 20" class="flow"/><path d="M850 260 C900 360, 700 410, 640 380" stroke="#FFE680" stroke-width="4" fill="none" stroke-dasharray="1 20" class="flow"/>` : ''}
         <text x="830" y="372" text-anchor="middle" font-size="15" fill="#C9D3FF">Batterie</text>` : ''}
       <path d="${WIRE}" stroke="#C7CEE6" stroke-width="7" fill="none" stroke-linecap="round"/>
       <text x="150" y="222" text-anchor="end" font-size="18" font-weight="900" fill="#3DD6B5" dx="-14">S</text><text x="640" y="200" font-size="18" font-weight="900" fill="#FF8A8A" dx="14">Z</text>
       <g data-ring="1" style="cursor:grab"><circle cx="${ring.x}" cy="${ring.y}" r="${R}" fill="none" stroke="#E7C65A" stroke-width="7"/>
        <path d="M${ring.x} ${ring.y + R} L${ring.x} ${ring.y + 80}" stroke="#E7C65A" stroke-width="7"/>
        <rect x="${ring.x - 17}" y="${ring.y + 78}" width="34" height="70" rx="10" fill="#7C4DCC"/>
        <circle cx="${ring.x}" cy="${ring.y + 60}" r="70" fill="transparent"/></g>
       ${lit ? `<g stroke="#FFE680" stroke-width="4" stroke-linecap="round"><line x1="${ring.x + 22}" y1="${ring.y - 20}" x2="${ring.x + 38}" y2="${ring.y - 36}"/><line x1="${ring.x - 22}" y1="${ring.y - 20}" x2="${ring.x - 38}" y2="${ring.y - 36}"/></g><text x="${ring.x}" y="${ring.y - 44}" text-anchor="middle" font-size="18" font-weight="800" fill="#FFE680">Berührt!</text>` : ''}`;
    };
    let drag = null;
    const pt = ev => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    svg.addEventListener('pointerdown', ev => { if (!ev.target.closest('[data-ring]')) return; const p = pt(ev); drag = { dx: ring.x - p.x, dy: ring.y - p.y }; svg.setPointerCapture(ev.pointerId); });
    svg.addEventListener('pointermove', ev => { if (!drag) return; const p = pt(ev); ring = { x: Math.max(60, Math.min(840, p.x + drag.dx)), y: Math.max(60, Math.min(300, p.y + drag.dy)) }; render(); });
    svg.addEventListener('pointerup', () => drag = null);
    render(); draw();
    ui.hint('<b>Ziehe die Schlinge</b> an den Draht. Tippe dann auf <b>Röntgenblick</b>: Die Rückwand wird durchsichtig, und du siehst Batterie und Kabel.');
    ui.buttons([{ label:'Röntgenblick an/aus', primary:!s.steps.xray, fn(){ xr = !xr; sfx('click'); render(); } }, ...(s.steps.xray ? [{ label:'Weiter zum Lückentext ›', fn: luecke }] : [])]);
  }
  function luecke(){
    draw();
    ui.stage.innerHTML = `<div class="card"><div class="lab-label">So funktioniert «Heisser Draht»</div><div id="gt"></div></div>`;
    gapText(ui.stage.querySelector('#gt'), { html:'Wenn die Schlinge den {0} nicht berührt, ist der Stromkreis {1}. Das Lämpchen leuchtet nicht.<br>Berührt die Schlinge den Draht, ist der {2} {3}. Der Strom fliesst von der {4} durch die Kabel zum {5}. Das Lämpchen leuchtet.',
      words: shuffle(['Draht','offen','Stromkreis','geschlossen','Batterie','Lämpchen']), answers:['Draht','offen','Stromkreis','geschlossen','Batterie','Lämpchen'],
      onDone(){ step(ID, 'luecke', 2); draw(); setTimeout(fehler, 800); } });
    ui.hint('Tippe zuerst ein Wort an, dann die Lücke.');
    ui.buttons([{ label:'‹ Röntgenblick', fn: xray }]);
  }
  function fehler(){
    draw();
    const O = [ ['Die Batterie ist leer.', 1], ['Ein Kabel ist locker.', 1], ['Die Ummantelung ist nicht entfernt.', 1], ['Die Büroklammer berührt den Batteriestreifen nicht.', 1], ['Das Lämpchen ist nicht fest eingedreht.', 1], ['Die Rückwand ist zu bunt.', 0], ['Der Draht ist zu lang.', 0], ['Es ist zu hell im Zimmer.', 0] ];
    const order = shuffle(O.map((o, i) => i)); const got = new Set();
    ui.stage.innerHTML = `<div class="card"><div style="font-weight:800;font-size:20px;margin-bottom:10px">Dein Lämpchen leuchtet nicht. Was kann der Grund sein? Finde 2 Ideen.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${order.map(i => `<button class="choice" data-i="${i}">${O[i][0]}</button>`).join('')}</div></div>`;
    ui.stage.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; b.disabled = true;
      if (O[i][1]){ b.classList.add('right'); got.add(i); sfx('ok'); if (got.size === 2){ step(ID, 'fehler', 2); draw(); toast('Gute Detektiv-Arbeit!'); setTimeout(sicher, 900); } }
      else { b.classList.add('wrong'); fails++; s.fails = fails; save(); sfx('no'); }
    });
    ui.hint('<b>Tipp:</b> Denke an deine Fehlersuch-Liste auf AB 4.');
    ui.buttons([]);
  }
  function sicher(){
    draw();
    const Q = shuffle([ ['Die 4.5-Volt-Batterie ist ungefährlich.', true], ['Strom aus der Steckdose ist auch ungefährlich.', false], ['Wenn die Batterie warm wird, klemme ich sie sofort ab.', true], ['Ich darf nie etwas an die Steckdose anschliessen.', true], ['Wenn etwas warm wird, arbeite ich einfach weiter.', false], ['Die Batterie kommt erst nach dem Stempel S5.', true] ]);
    let i = 0;
    const next = () => {
      if (i >= Q.length){ step(ID, 'sicher', 2); draw(); const stars = fails === 0 ? 3 : fails <= 2 ? 2 : 1; finish(ID, stars); celebrate('AB 3 geschafft!', 'Du bist ein echter Stromkreis-Detektiv. Fülle jetzt auch dein Blatt AB 3 aus.', stars, back); return; }
      const [t, r] = Q[i];
      ui.stage.innerHTML = `<div class="card"><div class="lab-label">Sicherheit ${i + 1} von ${Q.length}</div><div style="font-size:24px;font-weight:800;margin:10px 0 18px">${t}</div><div style="display:flex;gap:12px"><button class="btn" data-a="1" style="flex:1">richtig</button><button class="btn ghost" data-a="0" style="flex:1">falsch</button></div></div>`;
      ui.stage.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const ok = (b.dataset.a === '1') === r; if (ok){ sfx('ok'); i++; next(); } else { sfx('no'); fails++; s.fails = fails; save(); toast(r ? 'Das stimmt aber!' : 'Achtung, das ist falsch und gefährlich!', 'warn'); } });
    };
    next();
    ui.hint('<b>Merke:</b> Batterie bis 4.5 V: ungefährlich. Steckdose: <b>lebensgefährlich!</b>', 'warn');
  }
  if (s.steps.fehler) sicher(); else if (s.steps.luecke) fehler(); else if (s.steps.xray) luecke(); else xray();
  draw();
}

/* =================== AB 4 Fehler-Detektiv =================== */
const CHECK = [
  'Sitzen beide Büroklammern fest an den Batteriestreifen?',
  'Ist bei allen Kabelenden das Kupfer blank (3 cm)?',
  'Ist Isolierband zwischen Kupfer und Draht?',
  'Ist das Lämpchen fest in der Fassung?',
  'Ist die Batterie noch voll?',
  'Ist der Draht aus Metall, nicht lackiert?',
  'Hängt ein Kabel lose?',
  'Ist das Kabel an der Schlinge aus Metall?',
];
const CASES = [
  { f:'clip', who:'Elias', story:'«Mein Lichtwächter wacht nicht auf!»', ok:'Die Büroklammer sitzt nicht am Batteriestreifen.', c:0 },
  { f:'abisol', who:'Mira', story:'«Ich habe alles verbunden, aber es bleibt dunkel.»', ok:'Am Kabelende ist die Ummantelung noch dran. Plastik leitet nicht!', c:1 },
  { f:'iso', who:'Noah', story:'«Ich habe extra viel Isolierband gebraucht …»', ok:'Das Isolierband ist zwischen Kupfer und Draht. Dann fliesst kein Strom.', c:2 },
  { f:'lamp', who:'Aylin', story:'«Gestern hat es noch funktioniert!»', ok:'Das Lämpchen ist nicht fest eingedreht.', c:3 },
  { f:'bat', who:'Jonas', story:'«Alle Kabel sitzen fest. Ich habe alles dreimal geprüft.»', ok:'Die Batterie ist leer. Teste sie mit einem Mini-Stromkreis.', c:4 },
  { f:'lack', who:'Lea', story:'«Ich habe meinen Draht schön rot angemalt.»', ok:'Die Farbe auf dem Draht isoliert. Die Schlinge berührt kein Metall.', c:5 },
  { f:'lose', who:'Tim', story:'«Beim Spielen ist plötzlich alles dunkel geworden.»', ok:'Das lange Kabel hängt lose. Es ist nicht mehr mit dem Griff verbunden.', c:6 },
  { f:'griff', who:'Sara', story:'«Ich habe das Kabel gut am Griff festgeklebt.»', ok:'Das Kabel klebt am Holzgriff, nicht an der Schlinge aus Metall.', c:7 },
];
function ab4Scene(f){
  const W = 'M150 380 L150 230 C200 150, 250 300, 320 230 S 440 150, 500 240 S 590 300, 640 210 L640 380';
  const cur = f === 'lose' ? 'M735 114 C620 120, 560 300, 520 330' : 'M735 114 C640 120, 520 470, 418 388';
  return `${DEFS}<rect width="900" height="520" rx="16" fill="#18214A"/>
   <text x="30" y="34" font-size="15" fill="#8E9BD6" font-weight="700" letter-spacing="1">RÜCKSEITE – ALLE TEILE SICHTBAR</text>
   <rect x="90" y="50" width="700" height="330" rx="10" fill="#22305E"/>
   <rect x="60" y="380" width="760" height="56" rx="8" fill="url(#wood)"/>
   <rect x="740" y="250" width="150" height="150" rx="8" fill="none" stroke="#A97A45" stroke-width="7"/>
   <g transform="translate(815 330) scale(.72)">${battery({ empty: f === 'bat' })}</g>
   ${f === 'bat' ? '<rect x="770" y="350" width="90" height="26" rx="6" fill="#FFD54A" transform="rotate(-8 815 363)"/><text x="815" y="370" text-anchor="middle" font-size="15" font-weight="900" fill="#1B1B1B" transform="rotate(-8 815 363)">ALT</text>' : ''}
   <path d="${W}" stroke="${f === 'lack' ? '#E0533A' : '#C7CEE6'}" stroke-width="${f === 'lack' ? 9 : 7}" fill="none" stroke-linecap="round"/>
   <!-- kurzes Kabel: Plus → Draht -->
   <path d="M786 288 C760 420, 700 420, 652 388" stroke="#D9823B" stroke-width="7" fill="none"/>
   ${f === 'abisol' ? '<rect x="626" y="374" width="34" height="16" rx="5" fill="#D9823B" stroke="#8A4A1A" stroke-width="2"/>' : '<path d="M652 388 L640 380" stroke="#E08A3B" stroke-width="5"/>'}
   ${f === 'iso' ? '<rect x="622" y="362" width="40" height="34" rx="4" fill="#111" transform="rotate(10 642 379)"/>' : ''}
   ${clip(786, 288)}
   <!-- mittleres Kabel: Minus → Fassung -->
   <path d="${f === 'clip' ? 'M850 230 C870 170, 800 150, 765 114' : 'M841 278 C870 200, 800 150, 765 114'}" stroke="#3B82F0" stroke-width="7" fill="none"/>
   ${f === 'clip' ? clip(850, 226) : clip(841, 274)}
   <g transform="translate(750 70)">${lamp(0, { out: f === 'lamp' })}</g>
   <!-- langes Kabel: Fassung → Griff -->
   <path d="${cur}" stroke="#3DB06B" stroke-width="7" fill="none"/>
   <!-- Schlinge und Griff -->
   <circle cx="400" cy="210" r="22" fill="none" stroke="#E7C65A" stroke-width="7"/>
   <path d="M400 232 L400 300" stroke="#E7C65A" stroke-width="7"/>
   <rect x="383" y="296" width="34" height="96" rx="10" fill="#A97A45"/>
   ${f === 'griff' ? '<rect x="380" y="372" width="40" height="18" fill="#111"/>' : '<rect x="392" y="290" width="16" height="20" fill="#111"/>'}
   ${f === 'griff' ? '' : '<path d="M418 388 C430 340, 412 310, 404 300" stroke="#3DB06B" stroke-width="5" fill="none"/>'}`;
}
const HOT = { clip:[850, 240, 50], abisol:[642, 382, 40], iso:[642, 380, 40], lamp:[750, 70, 55], bat:[815, 330, 70], lack:[320, 230, 70], lose:[520, 330, 50], griff:[400, 360, 45], wire2:[470, 210, 40], other:[790, 180, 40] };
export function ab4(root){
  const ID = 'ab4';
  const ui = shell(root, { eyebrow:'Vertiefen · AB 4', title:'Fehler-Detektiv' });
  const s = stationState(ID); const d = store.s.data.ab4 || (store.s.data.ab4 = { solved:[] , fails:0 });
  ui.title('Checkliste Fehlersuche');
  const side = (hl) => { ui.tasks(CHECK.map((t, i) => ({ text:t, done: d.solved.some(k => CASES[k].c === i), now: hl === i }))); };
  function caseView(k){
    const C = CASES[k]; let found = false;
    ui.stage.innerHTML = `<div class="card" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:21px;font-weight:800">${C.who} sagt: ${C.story}</div><div class="pill">Fall ${k + 1} von ${CASES.length}</div></div>
      <div style="color:#8E9BD6;font-size:16px;margin:4px 0 8px">Tippe auf die Stelle, wo der Fehler ist.</div>
      <svg id="sc" viewBox="0 0 900 520" style="width:100%;max-height:60vh">${ab4Scene(C.f)}<g id="mark"></g></svg></div><div id="msg"></div>`;
    const svg = ui.stage.querySelector('#sc');
    svg.addEventListener('pointerdown', ev => {
      if (found) return;
      const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse());
      const [hx, hy, hr] = HOT[C.f];
      const mark = svg.querySelector('#mark');
      if (Math.hypot(q.x - hx, q.y - hy) < hr){
        found = true; sfx('ok');
        mark.innerHTML = `<circle cx="${hx}" cy="${hy}" r="${hr + 6}" fill="none" stroke="#FFD54A" stroke-width="5"/><line x1="${hx + hr * .75}" y1="${hy + hr * .75}" x2="${hx + hr * .75 + 40}" y2="${hy + hr * .75 + 40}" stroke="#FFD54A" stroke-width="10" stroke-linecap="round"/>`;
        if (!d.solved.includes(k)){ d.solved.push(k); store.s.funken += 2; save(); }
        side(C.c);
        ui.stage.querySelector('#msg').innerHTML = `<div class="card" style="margin-top:12px;background:#1E3A3A;font-size:19px"><b>Gefunden!</b> ${C.ok}</div>`;
        ui.buttons([ k + 1 < CASES.length ? { label:'Nächster Fall ›', primary:true, fn: () => caseView(k + 1) } : { label:'Weiter: Reihenfolge ›', primary:true, fn: order } ]);
      } else {
        d.fails++; save(); sfx('no');
        mark.innerHTML = `<circle cx="${q.x}" cy="${q.y}" r="26" fill="none" stroke="#FF6B6B" stroke-width="4"/>`;
        toast('Hier ist alles in Ordnung. Schau die Checkliste an!', 'info');
      }
    });
    side(-1);
    ui.hint('Die gleiche Liste steht auf deinem <b>AB 4</b>. Nutze sie in L12 bei deinem eigenen Spiel!');
    ui.buttons([]);
  }
  const STEPS = ['Draht nach dem Drahtplan biegen und befestigen.', 'Schlinge und Griff bauen.', 'Material für die Elektronik holen.', 'Bei allen Kabelenden 3 cm Ummantelung entfernen.', 'Büroklammern mit dem kurzen und dem mittleren Kabel verbinden.', 'Kurzes Kabel mit dem Schweissdraht verbinden.', 'Mittleres Kabel mit der Fassung verbinden.', 'Langes Kabel mit Fassung und Griff verbinden. Stempel S5!', 'Fassung im Loch festkleben, Lämpchen eindrehen.', 'Batterie einlegen, Büroklammern an die Streifen.', 'Testen: Schlinge berührt den Draht.', 'Aufräumen.'];
  function order(){
    const sh = shuffle(STEPS.map((t, i) => i)); const done = []; let f = 0;
    const drawO = () => {
      ui.stage.innerHTML = `<div class="card"><div style="font-weight:800;font-size:20px">Bonus: Bringe die Schritte von AB 4 in die richtige Reihenfolge. Tippe den nächsten Schritt an.</div>
       <ol style="margin:12px 0 12px 26px;font-size:17px;line-height:1.7;color:#3DD6B5">${done.map(i => `<li>${STEPS[i]}</li>`).join('')}</ol>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${sh.filter(i => !done.includes(i)).map(i => `<button class="choice" data-s="${i}" style="font-size:16px">${STEPS[i]}</button>`).join('')}</div></div>`;
      ui.stage.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
        const i = +b.dataset.s;
        if (i === done.length){ done.push(i); sfx('tick'); if (done.length === STEPS.length){ step(ID, 'order', 3); end(f); return; } drawO(); }
        else { f++; sfx('no'); b.classList.add('wrong'); toast('Noch nicht. Was kommt vorher?', 'info'); }
      });
    };
    drawO();
    ui.buttons([{ label:'Überspringen und abschliessen', fn: () => end(0) }]);
  }
  function end(){
    const stars = d.fails <= 2 ? 3 : d.fails <= 6 ? 2 : 1;
    finish(ID, stars); celebrate('AB 4 geschafft!', 'Du kennst jetzt alle typischen Fehler. Damit findest du in L12 auch den Fehler in deinem eigenen Spiel.', stars, back);
  }
  const first = CASES.findIndex((c, i) => !d.solved.includes(i));
  if (first < 0) order(); else caseView(first);
}

/* =================== Wortkarten =================== */
const WORDS = [
  ['die', 'Batterie', 'Die Batterie gibt den Strom.'], ['das', 'Kabel', 'Das Kabel leitet den Strom.'], ['das', 'Lämpchen', 'Das Lämpchen leuchtet.'],
  ['die', 'Fassung', 'Das Lämpchen steckt in der Fassung.'], ['der', 'Schalter', 'Der Schalter öffnet und schliesst den Stromkreis.'], ['der', 'Stromkreis', 'Im geschlossenen Stromkreis fliesst Strom.'],
  ['der', 'Draht', 'Der Draht ist aus Metall.'], ['die', 'Schlinge', 'Die Schlinge darf den Draht nicht berühren.'], ['der', 'Griff', 'Ich halte den Griff.'],
  ['die', 'Büroklammer', 'Die Büroklammer klemmt an der Batterie.'], ['das', 'Isolierband', 'Das Isolierband leitet keinen Strom.'], ['der', 'Leiter', 'Metall ist ein guter Leiter.'],
  ['der', 'Nichtleiter', 'Holz ist ein Nichtleiter.'], ['der', 'Kurzschluss', 'Ein Kurzschluss ist gefährlich.'], ['der', 'Pluspol', 'Der kurze Streifen ist der Pluspol.'], ['der', 'Minuspol', 'Der lange Streifen ist der Minuspol.'],
];
const VERBS = [['geschlossen', 'Der Stromkreis ist geschlossen: Das Lämpchen leuchtet.'], ['offen', 'Der Stromkreis ist offen: Das Lämpchen ist dunkel.'], ['leiten', 'Metalle leiten Strom.'], ['abisolieren', 'Ich entferne die Ummantelung vom Kabel.']];
function speak(t){ try{ const u = new SpeechSynthesisUtterance(t); u.lang = 'de-DE'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){} }
export function wort(root){
  const ID = 'wort';
  const ui = shell(root, { eyebrow:'Vertiefen', title:'Wortkarten' });
  const s = stationState(ID);
  function cards(){
    ui.stage.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${WORDS.map(([a, w, t], i) => `<button class="choice" data-w="${i}" style="padding:14px"><div style="font-size:15px;color:${a === 'der' ? '#7FB8FF' : a === 'die' ? '#FF8AB8' : '#7FE0B0'};font-weight:800">${a}</div><div style="font-size:21px;font-weight:800">${w}</div><div style="font-size:14px;color:#8E9BD6;font-weight:500;margin-top:4px">${t}</div></button>`).join('')}
     ${VERBS.map(([w, t], i) => `<button class="choice" data-v="${i}" style="padding:14px"><div style="font-size:15px;color:#FFD54A;font-weight:800">Wort</div><div style="font-size:21px;font-weight:800">${w}</div><div style="font-size:14px;color:#8E9BD6;font-weight:500;margin-top:4px">${t}</div></button>`).join('')}</div>`;
    ui.stage.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const [a, w, t] = WORDS[+b.dataset.w]; speak(`${a} ${w}. ${t}`); });
    ui.stage.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const [w, t] = VERBS[+b.dataset.v]; speak(`${w}. ${t}`); });
  }
  ui.title('Wortkarten');
  ui.tasks([{ text:'Tippe eine Karte an: Sie wird vorgelesen.', done:true }, { text:'Spiele das Artikel-Quiz: der, die oder das?', done: !!s.done, now: !s.done }]);
  ui.hint('<b style="color:#7FB8FF">der</b> · <b style="color:#FF8AB8">die</b> · <b style="color:#7FE0B0">das</b> – die Farben helfen dir.');
  ui.buttons([{ label:'Artikel-Quiz ›', primary:true, fn: quiz }]);
  function quiz(){
    const Q = shuffle(WORDS).slice(0, 10); let i = 0, f = 0;
    const next = () => {
      if (i >= Q.length){ const stars = f === 0 ? 3 : f <= 2 ? 2 : 1; finish(ID, stars, 3); celebrate('Wortkarten-Profi!', `Du hast ${Q.length} Artikel gesetzt.`, stars, () => { cards(); }, 'Fertig'); return; }
      const [a, w] = Q[i];
      ui.stage.innerHTML = `<div class="card" style="text-align:center;padding:40px"><div class="lab-label">Frage ${i + 1} von ${Q.length}</div><div style="font-size:48px;font-weight:900;margin:20px 0 30px">___ ${w}</div><div style="display:flex;gap:14px;justify-content:center">${['der','die','das'].map(x => `<button class="btn ${x === 'der' ? '' : 'ghost'}" data-a="${x}" style="min-width:150px">${x}</button>`).join('')}</div></div>`;
      ui.stage.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { if (b.dataset.a === a){ sfx('ok'); speak(`${a} ${w}`); i++; setTimeout(next, 500); } else { f++; sfx('no'); b.disabled = true; } });
    };
    next();
    ui.buttons([{ label:'‹ Zu den Karten', fn: cards }]);
  }
  cards();
}
