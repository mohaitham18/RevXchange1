require('dotenv').config();

const mongoose = require('mongoose');

const Brand = require('../models/Brand');
const Community = require('../models/Community');
const CarVariant = require('../models/CarVariant');

const brands = [
  { name: 'Toyota', slug: 'toyota', glowColor: '#EB0A1E' },
  { name: 'BMW', slug: 'bmw', glowColor: '#0066B1' },
  { name: 'Mercedes', slug: 'mercedes', glowColor: '#C0C0C0' },
  { name: 'Kia', slug: 'kia', glowColor: '#BB162B' },
  { name: 'Hyundai', slug: 'hyundai', glowColor: '#002C5F' },
  { name: 'Nissan', slug: 'nissan', glowColor: '#C3002F' },
  { name: 'Chevrolet', slug: 'chevrolet', glowColor: '#D4AF37' },
  { name: 'Honda', slug: 'honda', glowColor: '#CC0000' },
  { name: 'Renault', slug: 'renault', glowColor: '#FFC700' },
  { name: 'MG', slug: 'mg', glowColor: '#FF0000' },
  { name: 'Skoda', slug: 'skoda', glowColor: '#4BA82E' },
  { name: 'Volkswagen', slug: 'volkswagen', glowColor: '#001E50' },
  { name: 'Fiat', slug: 'fiat', glowColor: '#A6192E' },
  { name: 'Chery', slug: 'chery', glowColor: '#C8102E' },
  { name: 'Opel', slug: 'opel', glowColor: '#F7A800' },
  { name: 'Peugeot', slug: 'peugeot', glowColor: '#1C2E5A' },
  { name: 'RevXChange', slug: 'revxchange', glowColor: '#5a0f1c', logoUrl: '/images/Logo.png' }
];

const communitySeeds = [
  {
    brandSlug: 'toyota',
    name: 'Corolla',
    slug: 'toyota-corolla',
    description: 'Community for Toyota Corolla owners and fans in Egypt.',
    variants: [
      { label: 'E170 (2014-2018)', yearStart: 2014, yearEnd: 2018, order: 1 },
      { label: 'E210 (2019-2023)', yearStart: 2019, yearEnd: 2023, order: 2 },
      { label: 'E210 Facelift (2024+)', yearStart: 2024, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'bmw',
    name: '320i',
    slug: 'bmw-320i',
    description: 'Community for BMW 320i owners and fans in Egypt.',
    variants: [
      { label: 'F30 (2012-2018)', yearStart: 2012, yearEnd: 2018, order: 1 },
      { label: 'G20 (2019-2022)', yearStart: 2019, yearEnd: 2022, order: 2 },
      { label: 'G20 Facelift (2023+)', yearStart: 2023, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'mercedes',
    name: 'C-Class',
    slug: 'mercedes-c-class',
    description: 'Community for Mercedes C-Class owners and fans in Egypt.',
    variants: [
      { label: 'W204 (2008-2014)', yearStart: 2008, yearEnd: 2014, order: 1 },
      { label: 'W205 (2015-2021)', yearStart: 2015, yearEnd: 2021, order: 2 },
      { label: 'W206 (2022+)', yearStart: 2022, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'kia',
    name: 'Sportage',
    slug: 'kia-sportage',
    description: 'Community for Kia Sportage owners and fans in Egypt.',
    variants: [
      { label: 'QL (2016-2021)', yearStart: 2016, yearEnd: 2021, order: 1 },
      { label: 'NQ5 (2022-2024)', yearStart: 2022, yearEnd: 2024, order: 2 },
      { label: 'NQ5 Facelift (2025+)', yearStart: 2025, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'hyundai',
    name: 'Elantra',
    slug: 'hyundai-elantra',
    description: 'Community for Hyundai Elantra owners and fans in Egypt.',
    variants: [
      { label: 'MD (2012-2016)', yearStart: 2012, yearEnd: 2016, order: 1 },
      { label: 'AD (2017-2020)', yearStart: 2017, yearEnd: 2020, order: 2 },
      { label: 'CN7 (2021+)', yearStart: 2021, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'nissan',
    name: 'Sunny',
    slug: 'nissan-sunny',
    description: 'Community for Nissan Sunny owners and fans in Egypt.',
    variants: [
      { label: 'N17 (2013-2019)', yearStart: 2013, yearEnd: 2019, order: 1 },
      { label: 'N17 Facelift (2020-2023)', yearStart: 2020, yearEnd: 2023, order: 2 },
      { label: 'N18 (2024+)', yearStart: 2024, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'chevrolet',
    name: 'Optra',
    slug: 'chevrolet-optra',
    description: 'Community for Chevrolet Optra owners and fans in Egypt.',
    variants: [
      { label: 'Optra Classic (2005-2013)', yearStart: 2005, yearEnd: 2013, order: 1 },
      { label: 'Optra Second Gen (2014-2020)', yearStart: 2014, yearEnd: 2020, order: 2 },
      { label: 'Optra New Gen (2021+)', yearStart: 2021, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'honda',
    name: 'Civic',
    slug: 'honda-civic',
    description: 'Community for Honda Civic owners and fans in Egypt.',
    variants: [
      { label: '9th Gen (2012-2015)', yearStart: 2012, yearEnd: 2015, order: 1 },
      { label: '10th Gen (2016-2021)', yearStart: 2016, yearEnd: 2021, order: 2 },
      { label: '11th Gen (2022+)', yearStart: 2022, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'renault',
    name: 'Logan',
    slug: 'renault-logan',
    description: 'Community for Renault Logan owners and fans in Egypt.',
    variants: [
      { label: 'First Gen (2009-2013)', yearStart: 2009, yearEnd: 2013, order: 1 },
      { label: 'Second Gen (2014-2021)', yearStart: 2014, yearEnd: 2021, order: 2 },
      { label: 'Recent Models (2022+)', yearStart: 2022, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'mg',
    name: 'RX5',
    slug: 'mg-rx5',
    description: 'Community for MG RX5 owners and fans in Egypt.',
    variants: [
      { label: 'First Gen (2018-2021)', yearStart: 2018, yearEnd: 2021, order: 1 },
      { label: 'Facelift (2022-2024)', yearStart: 2022, yearEnd: 2024, order: 2 },
      { label: 'Recent Models (2025+)', yearStart: 2025, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'skoda',
    name: 'Octavia',
    slug: 'skoda-octavia',
    description: 'Community for Skoda Octavia owners and fans in Egypt.',
    variants: [
      { label: 'A5 (2005-2013)', yearStart: 2005, yearEnd: 2013, order: 1 },
      { label: 'A7 (2014-2020)', yearStart: 2014, yearEnd: 2020, order: 2 },
      { label: 'A8 (2021+)', yearStart: 2021, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'volkswagen',
    name: 'Golf',
    slug: 'volkswagen-golf',
    description: 'Community for Volkswagen Golf owners and fans in Egypt.',
    variants: [
      { label: 'Mk6 (2009-2012)', yearStart: 2009, yearEnd: 2012, order: 1 },
      { label: 'Mk7 (2013-2019)', yearStart: 2013, yearEnd: 2019, order: 2 },
      { label: 'Mk8 (2020+)', yearStart: 2020, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'fiat',
    name: 'Tipo',
    slug: 'fiat-tipo',
    description: 'Community for Fiat Tipo owners and fans in Egypt.',
    variants: [
      { label: 'Tipo Sedan (2016-2020)', yearStart: 2016, yearEnd: 2020, order: 1 },
      { label: 'Tipo Facelift (2021-2024)', yearStart: 2021, yearEnd: 2024, order: 2 },
      { label: 'Recent Models (2025+)', yearStart: 2025, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'chery',
    name: 'Tiggo 7',
    slug: 'chery-tiggo-7',
    description: 'Community for Chery Tiggo 7 owners and fans in Egypt.',
    variants: [
      { label: 'First Gen (2017-2020)', yearStart: 2017, yearEnd: 2020, order: 1 },
      { label: 'Pro (2021-2024)', yearStart: 2021, yearEnd: 2024, order: 2 },
      { label: 'Pro Max (2025+)', yearStart: 2025, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'opel',
    name: 'Astra',
    slug: 'opel-astra',
    description: 'Community for Opel Astra owners and fans in Egypt.',
    variants: [
      { label: 'Astra J (2010-2015)', yearStart: 2010, yearEnd: 2015, order: 1 },
      { label: 'Astra K (2016-2021)', yearStart: 2016, yearEnd: 2021, order: 2 },
      { label: 'Astra L (2022+)', yearStart: 2022, yearEnd: 2030, order: 3 }
    ]
  },
  {
    brandSlug: 'peugeot',
    name: '301',
    slug: 'peugeot-301',
    description: 'Community for Peugeot 301 owners and fans in Egypt.',
    variants: [
      { label: 'First Gen (2013-2016)', yearStart: 2013, yearEnd: 2016, order: 1 },
      { label: 'Facelift (2017-2021)', yearStart: 2017, yearEnd: 2021, order: 2 },
      { label: 'Recent Models (2022+)', yearStart: 2022, yearEnd: 2030, order: 3 }
    ]
  }
];

async function seedCommunities() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    await Brand.deleteMany({});
    await Community.deleteMany({});
    await CarVariant.deleteMany({});

    console.log('Old Brand, Community, and CarVariant data cleared');

    const createdBrands = await Brand.insertMany(
      brands.map(brand => ({
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl || `/images/${brand.slug}.png`,
        glowColor: brand.glowColor
      }))
    );

    const brandMap = {};

    createdBrands.forEach(brand => {
      brandMap[brand.slug] = brand;
    });

    const createdCommunities = [];

    for (const communitySeed of communitySeeds) {
      const brand = brandMap[communitySeed.brandSlug];

      if (!brand) {
        throw new Error(`Brand not found for slug: ${communitySeed.brandSlug}`);
      }

      const community = await Community.create({
        brandId: brand._id,
        name: communitySeed.name,
        slug: communitySeed.slug,
        description: communitySeed.description,
        isCentral: false,
        memberCount: 0,
        postCount: 0,
        createdBy: null
      });

      createdCommunities.push({
        community,
        variants: communitySeed.variants
      });
    }

    const centralCommunity = await Community.create({
      brandId: brandMap.revxchange._id,
      name: 'RevXChange Central',
      slug: 'revxchange',
      description: 'The central RevXChange community for general car discussions, marketplace questions, and platform updates.',
      isCentral: true,
      memberCount: 0,
      postCount: 0,
      createdBy: null
    });

    createdCommunities.push({
      community: centralCommunity,
      variants: []
    });

    const variantDocs = [];

    createdCommunities.forEach(item => {
      item.variants.forEach(variant => {
        variantDocs.push({
          communityId: item.community._id,
          label: variant.label,
          yearStart: variant.yearStart,
          yearEnd: variant.yearEnd,
          order: variant.order
        });
      });
    });

    if (variantDocs.length > 0) {
      await CarVariant.insertMany(variantDocs);
    }

    console.log('Seed completed successfully');
    console.log(`Seeded ${createdBrands.length} brands, ${createdCommunities.length} communities, ${variantDocs.length} variants.`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedCommunities();