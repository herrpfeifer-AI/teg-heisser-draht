// Aus der TypeScript-Version der Lern-Apps übersetzt (gleicher Ablauf wie in Ägypten/eduBS/Energie/Zehnfinger).
const SYNC = (process.env.SCHAPP_URL || "https://schapp-erlenmatt.vercel.app").replace(/\/+$/, "") + "/api/sync";
const gemeldet = /* @__PURE__ */ new Map();
const ruheMem = /* @__PURE__ */ new Map();
async function schappAktiv(app, klasse, kind) {
  const token = process.env.ELTERN_TOKEN;
  const kl = String(klasse || "").trim().toLowerCase();
  if (!token || !/^[0-9][a-z]$/.test(kl)) return null;
  const name = String(kind || "").trim().slice(0, 40);
  const jetzt = Date.now();
  const mem = ruheMem.get(kl);
  const key = `${kl}|${name}`;
  const melden = !!name && jetzt - (gemeldet.get(key) || 0) > 5 * 6e4;
  if (!melden && mem && jetzt - mem.at < 6e4) return mem.r;
  if (melden) gemeldet.set(key, jetzt);
  try {
    const res = await fetch(SYNC, {
      method: "POST",
      headers: { "content-type": "application/json", "x-eltern-token": token },
      body: JSON.stringify(melden ? { aktion: "aktiv", app, klasse: kl, name } : { aktion: "ruhe", klasse: kl }),
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const d = await res.json();
      const r = { ruhe: d?.ruhe === true, bis: d?.bis };
      ruheMem.set(kl, { at: jetzt, r });
      return r;
    }
  } catch {
  }
  if (mem) ruheMem.set(kl, { at: jetzt, r: mem.r });
  return mem?.r || null;
}
export {
  schappAktiv
};
