// Builds the two WebGL hero layers from the hero photo and the person cutout:
//   public/hero/home-person.png — the cutout, moved into the hero's framing, with edge colours
//                                 bled under soft edges so filtering never shows a halo.
//   public/hero/home-plate.jpg  — the hero photo with the person painted out from the surroundings
//                                 (only a thin sliver of it is ever revealed by the parallax).
// Re-run after changing either image:  node scripts/build-hero-layers.mjs
import sharp from "sharp";

const PHOTO = "public/hero/home-bg.jpg";
const CUTOUT = "assets/hero/person-cutout.png";
/* Where the cutout sits relative to PHOTO — measured by maximising silhouette overlap (IoU). */
const OFFSET_X = -361;
const OFFSET_Y = 0;
/** Margin painted out around the person, in px — just enough to cover the soft edge. */
const HOLE_MARGIN = 3;

const { width: W, height: H } = await sharp(PHOTO).metadata();
const raw = (channels) => ({ raw: { width: W, height: H, channels } });

// --- Person layer: shift into place, pad to the photo size (copying the edge row). ---
const cut = await sharp(CUTOUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const person = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  const sy = Math.min(cut.info.height - 1, y - OFFSET_Y);
  for (let x = 0; x < W; x++) {
    const sx = x - OFFSET_X;
    if (sx < 0 || sx >= cut.info.width || sy < 0) continue;
    const from = (sy * cut.info.width + sx) * 4;
    cut.data.copy(person, (y * W + x) * 4, from, from + 4);
  }
}

// Match the cutout's tone to the photo (least-squares gain + offset over solid pixels).
const photo = await sharp(PHOTO).removeAlpha().raw().toBuffer();
let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
for (let i = 0; i < W * H; i++) {
  if (person[i * 4 + 3] < 255) continue;
  for (let c = 0; c < 3; c++) {
    const x = person[i * 4 + c], y = photo[i * 3 + c];
    n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
}
const gain = (n * sxy - sx * sy) / (n * sxx - sx * sx);
const bias = (sy - gain * sx) / n;
for (let i = 0; i < W * H; i++) {
  for (let c = 0; c < 3; c++) person[i * 4 + c] = Math.max(0, Math.min(255, Math.round(gain * person[i * 4 + c] + bias)));
}

// Bleed edge colours under transparent pixels: normalised blur of alpha-weighted colour.
const weighted = Buffer.alloc(W * H * 3);
const alpha = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) {
  const a = person[i * 4 + 3];
  alpha[i] = a;
  for (let c = 0; c < 3; c++) weighted[i * 3 + c] = Math.round((person[i * 4 + c] * a) / 255);
}
const blurredColour = await sharp(weighted, raw(3)).blur(4).raw().toBuffer();
const blurredAlpha = await sharp(alpha, raw(1)).blur(4).extractChannel(0).raw().toBuffer();
for (let i = 0; i < W * H; i++) {
  if (person[i * 4 + 3] === 255 || blurredAlpha[i] === 0) continue;
  for (let c = 0; c < 3; c++) {
    person[i * 4 + c] = Math.min(255, Math.round((blurredColour[i * 3 + c] * 255) / blurredAlpha[i]));
  }
}
await sharp(person, raw(4)).png({ compressionLevel: 9 }).toFile("public/hero/home-person.png");

// --- Clean plate: paint out the person, widened by HOLE_MARGIN. ---
const hole = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) hole[i] = alpha[i] > 8 ? 255 : 0;
const widened = await sharp(hole, raw(1)).blur(HOLE_MARGIN / 2).extractChannel(0).raw().toBuffer();
const known = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) known[i] = widened[i] > 4 ? 0 : 255;

// Normalised blur at growing radii; each hole pixel takes the finest level that reaches it.
const knownColour = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) knownColour[i * 3 + c] = known[i] ? photo[i * 3 + c] : 0;
const plate = Buffer.from(photo);
const filled = new Uint8Array(W * H);
for (const sigma of [6, 14, 30, 70, 150]) {
  const colour = await sharp(knownColour, raw(3)).blur(sigma).raw().toBuffer();
  const weight = await sharp(known, raw(1)).blur(sigma).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < W * H; i++) {
    if (known[i] || filled[i] || weight[i] < 40) continue;
    for (let c = 0; c < 3; c++) plate[i * 3 + c] = Math.min(255, Math.round((colour[i * 3 + c] * 255) / weight[i]));
    filled[i] = 1;
  }
}
await sharp(plate, raw(3)).jpeg({ quality: 90, mozjpeg: true }).toFile("public/hero/home-plate.jpg");

console.log(`home-person.png + home-plate.jpg written (${W}x${H}, offset ${OFFSET_X},${OFFSET_Y}, tone gain ${gain.toFixed(3)} bias ${bias.toFixed(1)})`);
