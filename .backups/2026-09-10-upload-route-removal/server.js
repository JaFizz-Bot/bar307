const http = require("http");
const path = require("path");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const PORT = Number(process.env.BAR307_PORT) || 8307;
const TAILSCALE_HOST = process.env.BAR307_TAILSCALE_HOST || "100.74.13.40";
const LOCAL_HOST = process.env.BAR307_LOCAL_HOST || "127.0.0.1";

const IMAGES_DIR = path.join(__dirname, "public", "images");

// De 5 vaste foto-slots die de site verwacht (public/index.html verwijst naar deze bestandsnamen).
const PHOTO_SLOTS = [
  { field: "hero-terrace", filename: "hero-terrace.jpg", label: "Hero — terras / uitzicht op straat" },
  { field: "ceiling-flags", filename: "ceiling-flags.jpg", label: "Plafond met vlaggen / discobal" },
  { field: "drinks-fridge", filename: "drinks-fridge.jpg", label: "Drankkoelkasten" },
  { field: "bar-counter", filename: "bar-counter.jpg", label: "Bartoog / personeel" },
  { field: "pool-table", filename: "pool-table.jpg", label: "Poolbiljart" },
  { field: "team", filename: "team.jpg", label: "Team-foto" },
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/admin/upload", (req, res) => {
  const rows = PHOTO_SLOTS.map(
    (slot) => `
      <label style="display:block;margin:0 0 18px;font:15px/1.4 sans-serif;color:#f5f0fa;">
        ${slot.label}<br>
        <input type="file" name="${slot.field}" accept="image/*" style="margin-top:6px;">
      </label>`
  ).join("");
  res.send(`<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bar 307 — foto's uploaden</title></head>
<body style="background:#120a1f;padding:24px;max-width:480px;margin:0 auto;">
  <h1 style="font:700 22px sans-serif;color:#fff;">Bar 307 — foto's uploaden</h1>
  <p style="font:14px sans-serif;color:#c9bcd9;">Kies per veld de bijpassende foto. Alleen ingevulde velden worden overschreven.</p>
  <form method="POST" action="/admin/upload" enctype="multipart/form-data">
    ${rows}
    <button type="submit" style="padding:12px 24px;border:0;border-radius:999px;background:linear-gradient(120deg,#ffcb3d,#ff3fb4);font:700 15px sans-serif;color:#1a0b2e;">Uploaden</button>
  </form>
</body></html>`);
});

app.post(
  "/admin/upload",
  upload.fields(PHOTO_SLOTS.map((slot) => ({ name: slot.field, maxCount: 1 }))),
  async (req, res) => {
    const results = [];
    for (const slot of PHOTO_SLOTS) {
      const file = req.files?.[slot.field]?.[0];
      if (!file) continue;
      try {
        await sharp(file.buffer)
          .rotate()
          .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(path.join(IMAGES_DIR, slot.filename));
        results.push(`${slot.filename}: OK`);
      } catch (err) {
        results.push(`${slot.filename}: MISLUKT — ${err.message} (probeer als JPEG/PNG te exporteren)`);
      }
    }
    if (results.length === 0) {
      return res.send(`<p style="font:15px sans-serif;color:#f5f0fa;background:#120a1f;padding:24px;">Geen bestanden ontvangen. <a href="/admin/upload" style="color:#29d4ff;">Terug</a></p>`);
    }
    res.send(`<!DOCTYPE html><html lang="nl"><body style="background:#120a1f;padding:24px;font:15px sans-serif;color:#f5f0fa;">
      <h1 style="font-size:20px;">Verwerkt</h1>
      <ul>${results.map((r) => `<li>${r}</li>`).join("")}</ul>
      <p><a href="/" style="color:#29d4ff;">Bekijk de site</a> · <a href="/admin/upload" style="color:#29d4ff;">Nog een keer uploaden</a></p>
    </body></html>`);
  }
);

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

for (const host of new Set([LOCAL_HOST, TAILSCALE_HOST])) listenWithRetry(host);

module.exports = { app };
