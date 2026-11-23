// Lichtwächter-Labor – API (eine Funktion, Aktionen per JSON-Body)
import crypto from 'node:crypto';
import { SEED_VERSION, SEED_CLASSES } from '../lib/seed.js';

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

async function runSeed(idx){
  const flag = await readJSON('seed.json');
  if (flag && flag.v >= SEED_VERSION) return;
  for (const sc of SEED_CLASSES){
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
    if (a === 'teacherLogin'){
      if (!TEACHER_PASSWORD) return res.status(500).json({error:'Kein Lehrer-Passwort eingerichtet.'});
      const f = failures.get('teacher') || {n:0,t:0};
      if (f.n >= 10 && Date.now() - f.t < 10*60000) return res.status(429).json({error:'Zu viele Versuche. Bitte später nochmals probieren.'});
      if (!safeEq(TEACHER_PASSWORD, String(body.password||''))){ failures.set('teacher',{n:f.n+1,t:Date.now()}); await sleep(700); return res.status(401).json({error:'Falsches Passwort.'}); }
      failures.delete('teacher');
      return res.json({ token: sign({r:'t', exp:Date.now()+14*DAY}) });
    }

    if (a === 'status' || a === 'me' || a === 'save'){
      if (!auth || auth.r !== 's') return res.status(401).json({error:'Bitte neu anmelden.'});
      const c = await getClass(auth.c);
      const s = c && (c.students||[]).find(x=>x.id === auth.sid);
      if (!s) return res.status(401).json({error:'Dein Zugang wurde entfernt. Bitte melde dich bei deiner Lehrperson.'});
      if (a === 'status'){ const p = c.pause && c.pause.on ? c.pause : null; return res.json({ paused: !!p, msg: p ? (p.msg || '') : '', cls: publicClass(c) }); }
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
      const idx = await getIndex();
      if (a === 't.classes'){
        await runSeed(idx);
        const out = [];
        for (const c of await allClasses(idx)) out.push({code:c.code, name:c.name, count:(c.students||[]).length});
        return res.json({ classes: out });
      }
      if (a === 't.createClass'){
        let code; do { code = genCode(6); } while (idx.classes.includes(code));
        const c = { code, name: cleanName(body.name) || 'Neue Klasse', created:Date.now(), students:[], settings:Object.assign({}, DEFAULT_CLASS_SETTINGS) };
        await saveClass(c); idx.classes.push(code); await writeJSON('index.json', idx);
        return res.json({ cls:{code:c.code, name:c.name, count:0} });
      }
      const code = normCode(body.code);
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
