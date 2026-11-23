// Stromkreis-Rechner: Knotenpotential-Verfahren (kleine Gleichungssysteme).
// Bauteile = Kanten zwischen Knoten. Batterie 4.5 V mit kleinem Innenwiderstand.
export const V_BAT = 4.5;
const R_INT = 0.05;      // Innenwiderstand Batterie
const G_WIRE = 1000;     // Kabel / geschlossener Schalter / Metall
const R_LAMP = 1;        // Lämpchen
const P_REF = Math.pow(V_BAT * R_LAMP / (R_LAMP + R_INT), 2) / R_LAMP; // ein Lämpchen allein = Helligkeit 1
export const SHORT_AMP = 30;

export function edgeConductance(e){
  switch (e.type){
    case 'wire': return G_WIRE;
    case 'lamp': return e.out || e.broken ? 0 : 1 / R_LAMP;
    case 'switch': return e.closed ? G_WIRE : 0;
    case 'cond': return e.conducts ? (e.g || 400) : 0; // Gegenstand im Leiter-Labor
    case 'bat': return e.empty ? 0 : 1 / R_INT;
    default: return 0;
  }
}

/** edges: [{id,type,a,b,...}] – Batterie: a = Plus, b = Minus.
 *  Rückgabe: { v:{node:potential}, cur:{edgeId:strom a→b}, bright:{lampId:0..}, batAmp, short, anyLit } */
export function solve(edges){
  const bats = edges.filter(e => e.type === 'bat');
  const res = { v:{}, cur:{}, bright:{}, batAmp:0, short:false, anyLit:false };
  edges.forEach(e => { res.cur[e.id] = 0; if (e.type === 'lamp') res.bright[e.id] = 0; });
  if (!bats.length) return res;
  const nodes = [];
  const ix = n => { let i = nodes.indexOf(n); if (i < 0){ nodes.push(n); i = nodes.length - 1; } return i; };
  edges.forEach(e => { ix(e.a); ix(e.b); });
  const ground = ix(bats[0].b);
  const N = nodes.length;
  const G = Array.from({length:N}, () => new Float64Array(N));
  const I = new Float64Array(N);
  for (let i = 0; i < N; i++) G[i][i] += 1e-9;
  for (const e of edges){
    const g = edgeConductance(e); if (!g) continue;
    const a = ix(e.a), b = ix(e.b); if (a === b) continue;
    G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g;
    if (e.type === 'bat'){ const j = V_BAT * g; I[a] += j; I[b] -= j; }
  }
  // Masse entfernen und lösen
  const idx = []; for (let i = 0; i < N; i++) if (i !== ground) idx.push(i);
  const n = idx.length;
  const A = idx.map(r => { const row = new Float64Array(n + 1); idx.forEach((c, k) => row[k] = G[r][c]); row[n] = I[r]; return row; });
  for (let col = 0; col < n; col++){
    let piv = col; for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    const d = A[col][col]; if (Math.abs(d) < 1e-15) continue;
    for (let r = 0; r < n; r++){ if (r === col) continue; const f = A[r][col] / d; if (!f) continue; for (let k = col; k <= n; k++) A[r][k] -= f * A[col][k]; }
  }
  const v = new Float64Array(N);
  idx.forEach((node, k) => { v[node] = Math.abs(A[k][k]) < 1e-15 ? 0 : A[k][n] / A[k][k]; });
  nodes.forEach((name, i) => res.v[name] = v[i]);
  for (const e of edges){
    const g = edgeConductance(e); const a = ix(e.a), b = ix(e.b);
    if (e.type === 'bat'){ const amp = g ? (V_BAT - (v[a] - v[b])) * g : 0; res.cur[e.id] = amp; res.batAmp += Math.max(0, amp); }
    else res.cur[e.id] = g * (v[a] - v[b]);
    if (e.type === 'lamp'){ const dv = v[a] - v[b]; const p = dv * dv / R_LAMP; const b2 = g ? Math.min(1.3, p / P_REF) : 0; res.bright[e.id] = b2 < 0.02 ? 0 : b2; if (b2 >= 0.02) res.anyLit = true; }
  }
  res.short = res.batAmp > SHORT_AMP;
  return res;
}
