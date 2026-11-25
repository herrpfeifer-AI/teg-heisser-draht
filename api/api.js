import { createHmac as _hmacAusweis, timingSafeEqual as _tseAusweis } from 'node:crypto';
// Heisser Draht – API (eine Funktion, Aktionen per JSON-Body)
import crypto from 'node:crypto';
import { SEED_VERSION, SEED_CLASSES } from '../lib/seed.js';
import { schappAktiv } from '../lib/schapp-aktiv.js';
import { lpAusweisOk } from '../lib/lp-ausweis.js';

const SECRET = process.env.SESSION_SECRET || 'dev-secret';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '';
const LOCAL = process.env.LOCAL_STORE || '';

/* ---------- Speicher (Neon Postgres als Schlüssel-Wert-Tabelle) ---------- */
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || '';
let sqlFn = null, ready = null;
async function db(){
  if (!DB_URL) { const e = new Error('NO_DB'); e.noDb = true; throw e; }
  if (!sqlFn){ const { neon } = await import('@neondatabase/serverless'); sqlFn = neon(DB_URL); }
  if (!ready) ready = sqlFn`CREATE TABLE IF NOT EXISTS lw_kv (k TEXT PRIMARY KEY, v JSONB NOT NULL, updated TIMESTAMPTZ NOT NULL DEFAULT now())`.catch(e => { ready = null; throw e; });
  await ready;
  return sqlFn;
}
const lpath = path => LOCAL + '/' + path.replace(/\//g,'__');
async function readJSON(path){
  if (LOCAL){ const fs = await import('node:fs/promises'); try{ return JSON.parse(await fs.readFile(lpath(path), 'utf8')); }catch(e){ return null; } }
  const sql = await db();
  const rows = await sql`SELECT v FROM lw_kv WHERE k = ${path}`;
  return rows.length ? rows[0].v : null;
}
async function readMany(paths){
  if (!paths.length) return [];
  if (LOCAL) return Promise.all(paths.map(readJSON));
  const sql = await db();
  const rows = await sql`SELECT k, v FROM lw_kv WHERE k = ANY(${paths})`;
  const m = new Map(rows.map(r => [r.k, r.v]));
  return paths.map(p => m.get(p) || null);
}
async function writeJSON(path, obj){
  if (LOCAL){ const fs = await import('node:fs/promises'); await fs.mkdir(LOCAL, {recursive:true}); await fs.writeFile(lpath(path), JSON.stringify(obj)); return; }
  const sql = await db();
  const v = JSON.stringify(obj);
  await sql`INSERT INTO lw_kv (k, v, updated) VALUES (${path}, ${v}::jsonb, now()) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated = now()`;
}
async function removeJSON(path){
  if (LOCAL){ const fs = await import('node:fs/promises'); try{ await fs.unlink(lpath(path)); }catch(e){} return; }
  const sql = await db();
  await sql`DELETE FROM lw_kv WHERE k = ${path}`;
}

/* ---------- Tokens ---------- */
const b64u = b => Buffer.from(b).toString('base64url');
function sign(payload){
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}
function verify(token){
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const exp = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return null;
  try{ const p = JSON.parse(Buffer.from(body,'base64url').toString()); if (p.exp && p.exp < Date.now()) return null; return p; }catch(e){ return null; }
}
const DAY = 86400000;

/* ---------- Hilfen ---------- */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = n => Array.from(crypto.randomBytes(n), x => CODE_CHARS[x % CODE_CHARS.length]).join('');
const genPin = () => String(crypto.randomInt(0, 10000)).padStart(4,'0');
const genId = () => crypto.randomBytes(9).toString('base64url');
const cleanName = s => String(s||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,40);
const normCode = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
function safeEq(a, b){ const A = Buffer.from(String(a)), B = Buffer.from(String(b)); return A.length === B.length && crypto.timingSafeEqual(A, B); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DEFAULT_CLASS_SETTINGS = { allOpen:false, gamesOn:true };

async function getIndex(){ return (await readJSON('index.json')) || { classes:[] }; }
async function getClass(code){ return code ? await readJSON('class/' + code + '.json') : null; }
async function saveClass(c){ c.updated = Date.now(); await writeJSON('class/' + c.code + '.json', c); }
async function allClasses(idx){ return (await readMany(idx.classes.map(c => 'class/' + c + '.json'))).filter(Boolean); }
function uniquePin(used){ let p, n = 0; do { p = genPin(); n++; } while ((used.has(p) || p === '0000' || /^(\d)\1{3}$/.test(p) || p === '1234') && n < 5000); used.add(p); return p; }
async function usedPins(idx){ const used = new Set(); for (const c of await allClasses(idx)) for (const s of (c.students||[])) used.add(s.pin); return used; }
const settingsOf = c => Object.assign({}, DEFAULT_CLASS_SETTINGS, c.settings || {});
function publicClass(c){ return { code:c.code, name:c.name, settings:settingsOf(c) }; }

/* ---------- Zugänge für andere Lehrpersonen (je eine Klasse) ----------
   lp-zugang.json = { <Klassen-Code>: { code, erstellt } }. Nur das Haupt-Passwort (TEACHER_PASSWORD)
   darf Zugänge erstellen, erneuern oder löschen. Ein Klassen-Token (r:'t', k, z) gilt nur, solange
   der Zugang mit genau diesem Erstell-Zeitpunkt noch besteht (neuer Code oder Löschen sperrt sofort). */
async function getZugang(){ return (await readJSON('lp-zugang.json')) || {}; }
const ZCHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const zTeil = () => Array.from(crypto.randomBytes(4), x => ZCHARS[x % ZCHARS.length]).join('');
const zSlug = n => String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').slice(0,8) || 'klasse';
const zNorm = v => String(v||'').normalize('NFC').trim().toLowerCase();

async function runSeed(idx){
  const flag = await readJSON('seed.json');
  if (flag && flag.v >= SEED_VERSION) return;
  for (const sc of SEED_CLASSES){
    if (flag && (sc.v || 1) <= flag.v) continue; // ältere Klassen nicht erneut auffüllen (gelöschte Kinder bleiben gelöscht)
    let c = null;
    for (const x of await allClasses(idx)) if (String(x.name).trim().toLowerCase() === sc.name.toLowerCase()){ c = x; break; }
    if (!c){
      let code; do { code = genCode(6); } while (idx.classes.includes(code));
      c = { code, name: sc.name, created: Date.now(), students: [], settings: Object.assign({}, DEFAULT_CLASS_SETTINGS) };
      idx.classes.push(code);
    }
    const used = await usedPins(idx); for (const s of c.students) used.add(s.pin);
    for (const n of sc.students) if (!c.students.some(s => s.name.toLowerCase() === n.toLowerCase())) c.students.push({ id: genId(), name: n, pin: uniquePin(used), created: Date.now() });
    await saveClass(c);
  }
  await writeJSON('index.json', idx);
  await writeJSON('seed.json', { v: SEED_VERSION, t: Date.now() });
}


// ---- Ausweis aus der Schapp (lib/ausweis.ts dort): Daten.Unterschrift, HMAC-SHA256 mit AUSWEIS_SECRET ----
function pruefeAusweis(a){
  const geheim = process.env.AUSWEIS_SECRET; if (!geheim) return null;
  const [daten, sig] = String(a || '').split('.'); if (!daten || !sig) return null;
  const soll = _hmacAusweis('sha256', geheim).update(daten).digest('base64url');
  const A = Buffer.from(sig), B = Buffer.from(soll);
  if (A.length !== B.length || !_tseAusweis(A, B)) return null;
  let p; try{ p = JSON.parse(Buffer.from(daten, 'base64url').toString('utf8')); }catch(e){ return null; }
  if (!p || p.app !== 'heisser-draht' || !p.k || !(p.exp > Date.now())) return null;
  return p;
}

// ---- Eltern-Überblick für die Schapp ----
const POSTEN = [
  ['p1','Der Stromkreis','🔋'], ['p2','Leiter und Nichtleiter','🧲'], ['p3','Der Schalter','🔘'], ['p4','Der Kurzschluss','⚡'],
  ['p5','Serienschaltung','💡'], ['p6','Parallelschaltung','💡'], ['ab3','Stromkreis-Detektiv','🔎'], ['ab4','Fehler-Detektiv','🛠️'],
];
const pauseAktiv = c => !!(c && c.pause && c.pause.on && (!c.pause.until || c.pause.until > Date.now()));
const slugName = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function postenStatus(st, id){ return st[id] && st[id].done ? 'fertig' : st[id] ? 'angefangen' : 'offen'; }
async function lpUebersicht(klasse, nurSperre){
  const all = await allClasses(await getIndex());
  const c = all.find(x => String(x.name).trim().toLowerCase() === String(klasse||'').trim().toLowerCase());
  if (!c) return null;
  if (nurSperre){ const p = pauseAktiv(c) ? c.pause : null; return { app:'heisser-draht', klasse: c.name, freeze: { frozen: !!p, text: p ? (p.msg||'') : '', until: p ? (p.until||0) : 0 } }; }
  const kinder = await Promise.all((c.students||[]).map(async s => {
    const doc = await readJSON('student/' + s.id + '.json');
    const st = (doc && doc.state && doc.state.st) || {};
    return { id: s.schapp || slugName(s.name), name: s.name, levels: Object.fromEntries(POSTEN.map(([id]) => [id, postenStatus(st, id)])), zuletzt: doc && doc.updated ? new Date(doc.updated).toISOString() : null };
  }));
  const p = pauseAktiv(c) ? c.pause : null;
  return {
    app:'heisser-draht', klasse: c.name, klassen: all.map(x => x.name).filter(n => /^\d/.test(String(n))),
    levels: POSTEN.map(([id, titel, emoji]) => ({ id, titel, emoji })),
    freigabe: false, unlocked: [], freeze: { frozen: !!p, text: p ? (p.msg||'') : '', until: p ? (p.until||0) : 0 }, kinder,
  };
}
async function elternStand(kind, klasse){
  const k = slugName(kind);
  const all = await allClasses(await getIndex());
  let s = null;
  for (const c of all){ s = (c.students||[]).find(x => x.schapp === k); if (s) break; }
  if (!s){ const c = all.find(x => String(x.name).trim().toLowerCase() === klasse.toLowerCase()); s = c && (c.students||[]).find(x => slugName(x.name) === k); }
  if (!s) return null;
  const doc = await readJSON('student/' + s.id + '.json');
  const st = (doc && doc.state && doc.state.st) || {};
  const levels = POSTEN.map(([id, titel, emoji]) => ({ id, titel, emoji, status: st[id] && st[id].done ? 'fertig' : st[id] ? 'angefangen' : 'offen' }));
  return { app:'heisser-draht', levels, zuletzt: doc && doc.updated ? new Date(doc.updated).toISOString() : null };
}

const failures = new Map();
function cleanState(st){
  // nur bekannte, kleine Felder übernehmen
  if (!st || typeof st !== 'object') return null;
  const raw = JSON.stringify(st);
  if (raw.length > 200000) return null;
  return st;
}

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && String(req.url||'').includes('health')){
    try{ const sql = await db(); const r = await sql`SELECT count(*)::int AS n FROM lw_kv`; return res.json({ ok:true, db:true, eintraege:r[0].n, lehrerPasswort:!!TEACHER_PASSWORD }); }
    catch(e){ return res.status(503).json({ ok:false, db:false, grund: e && e.noDb ? 'keine DATABASE_URL' : 'Verbindungsfehler' }); }
  }
  // Schapp › Eltern › Lern-Apps: Stand eines Kindes (nur erledigt / angefangen pro Posten). Header x-eltern-token = ELTERN_TOKEN.
  // Schapp › Lehrerbereich: Überblick einer Klasse und Anhalten (Header x-eltern-token = ELTERN_TOKEN)
  const roh = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  if (String(req.url||'').includes('lp=1') || (req.method === 'POST' && roh && roh.schapp)){
    const et = process.env.ELTERN_TOKEN;
    if (!et || !safeEq(String(req.headers['x-eltern-token']||''), et)) return res.status(403).json({ error:'Kein Zugang' });
    try{
      if (req.method === 'GET'){
        const q = new URL(req.url, 'http://x').searchParams;
        const u = await lpUebersicht(String(q.get('klasse')||'5b'), q.get('nur') === 'sperre');
        return u ? res.json(u) : res.status(404).json({ error:'Unbekannte Klasse' });
      }
      if (roh.schapp !== 'freeze') return res.status(400).json({ error:'Im Heissen Draht gibt es keine Level-Freigabe.' });
      const all = await allClasses(await getIndex());
      const c = all.find(x => String(x.name).trim().toLowerCase() === String(roh.klasse||'').trim().toLowerCase());
      if (!c) return res.status(404).json({ error:'Unbekannte Klasse' });
      const min = Math.max(1, Math.min(30, Math.round(Number(roh.minutes) || 10)));
      c.pause = roh.on === true ? { on:true, t:Date.now(), until: Date.now() + min*60000, msg: String(roh.text || 'Kurze Pause – schau nach vorne!').slice(0,120) } : null;
      await saveClass(c);
      return res.json({ freeze: { frozen: !!c.pause, text: c.pause ? c.pause.msg : '', until: c.pause ? c.pause.until : 0 } });
    }catch(e){ return res.status(500).json({ error:'Daten konnten nicht geladen werden.' }); }
  }
  if (req.method === 'GET' && String(req.url||'').includes('eltern=')){
    const et = process.env.ELTERN_TOKEN;
    if (!et || !safeEq(String(req.headers['x-eltern-token']||''), et)) return res.status(403).json({ error:'Kein Zugang' });
    try{
      const q = new URL(req.url, 'http://x').searchParams;
      const st = await elternStand(String(q.get('eltern')||''), String(q.get('klasse')||'5b'));
      return st ? res.json(st) : res.status(404).json({ error:'Unbekanntes Kind' });
    }catch(e){ return res.status(500).json({ error:'Daten konnten nicht geladen werden.' }); }
  }
  if (req.method !== 'POST'){ res.status(405).json({error:'Nur POST'}); return; }
  let body = req.body;
  if (typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
  body = body || {};
  const auth = verify((req.headers.authorization||'').replace(/^Bearer /,''));
  const a = body.a;
  try{
    if (a === 'loginCode'){
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
      const key = 'ip:' + ip;
      const f = failures.get(key) || {n:0,t:0};
      if (f.n >= 12 && Date.now() - f.t < 10*60000) return res.status(429).json({error:'Zu viele falsche Codes. Warte 10 Minuten oder frag deine Lehrperson.'});
      const pin = String(body.pin||'').replace(/\D/g,'');
      if (pin.length !== 4) return res.status(400).json({error:'Der Code hat 4 Ziffern.'});
      const idx = await getIndex();
      if (!idx.classes.length) await runSeed(idx);
      let hit = null;
      for (const c of await allClasses(idx)){ const s = (c.students||[]).find(x => safeEq(x.pin, pin)); if (s){ hit = {c, s}; break; } }
      if (!hit){ failures.set(key, {n:f.n+1, t:Date.now()}); await sleep(600); return res.status(401).json({error:'Diesen Code gibt es nicht. Schau nochmals auf deine Karte.'}); }
      failures.delete(key);
      return res.json({ token: sign({r:'s', sid:hit.s.id, c:hit.c.code, exp:Date.now()+90*DAY}), name:hit.s.name, klasse:hit.c.name });
    }
    if (a === 'loginAusweis'){
      const p = pruefeAusweis(body.ausweis);
      if (!p) return res.status(401).json({error:'Der Zugang aus der Schapp ist abgelaufen. Tippe in der Schapp nochmals auf die Kachel.'});
      const idx = await getIndex();
      await runSeed(idx);
      const all = await allClasses(idx);
      let hit = null;
      for (const c of all){ const s = (c.students||[]).find(x => x.schapp === p.k); if (s){ hit = {c, s}; break; } }
      if (!hit){
        const kl = String(p.kl || '').trim().toLowerCase();
        let c = all.find(x => String(x.name).trim().toLowerCase() === kl);
        if (!c){ let code; do { code = genCode(6); } while (idx.classes.includes(code)); c = { code, name: String(p.kl || 'Klasse'), created: Date.now(), students: [], settings: Object.assign({}, DEFAULT_CLASS_SETTINGS) }; idx.classes.push(code); await writeJSON('index.json', idx); }
        c.students = c.students || [];
        let s = c.students.find(x => !x.schapp && String(x.name).trim().toLowerCase() === String(p.n || '').trim().toLowerCase());
        if (!s){ s = { id: genId(), name: cleanName(p.n) || 'Kind', pin: uniquePin(await usedPins(idx)), created: Date.now() }; c.students.push(s); }
        s.schapp = p.k; await saveClass(c); hit = {c, s};
      }
      return res.json({ token: sign({r:'s', sid:hit.s.id, c:hit.c.code, exp:Date.now()+90*DAY}), name:hit.s.name, klasse:hit.c.name });
    }
    if (a === 'teacherLogin'){
      if (!TEACHER_PASSWORD) return res.status(500).json({error:'Kein Lehrer-Passwort eingerichtet.'});
      const f = failures.get('teacher') || {n:0,t:0};
      if (f.n >= 10 && Date.now() - f.t < 10*60000) return res.status(429).json({error:'Zu viele Versuche. Bitte später nochmals probieren.'});
      const pw = String(body.password||'');
      if (safeEq(TEACHER_PASSWORD, pw) || lpAusweisOk(pw, 'lichtwaechter')){ failures.delete('teacher'); return res.json({ token: sign({r:'t', exp:Date.now()+14*DAY}), admin:true }); }
      const zg = await getZugang();
      const kc = Object.keys(zg).find(k => zg[k] && zg[k].code && safeEq(zNorm(zg[k].code), zNorm(pw)));
      if (kc){ failures.delete('teacher'); return res.json({ token: sign({r:'t', k:kc, z:zg[kc].erstellt, exp:Date.now()+14*DAY}), admin:false, klasse:kc }); }
      failures.set('teacher',{n:f.n+1,t:Date.now()}); await sleep(700); return res.status(401).json({error:'Falsches Passwort.'});
    }

    if (a === 'status' || a === 'me' || a === 'save'){
      if (!auth || auth.r !== 's') return res.status(401).json({error:'Bitte neu anmelden.'});
      const c = await getClass(auth.c);
      const s = c && (c.students||[]).find(x=>x.id === auth.sid);
      if (!s) return res.status(401).json({error:'Dein Zugang wurde entfernt. Bitte melde dich bei deiner Lehrperson.'});
      if (a === 'status'){
        const p = pauseAktiv(c) ? c.pause : null;
        // Schapp (25.11.): Nutzung melden, Ruhezeit (z. B. 20–7 Uhr) → schlafen
        const r = p ? null : await schappAktiv('draht', c.name, s.name).catch(() => null);
        if (r && r.ruhe) return res.json({ paused: true, ruhe: true, msg: 'Jetzt ist Ruhezeit bis ' + String(r.bis || '07:00').replace(':', '.').replace(/^0/, '') + ' Uhr. Leg das Tablet weg – gute Nacht!', cls: publicClass(c) });
        return res.json({ paused: !!p, msg: p ? (p.msg || '') : '', cls: publicClass(c) });
      }
      const path = 'student/' + s.id + '.json';
      if (a === 'me'){
        const doc = (await readJSON(path)) || { id:s.id, state:null };
        return res.json({ name:s.name, cls:publicClass(c), doc });
      }
      const st = cleanState(body.state);
      if (!st) return res.status(413).json({error:'Zu viele Daten.'});
      const doc = { id:s.id, cls:auth.c, name:s.name, state:st, updated:Date.now() };
      await writeJSON(path, doc);
      return res.json({ ok:true, updated:doc.updated });
    }

    if (a && a.startsWith('t.')){
      if (!auth || auth.r !== 't') return res.status(401).json({error:'Bitte als Lehrperson anmelden.'});
      const admin = !auth.k;
      if (!admin){
        const zg = await getZugang();
        if (!zg[auth.k] || zg[auth.k].erstellt !== auth.z) return res.status(401).json({error:'Dein Zugang wurde geändert. Bitte mit dem neuen Code anmelden.'});
      }
      const idx = await getIndex();
      if (a === 't.classes'){
        await runSeed(idx);
        const out = [];
        for (const c of await allClasses(idx)) if (admin || c.code === auth.k) out.push({code:c.code, name:c.name, count:(c.students||[]).length});
        return res.json({ classes: out, admin, klasse: admin ? null : auth.k });
      }
      if (a === 't.zugang' || a === 't.setZugang'){
        if (!admin) return res.status(403).json({error:'Dafür hast du keinen Zugang.'});
        const zg = await getZugang();
        if (a === 't.setZugang'){
          const kc = normCode(body.code);
          const c = idx.classes.includes(kc) ? await getClass(kc) : null;
          if (!c) return res.status(404).json({error:'Klasse nicht gefunden.'});
          if (body.neu) zg[kc] = { code: 'draht-' + zSlug(c.name) + '-' + zTeil() + '-' + zTeil(), erstellt: Date.now() };
          else delete zg[kc];
          await writeJSON('lp-zugang.json', zg);
        }
        return res.json({ zugang: zg });
      }
      if (a === 't.createClass'){
        if (!admin) return res.status(403).json({error:'Dafür hast du keinen Zugang.'});
        let code; do { code = genCode(6); } while (idx.classes.includes(code));
        const c = { code, name: cleanName(body.name) || 'Neue Klasse', created:Date.now(), students:[], settings:Object.assign({}, DEFAULT_CLASS_SETTINGS) };
        await saveClass(c); idx.classes.push(code); await writeJSON('index.json', idx);
        return res.json({ cls:{code:c.code, name:c.name, count:0} });
      }
      const code = normCode(body.code);
      if (!admin && code !== auth.k) return res.status(403).json({error:'Dafür hast du keinen Zugang.'});
      if (!idx.classes.includes(code)) return res.status(404).json({error:'Klasse nicht gefunden.'});
      const c = await getClass(code);
      if (!c) return res.status(404).json({error:'Klasse nicht gefunden.'});
      c.students = c.students || [];
      if (a === 't.class'){
        const docs = await readMany(c.students.map(s => 'student/' + s.id + '.json'));
        const students = c.students.map((s,i) => ({ id:s.id, name:s.name, pin:s.pin, state: docs[i] ? docs[i].state : null, updated: docs[i] ? docs[i].updated : 0 }));
        return res.json({ cls:{ code:c.code, name:c.name, settings:settingsOf(c), pause:c.pause||null, students } });
      }
      if (a === 't.settings'){
        const p = body.settings || {};
        c.settings = Object.assign(settingsOf(c), { allOpen: !!p.allOpen, gamesOn: p.gamesOn !== false });
        if (body.name !== undefined) c.name = cleanName(body.name) || c.name;
        await saveClass(c); return res.json({ ok:true, settings:c.settings });
      }
      if (a === 't.pause'){
        c.pause = body.on ? { on:true, t:Date.now(), msg: String(body.msg || '').slice(0, 120) } : null;
        await saveClass(c); return res.json({ ok:true, pause:c.pause });
      }
      if (a === 't.addStudents'){
        const names = (body.names||[]).map(cleanName).filter(Boolean).slice(0,60);
        const used = await usedPins(idx); const added = [];
        for (const n of names){ const s = { id:genId(), name:n, pin:uniquePin(used), created:Date.now() }; c.students.push(s); added.push(s); }
        await saveClass(c); return res.json({ added });
      }
      if (a === 't.newPin'){
        const s = c.students.find(x=>x.id === body.sid); if (!s) return res.status(404).json({error:'Kind nicht gefunden.'});
        s.pin = uniquePin(await usedPins(idx)); await saveClass(c); return res.json({ pin:s.pin });
      }
      if (a === 't.resetStudent'){
        const s = c.students.find(x=>x.id === body.sid); if (!s) return res.status(404).json({error:'Kind nicht gefunden.'});
        await removeJSON('student/' + s.id + '.json'); return res.json({ ok:true });
      }
      if (a === 't.deleteStudent'){
        c.students = c.students.filter(x=>x.id !== body.sid);
        await saveClass(c); await removeJSON('student/' + body.sid + '.json'); return res.json({ ok:true });
      }
    }
    return res.status(400).json({error:'Unbekannte Aktion'});
  }catch(e){
    if (e && e.noDb) return res.status(503).json({error:'Die Datenbank ist noch nicht verbunden. Bitte die Lehrperson informieren.', noDb:true});
    console.error(e);
    return res.status(500).json({error:'Serverfehler – bitte nochmals versuchen.'});
  }
}
