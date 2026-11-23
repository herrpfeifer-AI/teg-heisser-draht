// Zeichnungen (SVG-Text). Farben siehe style.css
export const C = { bg:'#0F1530', panel:'#151C3B', card:'#1E2750', wire:'#D9823B', gold:'#FFD54A', glow:'#FFE680', ok:'#3DD6B5', bad:'#FF6B6B', text:'#EAF0FF', dim:'#8E9BD6', metal:'#C7CEE6' };

export const DEFS = `<defs>
 <radialGradient id="glow"><stop offset="0" stop-color="#FFE680" stop-opacity=".95"/><stop offset=".35" stop-color="#FFD54A" stop-opacity=".45"/><stop offset="1" stop-color="#FFD54A" stop-opacity="0"/></radialGradient>
 <radialGradient id="heat"><stop offset="0" stop-color="#FF6B6B" stop-opacity=".9"/><stop offset="1" stop-color="#FF6B6B" stop-opacity="0"/></radialGradient>
 <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#2A3566"/></pattern>
 <linearGradient id="wood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C99A62"/><stop offset="1" stop-color="#A97A45"/></linearGradient>
</defs>`;

/** 4.5-V-Flachbatterie, Mittelpunkt (0,0). Plus-Streifen oben links, Minus oben rechts */
export function battery(opts = {}){
  const { hot = false, empty = false, label = true } = opts;
  return `<g>
  ${hot ? `<circle r="150" fill="url(#heat)"/>` : ''}
  <rect x="-48" y="-63" width="16" height="34" rx="3" fill="#D9B85C"/>
  <rect x="28" y="-77" width="16" height="48" rx="3" fill="#D9B85C"/>
  <rect x="-80" y="-35" width="160" height="110" rx="12" fill="${empty ? '#4A5280' : '#2F6FDB'}"/>
  <rect x="-80" y="-35" width="160" height="30" rx="12" fill="${empty ? '#5A6496' : '#3B82F0'}"/>
  ${label ? `<text x="0" y="37" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">4.5 V</text>` : ''}
  <text x="-40" y="-11" text-anchor="middle" font-size="22" font-weight="900" fill="#fff">+</text>
  <text x="36" y="-11" text-anchor="middle" font-size="22" font-weight="900" fill="#fff">–</text>
  ${hot ? `<g stroke="#FF8A8A" stroke-width="4" fill="none" stroke-linecap="round"><path d="M-95 -40 q-10 -16 0 -32 q10 -16 0 -32"/><path d="M95 -40 q-10 -16 0 -32 q10 -16 0 -32"/><path d="M0 -95 q-10 -16 0 -32 q10 -16 0 -32"/></g>` : ''}
 </g>`;
}
export const BAT_TERMS = { p:{x:-40, y:-58}, m:{x:36, y:-72} };

/** Lämpchen in Fassung, Mittelpunkt = Glaskolben. Anschlüsse (-30,44) und (30,44) */
export function lamp(b = 0, opts = {}){
  const { out = false, broken = false } = opts;
  const on = b > 0.02;
  const glass = on ? `hsl(52 ${60 + 40 * Math.min(1, b)}% ${55 + 32 * Math.min(1, b)}%)` : '#2A3360';
  const fil = on ? '#E0A800' : '#5A6496';
  const lift = out ? -26 : 0;
  return `<g>
  ${on ? `<circle r="${50 + 50 * Math.min(1.2, b)}" fill="url(#glow)" opacity="${Math.min(1, 0.3 + b)}"/>` : ''}
  <g transform="translate(0 ${lift})">
   <circle r="30" fill="${glass}" stroke="${on ? '#FFD54A' : '#5A6496'}" stroke-width="3"/>
   <path d="${broken ? 'M-10 6 L-4 -8 M4 6 L10 -8' : 'M-10 6 L-4 -8 L4 6 L10 -8'}" stroke="${fil}" stroke-width="3" fill="none"/>
   <rect x="-14" y="26" width="28" height="${out ? 22 : 6}" fill="#B9C0DA"/>
  </g>
  <rect x="-24" y="24" width="48" height="36" rx="6" fill="${on ? '#8A94B8' : '#6A7398'}"/>
  <circle cx="-30" cy="44" r="7" fill="#C7CEE6"/><circle cx="30" cy="44" r="7" fill="#C7CEE6"/>
 </g>`;
}
export const LAMP_TERMS = { a:{x:-30, y:44}, b:{x:30, y:44} };

/** Kippschalter: Kontakte (-40,0) (40,0) */
export function toggle(closed){
  return `<g><rect x="-58" y="-8" width="116" height="36" rx="8" fill="#39437A"/>
   <circle cx="-40" cy="0" r="9" fill="#D5DBEE"/><circle cx="40" cy="0" r="9" fill="#D5DBEE"/>
   ${closed ? `<line x1="-40" y1="0" x2="40" y2="0" stroke="#3DD6B5" stroke-width="9" stroke-linecap="round"/>` : `<line x1="-40" y1="0" x2="28" y2="-42" stroke="#FF8A5B" stroke-width="9" stroke-linecap="round"/>`}</g>`;
}
/** Taster (nur an, solange gedrückt) */
export function taster(pressed){
  return `<g><rect x="-58" y="-8" width="116" height="36" rx="8" fill="#39437A"/>
   <circle cx="-40" cy="0" r="9" fill="#D5DBEE"/><circle cx="40" cy="0" r="9" fill="#D5DBEE"/>
   <rect x="-30" y="${pressed ? -6 : -22}" width="60" height="8" rx="3" fill="${pressed ? '#3DD6B5' : '#B9C0DA'}"/>
   <rect x="-12" y="${pressed ? -26 : -42}" width="24" height="22" rx="6" fill="#FF6B6B"/></g>`;
}
/** Schlinge am Draht (wie Heisser Draht): Kontakte (-40,0) und (40,0) */
export function schlinge(touch){
  return `<g><rect x="-58" y="-8" width="116" height="36" rx="8" fill="#5A3E28"/>
   <circle cx="-40" cy="0" r="9" fill="#D5DBEE"/><circle cx="40" cy="0" r="9" fill="#D5DBEE"/>
   <path d="M-40 0 C-30 -40, 0 -10, 10 -34 S 30 -50, 40 0" stroke="#C7CEE6" stroke-width="5" fill="none"/>
   <circle cx="${touch ? 10 : 2}" cy="${touch ? -34 : -60}" r="13" fill="none" stroke="#E7C65A" stroke-width="5"/>
   ${touch ? '<g stroke="#FFE680" stroke-width="3"><line x1="26" y1="-46" x2="36" y2="-56"/><line x1="-6" y1="-46" x2="-16" y2="-56"/></g>' : ''}</g>`;
}
export const SW_TERMS = { a:{x:-40, y:0}, b:{x:40, y:0} };

export function clip(x, y){ return `<g transform="translate(${x} ${y + 8})"><rect x="-9" y="-16" width="18" height="34" rx="9" fill="none" stroke="#D5DBEE" stroke-width="3.5"/><rect x="-4" y="-8" width="8" height="20" rx="4" fill="none" stroke="#D5DBEE" stroke-width="3"/></g>`; }

/** Maskottchen Lumo; wach oder schlafend */
export function lumo(awake = true, scale = 1){
  if (!awake) return `<g transform="scale(${scale})">
   <path d="M-46 0 A46 46 0 1 1 46 0 C46 22 30 32 26 52 L-26 52 C-30 32 -46 22 -46 0Z" fill="#3A4377" stroke="#6A75B0" stroke-width="4"/>
   <rect x="-28" y="52" width="56" height="12" rx="4" fill="#8A94B8"/><rect x="-24" y="64" width="48" height="12" rx="4" fill="#6A7398"/>
   <path d="M-24 -4 Q-16 4 -8 -4 M8 -4 Q16 4 24 -4" stroke="#C9D3FF" stroke-width="4" fill="none" stroke-linecap="round"/>
   <text x="44" y="-40" font-size="26" font-weight="800" fill="#8E9BD6">z z</text></g>`;
  return `<g transform="scale(${scale})">
  <circle r="120" fill="url(#glow)" opacity=".7"/>
  <path d="M-46 0 A46 46 0 1 1 46 0 C46 22 30 32 26 52 L-26 52 C-30 32 -46 22 -46 0Z" fill="#FFF0A0" stroke="#FFD54A" stroke-width="4"/>
  <rect x="-28" y="52" width="56" height="12" rx="4" fill="#8A94B8"/><rect x="-24" y="64" width="48" height="12" rx="4" fill="#6A7398"/><rect x="-14" y="76" width="28" height="10" rx="5" fill="#4A5280"/>
  <circle cx="-16" cy="-4" r="7" fill="#1B1B3A"/><circle cx="16" cy="-4" r="7" fill="#1B1B3A"/><circle cx="-13" cy="-7" r="2.5" fill="#fff"/><circle cx="19" cy="-7" r="2.5" fill="#fff"/>
  <path d="M-12 16 Q0 26 12 16" stroke="#1B1B3A" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="-30" cy="12" r="7" fill="#FFB08A" opacity=".7"/><circle cx="30" cy="12" r="7" fill="#FFB08A" opacity=".7"/></g>`;
}

/** Schaltzeichen, waagrecht, Länge 100, Mittelpunkt (0,0) */
export function symbol(kind, color = '#EAF0FF'){
  const s = `stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"`;
  switch (kind){
    case 'bat': return `<g ${s}><line x1="-50" y1="0" x2="-8" y2="0"/><line x1="-8" y1="-26" x2="-8" y2="26"/><line x1="8" y1="-12" x2="8" y2="12" stroke-width="9"/><line x1="8" y1="0" x2="50" y2="0"/></g>`;
    case 'lamp': return `<g ${s}><line x1="-50" y1="0" x2="-22" y2="0"/><circle r="22"/><line x1="-15" y1="-15" x2="15" y2="15"/><line x1="15" y1="-15" x2="-15" y2="15"/><line x1="22" y1="0" x2="50" y2="0"/></g>`;
    case 'wire': return `<g ${s}><line x1="-50" y1="0" x2="50" y2="0"/></g>`;
    case 'switch': return `<g ${s}><line x1="-50" y1="0" x2="-20" y2="0"/><circle cx="-20" cy="0" r="4" fill="${color}"/><line x1="-20" y1="0" x2="18" y2="-20"/><line x1="22" y1="0" x2="50" y2="0"/></g>`;
    case 'motor': return `<g ${s}><line x1="-50" y1="0" x2="-22" y2="0"/><circle r="22"/><line x1="22" y1="0" x2="50" y2="0"/><text x="0" y="9" text-anchor="middle" font-size="24" font-weight="800" fill="${color}" stroke="none">M</text></g>`;
    case 'resistor': return `<g ${s}><line x1="-50" y1="0" x2="-26" y2="0"/><rect x="-26" y="-11" width="52" height="22"/><line x1="26" y1="0" x2="50" y2="0"/></g>`;
  }
  return '';
}

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
