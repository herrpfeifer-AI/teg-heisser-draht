// LP-Ausweis aus der Schapp (LP 25.11.2026): Die Lehrperson ist im Lehrerbereich der Schapp angemeldet und öffnet von dort
// den Lehrerteil dieser App – ohne eigenes Passwort. Die Schapp unterschreibt mit dem Schlüssel ELTERN_TOKEN dieser App.
// Format: lpa.<base64url({app, exp})>.<HMAC-SHA256(ELTERN_TOKEN, 'lp-ausweis|' + daten)>, gültig 12 Stunden.
import crypto from 'node:crypto';

export function lpAusweisOk(pw, app) {
  const key = process.env.ELTERN_TOKEN;
  if (!key || typeof pw !== 'string' || !pw.startsWith('lpa.') || pw.length > 600) return false;
  const [, daten, sig] = pw.split('.');
  if (!daten || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(crypto.createHmac('sha256', key).update('lp-ausweis|' + daten).digest('base64url'));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const d = JSON.parse(Buffer.from(daten, 'base64url').toString('utf8'));
    return d?.app === app && typeof d.exp === 'number' && d.exp > Date.now();
  } catch {
    return false;
  }
}
