const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "..", "public", "images", "bar-counter.jpg");
const OUT = path.join(__dirname, "..", "public", "images", "logo.png");

const CROP = { left: 715, top: 908, width: 420, height: 390 };
const W = 640;
const H = Math.round((CROP.height / CROP.width) * W);
const RADIUS = 36;
const BORDER = 6;

const roundedMask = Buffer.from(
  `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`
);

const borderRing = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffcb3d"/>
      <stop offset="100%" stop-color="#ff3fb4"/>
    </linearGradient>
  </defs>
  <rect x="${BORDER / 2}" y="${BORDER / 2}" width="${W - BORDER}" height="${H - BORDER}"
        rx="${RADIUS}" ry="${RADIUS}" fill="none" stroke="url(#ring)" stroke-width="${BORDER}"/>
</svg>`);

async function run() {
  const photo = await sharp(SRC)
    .extract(CROP)
    .resize({ width: W, height: H, fit: "cover" })
    .modulate({ brightness: 1.08, saturation: 0.55 })
    .linear(1.12, -8)
    .ensureAlpha()
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(photo)
    .composite([{ input: borderRing }])
    .png()
    .toFile(OUT);

  console.log("logo.png geschreven:", OUT, W, H);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
