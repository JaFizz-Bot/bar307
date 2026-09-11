const http = require("http");
const path = require("path");
const express = require("express");

const PORT = Number(process.env.BAR307_PORT) || 8307;
const TAILSCALE_HOST = process.env.BAR307_TAILSCALE_HOST || "100.74.13.40";
const LOCAL_HOST = process.env.BAR307_LOCAL_HOST || "127.0.0.1";

const app = express();
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

module.exports = { app };
