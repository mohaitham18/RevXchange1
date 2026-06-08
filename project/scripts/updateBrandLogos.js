const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const https    = require('https');
const http     = require('http');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const Brand = require('../models/Brand');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logoMap = {
  'toyota':      'https://similarpng.com/_next/image?url=https%3A%2F%2Fimage.similarpng.com%2Ffile%2Fsimilarpng%2Fvery-thumbnail%2F2020%2F09%2FToyota-logo-icon-on-transparent-background-PNG.png&w=1080&q=75',
  'bmw':          img src="/images/BMW2.png" alt="Featured Car",
  'mercedes':    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/960px-Mercedes-Logo.svg.png',
  'kia':         'https://www.carlogos.org/car-logos/kia-logo.png',
  'hyundai':     'https://car-brand-names.com/wp-content/uploads/2016/01/Hyundai-Logo.png',
  'nissan':      'https://1000logos.net/wp-content/uploads/2020/03/nissan-logo.png',
  'chevrolet':   'https://www.pngall.com/wp-content/uploads/13/Chevy-Logo-PNG-Picture.png',
  'honda':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/500px-Honda.svg.png',
  'renault':     'https://1000logos.net/wp-content/uploads/2021/03/Renault-logo.png',
  'mg':          'https://icon2.cleanpng.com/20180616/isr/aa6eez2yr.webp',
  'skoda':       'https://www.carlogos.org/car-logos/skoda-logo.png',
  'volkswagen':  'https://car-brand-names.com/wp-content/uploads/2016/01/Volkswagen-logo-1.png',
  'fiat':        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMNs0Ow3362Oy_N-gqC5_nMkJhS6U4szFN1Q&s',
  'chery':       'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvhjq-Y7ob4m4H8xR-SFTI_etRXN90012NPA&s',
  'opel':        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Opel_Logo_2021.svg/500px-Opel_Logo_2021.svg.png',
  'peugeot':     'https://logos-marcas.com/wp-content/uploads/2021/10/Peugeot-Logo.png',
  'mitsubishi':  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mitsubishi_logo.svg/960px-Mitsubishi_logo.svg.png',
  'daihatsu':    'https://toppng.com/uploads/preview/daihatsu-logo-vector-free-115741333151fr0lqjpxr.png',
  'daewoo':      'https://1000logos.net/wp-content/uploads/2020/04/Daewoo-Logo-1994.png',
  'mazda':       'https://www.carlogos.org/car-logos/mazda-logo.png',
  'seat':        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/SEAT_Logo_from_2017.svg/1280px-SEAT_Logo_from_2017.svg.png',
};

function downloadBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error('Too many redirects'));

    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'image/*,*/*;q=0.8',
      },
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
      res.on('data', (c) => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Download timed out after 15s'));
    });

    req.on('error', reject);
  });
}

function uploadBuffer(buffer, slug) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'revxchange/brands',
        public_id:     slug,
        overwrite:     true,
        resource_type: 'image',
        quality:       'auto',
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  let succeeded = 0;
  let failed    = 0;

  for (const [slug, url] of Object.entries(logoMap)) {
    try {
      const buffer   = await downloadBuffer(url);
      const cloudUrl = await uploadBuffer(buffer, slug);

      await Brand.updateOne({ slug }, { $set: { logoUrl: cloudUrl } });
      console.log(`✓  ${slug.padEnd(12)} → ${cloudUrl}`);
      succeeded++;
    } catch (err) {
      console.error(`✗  ${slug.padEnd(12)} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone — ${succeeded} succeeded, ${failed} failed`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
