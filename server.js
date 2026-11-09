const http = require("http");
const path = require("path");
const express = require("express");

const PORT = Number(process.env.BAR307_PORT) || 8307;
const TAILSCALE_HOST = process.env.BAR307_TAILSCALE_HOST || "100.74.13.40";
const LOCAL_HOST = process.env.BAR307_LOCAL_HOST || "127.0.0.1";

// Host-allowlist tegen DNS-rebinding (hardening-audit 9 nov 2026, bevinding
// 20): `curl -H 'Host: aanvaller.example' http://127.0.0.1:8307/` gaf 200. Een
// webpagina die via rebinding op 127.0.0.1 of het Tailscale-IP uitkomt, kon
// de site zo lezen. Als allereerste middleware, vóór express.static, anders
// blijven de statische bestanden te lezen. Zelfde lijst als het dashboard
// (~/dashboard/lib/host-guard.js); JAFIZZ_ALLOWED_HOSTS (komma-lijst) is het
// noodluik voor een nieuwe naam zonder codewijziging. Geen 'trust proxy',
// anders volgt req.hostname X-Forwarded-Host.
function normaliseerHost(waarde) {
  let host = String(waarde || "").trim().toLowerCase();
  if (host.startsWith("[")) {
    const eind = host.indexOf("]");
    host = eind > 0 ? host.slice(1, eind) : "";
  } else if ((host.match(/:/g) || []).length === 1) {
    host = host.replace(/:\d*$/, "");
  }
  return host.replace(/\.$/, "");
}

const TOEGESTANE_HOSTS = new Set([
  "127.0.0.1", "localhost", "::1", "100.74.13.40", "jafizz-server", "jafizz-server.tailee3c2b.ts.net",
  LOCAL_HOST, TAILSCALE_HOST,
  ...String(process.env.JAFIZZ_ALLOWED_HOSTS || "").split(","),
].map(normaliseerHost).filter(Boolean));

function hostGuard(req, res, next) {
  if (TOEGESTANE_HOSTS.has(normaliseerHost(req.hostname))) return next();
  res.status(421).json({ error: "Onbekende host." });
}

const app = express();
app.use(hostGuard);
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => res.status(404).json({ error: "Niet gevonden." }));

function listenWithRetry(host, { retries = 12, delayMs = 5000 } = {}) {
  const server = http.createServer(app);
  let attempt = 0;

  function tryListen() {
    server.once("error", (err) => {
      attempt += 1;
      if (attempt >= retries) {
        console.error(`[bar307] gaf het op om te binden aan ${host}:${PORT} — ${err.message}`);
        return;
      }
      console.warn(`[bar307] kon nog niet binden aan ${host}:${PORT} (${err.message}), retry over ${delayMs}ms`);
      setTimeout(tryListen, delayMs);
    });
    server.listen(PORT, host, () => {
      console.log(`[bar307] luistert op http://${host}:${PORT}`);
    });
  }

  tryListen();
  return server;
}

if (require.main === module) {
  for (const host of new Set([LOCAL_HOST, TAILSCALE_HOST])) listenWithRetry(host);
}

module.exports = { app, normaliseerHost };
