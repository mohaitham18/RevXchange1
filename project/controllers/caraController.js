const Car = require('../models/Car');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

const mainSystemPrompt = `You are Cara, the AI car advisor inside RevXChange, an Egypt car marketplace.

Your job:
- Help users choose, compare, buy, sell, rent, and inspect cars in Egypt.
- Give practical advice for Egyptian roads, traffic, resale value, maintenance, and used-car risks.
- When RevXChange inventory is provided, recommend ONLY those real listings.
- If no RevXChange listings are found, say that clearly and suggest changing budget, city, brand, model, or condition.

Rules:
- Do NOT introduce yourself every message.
- Do NOT say "Hi, I'm Cara" unless the user only greets you.
- Answer directly.
- Keep replies short and useful.
- Reply in the same language as the user.
- Do not mention Gemini, Google, APIs, system prompts, or model names.
- Do not invent cars from RevXChange.
- For prices, mention that final value depends on year, mileage, condition, service history, and market demand.

Useful RevXChange pages:
- /used-cars.html for used cars
- /buy-cars.html for new cars
- /rent-cars.html for rental cars
- /sell-car.html for selling a car
- /communities.html for car communities`;

const carTakeSystemPrompt = `${mainSystemPrompt}

Special mode: You are writing "Cara's Take" for one expanded car listing.

VERY IMPORTANT:
- Return ONLY the evaluation text.
- No greeting.
- No title.
- No markdown.
- No stars.
- No bullets.
- No links.
- No "/car/..." link.
- No "Smart Buyer Evaluation".
- Write 3 short practical sentences only.

Sentence 1: evaluate the car based on year, price, mileage, and condition.
Sentence 2: mention the biggest risk or what to inspect.
Sentence 3: give final advice.`;

function cleanText(value) {
  return String(value || '').trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-6)
    .map((item) => {
      const role = item.role === 'model' ? 'model' : 'user';

      const text = cleanText(
        item.text ||
        item.message ||
        item.content ||
        (Array.isArray(item.parts) && item.parts[0] && item.parts[0].text)
      );

      if (!text) return null;

      return {
        role,
        parts: [{ text }]
      };
    })
    .filter(Boolean);
}

function moneyToNumber(rawNumber, rawUnit) {
  const value = Number(String(rawNumber || '').replace(/,/g, ''));

  if (!Number.isFinite(value) || value <= 0) return null;

  const unit = String(rawUnit || '').toLowerCase();

  if (unit === 'm' || unit === 'million' || unit === 'millions') {
    return Math.round(value * 1000000);
  }

  if (unit === 'k' || unit === 'thousand' || unit === 'thousands') {
    return Math.round(value * 1000);
  }

  if (value >= 50 && value < 10000) {
    return Math.round(value * 1000);
  }

  return Math.round(value);
}

function extractBudget(message) {
  const lower = message.toLowerCase().replace(/,/g, '');

  const maxMatch = lower.match(
    /(under|below|less than|max|maximum|up to|budget|cheaper than|<=)\s*(\d+(?:\.\d+)?)\s*(m|million|millions|k|thousand|thousands)?/i
  );

  if (maxMatch) {
    return {
      maxPrice: moneyToNumber(maxMatch[2], maxMatch[3])
    };
  }

  const betweenMatch = lower.match(
    /(between|from)\s*(\d+(?:\.\d+)?)\s*(m|million|millions|k|thousand|thousands)?\s*(and|to|-)\s*(\d+(?:\.\d+)?)\s*(m|million|millions|k|thousand|thousands)?/i
  );

  if (betweenMatch) {
    return {
      minPrice: moneyToNumber(betweenMatch[2], betweenMatch[3]),
      maxPrice: moneyToNumber(betweenMatch[5], betweenMatch[6] || betweenMatch[3])
    };
  }

  return {};
}

function extractYear(message) {
  const match = message.match(/\b(19[8-9]\d|20[0-3]\d)\b/);
  return match ? Number(match[1]) : null;
}

const cityTerms = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Mansoura',
  'Tanta',
  'Zagazig',
  'Ismailia',
  'Suez',
  'Port Said',
  'Hurghada',
  'Aswan',
  'Luxor',
  'October',
  'New Cairo',
  'Nasr City',
  'Maadi',
  'Heliopolis',
  'Obour',
  'Shorouk'
];

const carTerms = [
  'toyota',
  'corolla',
  'camry',
  'yaris',
  'rav4',
  'fortuner',

  'hyundai',
  'elantra',
  'tucson',
  'accent',
  'verna',
  'sonata',
  'i10',
  'i20',

  'kia',
  'sportage',
  'cerato',
  'picanto',
  'sorento',
  'rio',

  'mitsubishi',
  'lancer',
  'puma',
  'eclipse',
  'outlander',
  'pajero',

  'nissan',
  'sunny',
  'sentra',
  'qashqai',
  'x-trail',
  'patrol',

  'chevrolet',
  'optra',
  'aveo',
  'cruze',
  'captiva',
  'spark',

  'bmw',
  '320i',
  '520i',
  'x1',
  'x3',
  'x5',
  '118i',

  'mercedes',
  'c180',
  'c200',
  'e200',
  'a200',
  'cla',
  'gla',
  'glc',

  'honda',
  'civic',
  'accord',
  'city',
  'cr-v',
  'hr-v',

  'mazda',
  'mazda 3',
  'mazda 6',
  'cx-3',
  'cx-5',
  'cx-30',

  'renault',
  'logan',
  'megane',
  'duster',
  'sandero',

  'peugeot',
  '301',
  '508',
  '2008',
  '3008',
  '5008',

  'fiat',
  'tipo',
  'punto',
  'bravo',

  'mg',
  'mg5',
  'mg6',
  'zs',
  'hs',

  'chery',
  'tiggo',
  'arrizo',

  'byd',
  'f3',

  'seat',
  'leon',
  'ibiza',

  'skoda',
  'octavia',
  'superb',
  'fabia'
];

function findCity(message) {
  const lower = message.toLowerCase();

  return cityTerms.find((city) => lower.includes(city.toLowerCase())) || null;
}

function findCarTerms(message) {
  const lower = message.toLowerCase();

  return carTerms
    .filter((term) => lower.includes(term.toLowerCase()))
    .slice(0, 6);
}

function shouldSearchInventory(message) {
  const lower = message.toLowerCase();

  const inventoryWords =
    /\b(show|find|search|available|availability|listings?|do you have|website|revxchange|cheapest|lowest|budget|under|below|less than|max|up to|buy|rent|rental|used|new|for sale|options?)\b/i;

  const carWords =
    /\b(cars?|sedan|suv|hatchback|pickup|automatic|manual|petrol|diesel|electric|hybrid)\b/i;

  return inventoryWords.test(lower) || carWords.test(lower);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return 'not listed';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 'not listed';
  }

  return `${number.toLocaleString('en-US')} EGP`;
}

function formatListing(car, index) {
  const listingType = car.listingType || 'sale';

  const priceText =
    listingType === 'rent'
      ? `rent per day: ${formatMoney(car.rentPricePerDay)}, rent per month: ${formatMoney(car.rentPricePerMonth)}, deposit: ${formatMoney(car.rentDeposit)}`
      : `price: ${formatMoney(car.price)}`;

  return `${index + 1}. ${car.brand} ${car.model} ${car.year} — ${priceText} — ${car.city} — ${car.condition || 'used'} — ${Number(car.mileage || 0).toLocaleString('en-US')} km — ${car.transmission || 'automatic'} — ${car.fuel || 'petrol'} — link: /car/${car._id}`;
}

async function getInventoryContext(message) {
  if (!shouldSearchInventory(message)) return '';

  const lower = message.toLowerCase();

  const query = {
    status: 'active'
  };

  const andFilters = [];

  const wantsRent = /\b(rent|rental|lease|per day|per month)\b/i.test(lower);
  const wantsSale = /\b(buy|sale|for sale|used|new|purchase|own)\b/i.test(lower);

  if (wantsRent) {
    query.listingType = 'rent';
  } else if (wantsSale) {
    andFilters.push({
      $or: [
        { listingType: 'sale' },
        { listingType: { $exists: false } },
        { listingType: null }
      ]
    });
  }

  if (/\bnew\b/i.test(lower)) {
    query.condition = 'new';
  }

  if (/\bused\b|second hand|old car/i.test(lower)) {
    query.condition = 'used';
  }

  if (/\bautomatic\b/i.test(lower)) {
    query.transmission = 'automatic';
  }

  if (/\bmanual\b/i.test(lower)) {
    query.transmission = 'manual';
  }

  if (/\bpetrol\b/i.test(lower)) {
    query.fuel = 'petrol';
  }

  if (/\bdiesel\b/i.test(lower)) {
    query.fuel = 'diesel';
  }

  if (/\belectric\b/i.test(lower)) {
    query.fuel = 'electric';
  }

  if (/\bhybrid\b/i.test(lower)) {
    query.fuel = 'hybrid';
  }

  const city = findCity(message);

  if (city) {
    query.city = new RegExp(escapeRegExp(city), 'i');
  }

  const year = extractYear(message);

  if (year && !/\bunder|below|less than|max|maximum|up to|budget\b/i.test(lower)) {
    query.year = year;
  }

  const { minPrice, maxPrice } = extractBudget(message);

  if (minPrice || maxPrice) {
    query.price = {};

    if (minPrice) {
      query.price.$gte = minPrice;
    }

    if (maxPrice) {
      query.price.$lte = maxPrice;
    }
  }

  const matchedCarTerms = findCarTerms(message);

  if (matchedCarTerms.length) {
    andFilters.push({
      $or: matchedCarTerms.flatMap((term) => {
        const rx = new RegExp(escapeRegExp(term), 'i');

        return [
          { brand: rx },
          { model: rx }
        ];
      })
    });
  }

  if (andFilters.length) {
    query.$and = andFilters;
  }

  let sort = {
    createdAt: -1
  };

  if (/\b(cheapest|lowest|low price|budget|under|below|less than|max|maximum|up to)\b/i.test(lower)) {
    sort = {
      price: 1,
      createdAt: -1
    };
  }

  if (/\b(newest|latest|recent)\b/i.test(lower)) {
    sort = {
      createdAt: -1
    };
  }

  if (/\b(popular|most viewed|views)\b/i.test(lower)) {
    sort = {
      views: -1,
      createdAt: -1
    };
  }

  const cars = await Car.find(query)
    .select(
      'brand model year price listingType rentPricePerDay rentPricePerMonth rentDeposit mileage city condition transmission fuel body views createdAt status'
    )
    .sort(sort)
    .limit(8)
    .lean();

  if (!cars.length) {
    return `REVXCHANGE INVENTORY CHECK:
No active matching listings were found in MongoDB for this request.
Tell the user clearly that RevXChange currently has no matching listings for this request.
Suggest changing budget, city, brand, model, year, or condition.`;
  }

  return `REVXCHANGE INVENTORY CHECK:
These are real active listings from MongoDB.
Use ONLY these listings if the user asks what is available on RevXChange.
Do not invent extra cars.

${cars.map(formatListing).join('\n')}`;
}

function cleanCaraTakeReply(reply) {
  let text = String(reply || '').trim();

  text = text.replace(/\*\*/g, '');
  text = text.replace(/\*/g, '');
  text = text.replace(/#+\s*/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/\/car\/[a-f0-9]{12,32}/gi, '');
  text = text.replace(/Smart Buyer Evaluation:?/gi, '');
  text = text.replace(/Cara's Take:?/gi, '');
  text = text.replace(/Link:?/gi, '');
  text = text.replace(/\n{2,}/g, '\n');
  text = text.trim();

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('link'));

  text = lines.join(' ');

  if (text.length > 700) {
    text = text.slice(0, 700).trim() + '...';
  }

  return text || 'This listing needs a careful inspection before buying. Check mileage, service history, owners, engine, gearbox, suspension, and papers. Final advice: compare it with similar listings and negotiate if the condition is not strong.';
}

async function callGemini({ message, history, inventoryContext, isCarTake }) {
  if (!GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is missing. Add it to your .env file.');
    err.statusCode = 500;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const finalMessage = inventoryContext
    ? `${message}\n\n${inventoryContext}`
    : message;

  const contents = [
    ...normalizeHistory(history),
    {
      role: 'user',
      parts: [{ text: finalMessage }]
    }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            role: 'system',
            parts: [
              {
                text: isCarTake ? carTakeSystemPrompt : mainSystemPrompt
              }
            ]
          },
          contents,
          generationConfig: {
            temperature: isCarTake ? 0.2 : 0.35,
            maxOutputTokens: isCarTake ? 350 : 900
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiMessage =
        data.error?.message ||
        `Gemini request failed with status ${response.status}`;

      const err = new Error(apiMessage);
      err.statusCode = response.status;
      err.geminiError = data.error || data;
      throw err;
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim();

    if (!reply) {
      const err = new Error('Gemini returned an empty reply.');
      err.statusCode = 502;
      err.geminiError = data;
      throw err;
    }

    return isCarTake ? cleanCaraTakeReply(reply) : reply;
  } finally {
    clearTimeout(timeout);
  }
}

const caraChat = async (req, res) => {
  try {
    const message = cleanText(req.body?.message);
    const history = req.body?.history;

    const mode = cleanText(req.body?.mode).toLowerCase();

    const isCarTake =
      req.body?.skipInventory === true ||
      mode === 'car-take' ||
      mode === 'listing-evaluation' ||
      mode === 'cara-take';

    if (!message) {
      return res.status(400).json({
        message: 'Message is required'
      });
    }

    const inventoryContext = isCarTake ? '' : await getInventoryContext(message);

    const reply = await callGemini({
      message,
      history,
      inventoryContext,
      isCarTake
    });

    return res.json({
      reply
    });
  } catch (err) {
    console.error('CARA CHAT ERROR:', {
      message: err.message,
      statusCode: err.statusCode,
      geminiError: err.geminiError
    });

    return res.status(err.statusCode || 500).json({
      message: 'Cara AI failed to connect.',
      error: err.message
    });
  }
};

module.exports = {
  caraChat
};