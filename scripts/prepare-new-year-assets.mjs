import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const source = process.argv[2];
const fir = process.argv[3] || path.resolve('source-assets/new-year-night-2027/frosted-fir.png');
if (!source) {
  console.error('Usage: node scripts/prepare-new-year-assets.mjs <handoff-package-root> [frosted-fir.png]');
  process.exit(1);
}

const output = path.resolve('public/new-year-night-2027');
await fs.mkdir(output, { recursive: true });

const images = [
  ['conga_stage_with_guests.png', 'conga-stage-guests.webp'],
  ['conga_stage_festive.png', 'conga-stage-festive.webp'],
  ['private_company_toast.png', 'private-company.webp'],
  ['festive_table.png', 'festive-table.webp'],
];

for (const [input, name] of images) {
  await sharp(path.join(source, 'assets/illustrations', input))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(output, name));
}

// Trim extra Christmas trees at both far edges, preserving the central room.
await sharp(path.join(source, 'assets/illustrations/conga_dining.png'))
  .extract({ left: 80, top: 0, width: 1380, height: 941 })
  .resize({ width: 1400, withoutEnlargement: true })
  .webp({ quality: 82, effort: 6 })
  .toFile(path.join(output, 'conga-dining.webp'));

await sharp(fir).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80, effort: 6 })
  .toFile(path.join(output, 'frosted-fir.webp'));

await sharp(path.resolve('source-assets/new-year-night-2027/snow-lantern.png'))
  .resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82, effort: 6 })
  .toFile(path.join(output, 'snow-lantern.webp'));

for (const name of ['conga-stage-guests-v2', 'conga-stage-festive-v2', 'winter-lanterns']) {
  await sharp(path.resolve('source-assets/new-year-night-2027', `${name}.png`))
    .resize({ width: name === 'winter-lanterns' ? 1800 : 1400, withoutEnlargement: true })
    .webp({ quality: 84, effort: 6 })
    .toFile(path.join(output, `${name}.webp`));
}

await sharp(path.resolve('source-assets/new-year-night-2027/frosted-edge.png'))
  .resize({ height: 1200 }).webp({ quality: 82, effort: 6 })
  .toFile(path.join(output, 'frosted-edge.webp'));

await sharp(path.resolve('source-assets/new-year-night-2027/conga-stage-guests-v3.png'))
  .webp({ quality: 90, effort: 6 })
  .toFile(path.join(output, 'conga-stage-guests-v3.webp'));

console.log(`Prepared ${images.length + 8} assets in ${output}`);
