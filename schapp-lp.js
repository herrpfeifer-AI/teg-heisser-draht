/* Lehrerteil aus der Schapp \u00f6ffnen (LP 25.11.2026): Die Schapp schickt einen LP-Ausweis mit (#lpausweis=\u2026&zurueck=\u2026).
 * Mit data-pw-key legt dieses Skript den Ausweis dort ab, wo die App sonst das Lehrer-Passwort speichert (sessionStorage),
 * bevor die App startet \u2013 die App meldet sich damit an wie mit dem Passwort. Ohne data-pw-key \u00fcbernimmt die App das selbst.
 * Mit data-code-key: #lpcode=1234 (Test-Konto der Lehrperson) wird als Kindercode gespeichert.
 * Dazu ein Knopf \u00ab\u2039 Schapp\u00bb unten links, solange man im Lehrerteil ist. Gleiches Skript in allen Lern-Apps.
 */
(function () {
  'use strict';
  var s = document.currentScript;
  var key = s && s.getAttribute('data-pw-key');
  var h = location.hash || '';
  var m = h.match(/lpausweis=([^&]+)/);
  var z = h.match(/zurueck=([^&]+)/);
  var OK = /^https:\/\/[a-z0-9.-]+\.(schapp\.ch|vercel\.app)(\/[^\s]*)?$/i;
  // Kinderansicht der Lehrperson (Schapp): #lpcode=1234 = Code des Test-Kontos dieser App -> dort ablegen, wo die App den Kindercode speichert
  var codeKey = s && s.getAttribute('data-code-key');
  var c = h.match(/lpcode=(\d{4})/);
  try {
    if (c && codeKey) {
      localStorage.setItem(codeKey, c[1]);
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (m) {
      var ziel = z ? decodeURIComponent(z[1]) : '';
      sessionStorage.setItem('schapp-zurueck', OK.test(ziel) ? ziel : 'https://schapp-erlenmatt.vercel.app/lehrer');
      if (key) {
        sessionStorage.setItem(key, decodeURIComponent(m[1]));
        history.replaceState(null, '', location.pathname + location.search);
      }
    }
  } catch (e) { /* egal */ }

  var a = null;
  function lehrerteil() {
    return /\/lehrer/.test(location.pathname) || /lehrer/.test(location.hash);
  }
  function zeige() {
    var u = null;
    try { u = sessionStorage.getItem('schapp-zurueck'); } catch (e) { /* egal */ }
    var an = !!u && OK.test(u) && lehrerteil();
    if (an && !a) {
      a = document.createElement('a');
      a.href = u;
      a.textContent = '\u2039 Schapp';
      a.title = 'Zur\u00fcck zum Lehrerbereich der Schapp';
      a.setAttribute('style', 'position:fixed;left:14px;bottom:14px;z-index:2147483000;background:#24584a;color:#fff;font:600 15px/1 system-ui,sans-serif;padding:11px 16px;border-radius:999px;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.25)');
      a.className = 'noprint nicht-drucken';
      document.body.appendChild(a);
    }
    if (a) a.style.display = an ? '' : 'none';
  }
  if (document.body) zeige(); else document.addEventListener('DOMContentLoaded', zeige);
  window.addEventListener('hashchange', zeige);
  window.addEventListener('popstate', zeige);
})();
