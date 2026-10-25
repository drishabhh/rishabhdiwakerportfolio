// Builds public/hero/home-depth.png — the depth map the WebGL hero uses for its 2.5D parallax
// (white = near, black = far). The person comes from the cutout in mountain-dark.png; the
// landscape is a sky → peaks → forest gradient. Re-run after changing either hero image:
//   node scripts/build-hero-depth.mjs
import sharp from "sharp";

const W = 512;
const H = 288;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Person mask: any non-black pixel in the cutout, holes in the dark jacket closed by
// blur + threshold, then a soft edge so parallax doesn't tear the silhouette.
const raw = await sharp("public/hero/mountain-dark.png").resize(W, H).greyscale().raw().toBuffer();
const binary = Buffer.from(raw.map((v) => (v > 0 ? 255 : 0)));
// sharp's blur() returns RGB for 1-channel input, so pin each stage back to one channel.
const closed = await sharp(binary, { raw: { width: W, height: H, channels: 1 } }).blur(3).extractChannel(0).raw().toBuffer();
const solid = Buffer.from(closed.map((v) => (v > 70 ? 255 : 0)));

// The darkest clothing is pure black in the cutout and leaves holes inside the outline.
// Flood the background in from the image border; anything it can't reach is inside the person.
const outside = new Uint8Array(W * H);
const queue = [];
for (let x = 0; x < W; x++) queue.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) queue.push(y * W, y * W + W - 1);
while (queue.length) {
  const i = queue.pop();
  if (outside[i] || solid[i]) continue;
  outside[i] = 1;
  const x = i % W;
  if (x > 0) queue.push(i - 1);
  if (x < W - 1) queue.push(i + 1);
  if (i >= W) queue.push(i - W);
  if (i < W * (H - 1)) queue.push(i + W);
}
for (let i = 0; i < W * H; i++) if (!outside[i]) solid[i] = 255;
const mask = await sharp(solid, { raw: { width: W, height: H, channels: 1 } }).blur(2).extractChannel(0).raw().toBuffer();

const depth = Buffer.alloc(W * H);
for (let y = 0; y < H; y++) {
  const land = 0.06 + 0.55 * smoothstep(0.3, 1, y / H);
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    depth[i] = Math.round(255 * Math.max(land, mask[i] / 255));
  }
}

await sharp(depth, { raw: { width: W, height: H, channels: 1 } })
  .blur(1)
  .extractChannel(0)
  .png({ compressionLevel: 9 })
  .toFile("public/hero/home-depth.png");

console.log(`public/hero/home-depth.png (${W}x${H}) written`);
