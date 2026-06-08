const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fs   = require('fs');
const https = require('https');
const http  = require('http');
const mongoose  = require('mongoose');
const cloudinary = require('cloudinary').v2;

const Brand = require('../models/Brand');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Source map: slug → working URL ───────────────────────────────────────────
// icons8 = colour PNG | simple-icons = monochrome SVG | wikimedia = raw SVG
const SOURCE_MAP = {
  // icons8 colour PNGs — all confirmed 200
  toyota:      'https://img.icons8.com/color/96/toyota.png',
  bmw:         'https://img.icons8.com/color/96/bmw.png',
  mercedes:    'https://img.icons8.com/color/96/mercedes-benz.png',
  kia:         'https://img.icons8.com/color/96/kia.png',
  hyundai:     'https://img.icons8.com/color/96/hyundai.png',
  nissan:      'https://img.icons8.com/color/96/nissan.png',
  chevrolet:   'https://img.icons8.com/color/96/chevrolet.png',
  honda:       'https://img.icons8.com/color/96/honda.png',
  renault:     'https://img.icons8.com/color/96/renault.png',
  volkswagen:  'https://img.icons8.com/color/96/volkswagen.png',
  peugeot:     'https://img.icons8.com/color/96/peugeot.png',
  fiat:        'https://img.icons8.com/color/96/fiat.png',
  mitsubishi:  'https://img.icons8.com/color/96/mitsubishi.png',
  mazda:       'https://img.icons8.com/color/96/mazda.png',

  // simple-icons monochrome SVGs (brands not on icons8) — all confirmed 200
  skoda: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/skoda.svg',
  opel:  'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/opel.svg',
  seat:  'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/seat.svg',
  mg:    'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/mg.svg',

  // SVG data URIs — used when no external source is available (Chery/Daihatsu/Daewoo
  // are not in icons8 or simple-icons, and Wikimedia raw SVGs 404/rate-limit)
  chery:    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI0M4MTAyRSIvPjx0ZXh0IHg9IjUwIiB5PSI1NiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTciIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Q0hFUlk8L3RleHQ+PC9zdmc+',
  daihatsu: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI0NDMDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+REFJSEFUU1U8L3RleHQ+PC9zdmc+',
  daewoo:   'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iIzAwMzA4NyIvPjx0ZXh0IHg9IjUwIiB5PSI1NiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+REFFV09PPC90ZXh0Pjwvc3ZnPg==',
};

// revxchange uses a local file — handled separately
const LOCAL_LOGO = {
  revxchange: path.join(__dirname, '../public/images/Logo.png'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function downloadBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error('Too many redirects'));

    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'image/*,*/*;q=0.8',
        'Referer':    'https://en.wikipedia.org/',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(downloadBuffer(next, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function uploadBufferToCloudinary(buffer, slug) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'revxchange/brands',
        public_id:     slug,
        overwrite:     true,
        resource_type: 'image',
        quality:       'auto',
        fetch_format:  'auto',
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Download from URL and upload — retries once on 429 with a longer back-off
async function fetchAndUpload(url, slug, attempt = 1) {
  try {
    const buffer = await downloadBuffer(url);
    return await uploadBufferToCloudinary(buffer, slug);
  } catch (err) {
    if (attempt < 3 && (err.message.includes('429') || err.message.includes('503'))) {
      await sleep(3000 * attempt);
      return fetchAndUpload(url, slug, attempt + 1);
    }
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const brands = await Brand.find({}).lean();
  console.log(`Found ${brands.length} brands\n`);

  let succeeded = 0;
  let skipped   = 0;
  let failed    = 0;

  for (const brand of brands) {
    try {
      let cloudUrl;

      if (LOCAL_LOGO[brand.slug]) {
        // Upload from local file
        const buffer = fs.readFileSync(LOCAL_LOGO[brand.slug]);
        cloudUrl = await uploadBufferToCloudinary(buffer, brand.slug);
      } else if (SOURCE_MAP[brand.slug] && SOURCE_MAP[brand.slug].startsWith('data:')) {
        // data URI — Cloudinary accepts these directly
        cloudUrl = await cloudinary.uploader.upload(SOURCE_MAP[brand.slug], {
          folder: 'revxchange/brands', public_id: brand.slug,
          overwrite: true, resource_type: 'image', quality: 'auto', fetch_format: 'auto',
        }).then(r => r.secure_url);
      } else if (SOURCE_MAP[brand.slug]) {
        cloudUrl = await fetchAndUpload(SOURCE_MAP[brand.slug], brand.slug);
      } else {
        console.log(`⚠  ${brand.name} — no source URL configured, skipping`);
        skipped++;
        continue;
      }

      await Brand.updateOne({ _id: brand._id }, { $set: { logoUrl: cloudUrl } });
      console.log(`✓  ${brand.name} → ${cloudUrl}`);
      succeeded++;
    } catch (err) {
      console.error(`✗  ${brand.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone — ${succeeded} uploaded, ${skipped} skipped, ${failed} failed`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
