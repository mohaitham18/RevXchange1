'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Brand       = require('../models/Brand');
const Community   = require('../models/Community');
const CarVariant  = require('../models/CarVariant');

// ─── helpers ────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/\./g, '-')           // ID.4 → id-4
    .replace(/[^a-z0-9\s-]/g, '') // remove everything else except space and hyphen
    .trim()
    .replace(/\s+/g, '-')          // spaces → hyphens
    .replace(/-+/g, '-')           // collapse double hyphens
    .replace(/^-+|-+$/g, '');      // trim edge hyphens
}

// v(label, start, end, order)
function v(label, yearStart, yearEnd, order) {
  return { label, yearStart, yearEnd, order };
}

// ─── Brand + community + variant data ───────────────────────────────────────

const BRANDS = [
  {
    name: 'Toyota',
    slug: 'toyota',
    glowColor: '#EB0A1E',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/200px-Toyota_carlogo.svg.png',
    communities: [
      { name: 'Corolla', variants: [
        v('2014-2018 (E170)', 2014, 2018, 1),
        v('2019-2024 (E210)', 2019, 2024, 2),
      ]},
      { name: 'Camry', variants: [
        v('2012-2017 (XV50)', 2012, 2017, 1),
        v('2018-2024 (XV70)', 2018, 2024, 2),
      ]},
      { name: 'Yaris', variants: [
        v('2014-2019 (XP150)', 2014, 2019, 1),
        v('2020-2024 (XP210)', 2020, 2024, 2),
      ]},
      { name: 'Land Cruiser', variants: [
        v('2008-2021 (J200)', 2008, 2021, 1),
        v('2022-2024 (J300)', 2022, 2024, 2),
      ]},
      { name: 'RAV4', variants: [
        v('2013-2018 (XA40)', 2013, 2018, 1),
        v('2019-2024 (XA50)', 2019, 2024, 2),
      ]},
      { name: 'Fortuner', variants: [
        v('2005-2015 (AN50)', 2005, 2015, 1),
        v('2016-2024 (AN160)', 2016, 2024, 2),
      ]},
      { name: 'Hilux', variants: [
        v('2005-2015 (7th Gen)', 2005, 2015, 1),
        v('2016-2020 (Revo)', 2016, 2020, 2),
        v('2021-2024 (8th Gen)', 2021, 2024, 3),
      ]},
      { name: 'C-HR', variants: [
        v('2017-2024 (1st Gen)', 2017, 2024, 1),
      ]},
      { name: 'Avalon', variants: [
        v('2013-2018 (XX40)', 2013, 2018, 1),
        v('2019-2024 (XX50)', 2019, 2024, 2),
      ]},
      { name: 'Rush', variants: [
        v('2018-2024 (2nd Gen)', 2018, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Hyundai',
    slug: 'hyundai',
    glowColor: '#002C5F',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Hyundai_Motor_Company_logo.svg/200px-Hyundai_Motor_Company_logo.svg.png',
    communities: [
      { name: 'Elantra', variants: [
        v('2011-2015 (MD)', 2011, 2015, 1),
        v('2016-2020 (AD)', 2016, 2020, 2),
        v('2021-2024 (CN7)', 2021, 2024, 3),
      ]},
      { name: 'Tucson', variants: [
        v('2009-2015 (LM)', 2009, 2015, 1),
        v('2015-2020 (TL)', 2015, 2020, 2),
        v('2021-2024 (NX4)', 2021, 2024, 3),
      ]},
      { name: 'Verna', variants: [
        v('2010-2017 (RB)', 2010, 2017, 1),
        v('2017-2021 (HC)', 2017, 2021, 2),
        v('2022-2024 (CN7)', 2022, 2024, 3),
      ]},
      { name: 'i10', variants: [
        v('2008-2013 (1st Gen PA)', 2008, 2013, 1),
        v('2014-2019 (2nd Gen BA)', 2014, 2019, 2),
        v('2020-2024 (3rd Gen AC3)', 2020, 2024, 3),
      ]},
      { name: 'Accent', variants: [
        v('2011-2017 (RB)', 2011, 2017, 1),
        v('2018-2024 (HC)', 2018, 2024, 2),
      ]},
      { name: 'Santa Fe', variants: [
        v('2012-2018 (DM)', 2012, 2018, 1),
        v('2018-2024 (TM)', 2018, 2024, 2),
      ]},
      { name: 'Sonata', variants: [
        v('2010-2014 (YF)', 2010, 2014, 1),
        v('2014-2019 (LF)', 2014, 2019, 2),
        v('2020-2024 (DN8)', 2020, 2024, 3),
      ]},
      { name: 'Creta', variants: [
        v('2015-2019 (1st Gen)', 2015, 2019, 1),
        v('2020-2024 (2nd Gen)', 2020, 2024, 2),
      ]},
      { name: 'i20', variants: [
        v('2009-2014 (PB)', 2009, 2014, 1),
        v('2014-2020 (GB)', 2014, 2020, 2),
        v('2021-2024 (BC3)', 2021, 2024, 3),
      ]},
      { name: 'Ioniq', variants: [
        v('2017-2022 (AE)', 2017, 2022, 1),
        v('2023-2024 (Ioniq 6)', 2023, 2024, 2),
      ]},
      { name: 'Veloster', variants: [
        v('2012-2017 (FS)', 2012, 2017, 1),
        v('2018-2022 (JS)', 2018, 2022, 2),
      ]},
      { name: 'Coupe', variants: [
        v('2002-2009 (Tiburon GK)', 2002, 2009, 1),
        v('2010-2016 (Coupe GF)', 2010, 2016, 2),
      ]},
    ],
  },

  {
    name: 'Kia',
    slug: 'kia',
    glowColor: '#BB162B',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/200px-Kia-logo.svg.png',
    communities: [
      { name: 'Sportage', variants: [
        v('2010-2015 (SL)', 2010, 2015, 1),
        v('2016-2021 (QL)', 2016, 2021, 2),
        v('2022-2024 (NQ5)', 2022, 2024, 3),
      ]},
      { name: 'Cerato', variants: [
        v('2013-2018 (YD)', 2013, 2018, 1),
        v('2019-2024 (BD)', 2019, 2024, 2),
      ]},
      { name: 'Picanto', variants: [
        v('2011-2017 (TA)', 2011, 2017, 1),
        v('2017-2024 (JA)', 2017, 2024, 2),
      ]},
      { name: 'Rio', variants: [
        v('2011-2017 (UB)', 2011, 2017, 1),
        v('2017-2024 (YB)', 2017, 2024, 2),
      ]},
      { name: 'Sorento', variants: [
        v('2009-2014 (XM)', 2009, 2014, 1),
        v('2015-2020 (UM)', 2015, 2020, 2),
        v('2021-2024 (MQ4)', 2021, 2024, 3),
      ]},
      { name: 'Carnival', variants: [
        v('2006-2014 (VQ)', 2006, 2014, 1),
        v('2015-2021 (YP)', 2015, 2021, 2),
        v('2022-2024 (KA4)', 2022, 2024, 3),
      ]},
      { name: 'Stinger', variants: [
        v('2018-2024 (CK)', 2018, 2024, 1),
      ]},
    ],
  },

  {
    name: 'BMW',
    slug: 'bmw',
    glowColor: '#0066B1',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/200px-BMW.svg.png',
    communities: [
      { name: '1 Series', variants: [
        v('2004-2011 (E87)', 2004, 2011, 1),
        v('2011-2019 (F20)', 2011, 2019, 2),
        v('2019-2024 (F40)', 2019, 2024, 3),
      ]},
      { name: '3 Series', variants: [
        v('2005-2012 (E90)', 2005, 2012, 1),
        v('2012-2019 (F30)', 2012, 2019, 2),
        v('2019-2024 (G20)', 2019, 2024, 3),
      ]},
      { name: '5 Series', variants: [
        v('2003-2010 (E60)', 2003, 2010, 1),
        v('2010-2017 (F10)', 2010, 2017, 2),
        v('2017-2024 (G30)', 2017, 2024, 3),
      ]},
      { name: '7 Series', variants: [
        v('2001-2008 (E65)', 2001, 2008, 1),
        v('2008-2015 (F01)', 2008, 2015, 2),
        v('2015-2022 (G11)', 2015, 2022, 3),
        v('2023-2024 (G70)', 2023, 2024, 4),
      ]},
      { name: 'X1', variants: [
        v('2009-2015 (E84)', 2009, 2015, 1),
        v('2015-2022 (F48)', 2015, 2022, 2),
        v('2023-2024 (U11)', 2023, 2024, 3),
      ]},
      { name: 'X3', variants: [
        v('2003-2010 (E83)', 2003, 2010, 1),
        v('2010-2017 (F25)', 2010, 2017, 2),
        v('2018-2024 (G01)', 2018, 2024, 3),
      ]},
      { name: 'X5', variants: [
        v('1999-2006 (E53)', 1999, 2006, 1),
        v('2006-2013 (E70)', 2006, 2013, 2),
        v('2013-2018 (F15)', 2013, 2018, 3),
        v('2018-2024 (G05)', 2018, 2024, 4),
      ]},
      { name: 'X6', variants: [
        v('2008-2014 (E71)', 2008, 2014, 1),
        v('2014-2019 (F16)', 2014, 2019, 2),
        v('2019-2024 (G06)', 2019, 2024, 3),
      ]},
    ],
  },

  {
    name: 'Mercedes',
    slug: 'mercedes',
    glowColor: '#C0C0C0',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/200px-Mercedes-Logo.svg.png',
    communities: [
      { name: 'C Class', variants: [
        v('2000-2007 (W203)', 2000, 2007, 1),
        v('2007-2014 (W204)', 2007, 2014, 2),
        v('2014-2021 (W205)', 2014, 2021, 3),
        v('2021-2024 (W206)', 2021, 2024, 4),
      ]},
      { name: 'E Class', variants: [
        v('2002-2009 (W211)', 2002, 2009, 1),
        v('2009-2016 (W212)', 2009, 2016, 2),
        v('2016-2024 (W213)', 2016, 2024, 3),
      ]},
      { name: 'A Class', variants: [
        v('2004-2012 (W169)', 2004, 2012, 1),
        v('2012-2018 (W176)', 2012, 2018, 2),
        v('2018-2024 (W177)', 2018, 2024, 3),
      ]},
      { name: 'GLC', variants: [
        v('2015-2022 (X253)', 2015, 2022, 1),
        v('2022-2024 (X254)', 2022, 2024, 2),
      ]},
      { name: 'CLA', variants: [
        v('2013-2019 (C117)', 2013, 2019, 1),
        v('2019-2024 (C118)', 2019, 2024, 2),
      ]},
      { name: 'S Class', variants: [
        v('1998-2005 (W220)', 1998, 2005, 1),
        v('2005-2013 (W221)', 2005, 2013, 2),
        v('2013-2020 (W222)', 2013, 2020, 3),
        v('2020-2024 (W223)', 2020, 2024, 4),
      ]},
      { name: 'G63', variants: [
        v('2012-2018 (W463 AMG)', 2012, 2018, 1),
        v('2018-2024 (W464 AMG)', 2018, 2024, 2),
      ]},
      { name: 'AMG', variants: [
        v('General AMG Community', 2000, 2024, 1),
      ]},
      { name: 'EQS', variants: [
        v('2021-2024 (V297)', 2021, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Nissan',
    slug: 'nissan',
    glowColor: '#C3002F',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Nissan_2020_logo.svg/200px-Nissan_2020_logo.svg.png',
    communities: [
      { name: 'Sunny', variants: [
        v('2000-2006 (B15)', 2000, 2006, 1),
        v('2012-2019 (N17)', 2012, 2019, 2),
        v('2020-2024 (B18)', 2020, 2024, 3),
      ]},
      { name: 'Qashqai', variants: [
        v('2007-2013 (J10)', 2007, 2013, 1),
        v('2014-2021 (J11)', 2014, 2021, 2),
        v('2021-2024 (J12)', 2021, 2024, 3),
      ]},
      { name: 'X-Trail', variants: [
        v('2001-2007 (T30)', 2001, 2007, 1),
        v('2007-2013 (T31)', 2007, 2013, 2),
        v('2014-2022 (T32)', 2014, 2022, 3),
        v('2023-2024 (T33)', 2023, 2024, 4),
      ]},
      { name: 'Sentra', variants: [
        v('2013-2019 (B17)', 2013, 2019, 1),
        v('2020-2024 (B18)', 2020, 2024, 2),
      ]},
      { name: 'Patrol', variants: [
        v('1997-2010 (Y61)', 1997, 2010, 1),
        v('2010-2024 (Y62)', 2010, 2024, 2),
      ]},
      { name: 'Juke', variants: [
        v('2010-2019 (F15)', 2010, 2019, 1),
        v('2019-2024 (F16)', 2019, 2024, 2),
      ]},
    ],
  },

  {
    name: 'Chevrolet',
    slug: 'chevrolet',
    glowColor: '#D4AF37',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Chevrolet_Bowtie_logo.svg/200px-Chevrolet_Bowtie_logo.svg.png',
    communities: [
      { name: 'Optra', variants: [
        v('2002-2008 (1st Gen J200)', 2002, 2008, 1),
        v('2008-2016 (2nd Gen J300)', 2008, 2016, 2),
      ]},
      { name: 'Cruze', variants: [
        v('2009-2015 (J300)', 2009, 2015, 1),
        v('2016-2019 (J400)', 2016, 2019, 2),
      ]},
      { name: 'Captiva', variants: [
        v('2006-2018 (C100)', 2006, 2018, 1),
      ]},
      { name: 'Spark', variants: [
        v('2010-2015 (M300)', 2010, 2015, 1),
        v('2015-2022 (M400)', 2015, 2022, 2),
      ]},
      { name: 'Aveo', variants: [
        v('2002-2011 (T200)', 2002, 2011, 1),
        v('2011-2018 (T300)', 2011, 2018, 2),
      ]},
    ],
  },

  {
    name: 'Honda',
    slug: 'honda',
    glowColor: '#CC0000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/200px-Honda.svg.png',
    communities: [
      { name: 'Civic', variants: [
        v('2001-2005 (7th Gen EM/ES)', 2001, 2005, 1),
        v('2006-2011 (8th Gen FD)', 2006, 2011, 2),
        v('2012-2015 (9th Gen FB)', 2012, 2015, 3),
        v('2016-2021 (10th Gen FC)', 2016, 2021, 4),
        v('2022-2024 (11th Gen FE)', 2022, 2024, 5),
      ]},
      { name: 'Accord', variants: [
        v('2003-2007 (7th Gen CM)', 2003, 2007, 1),
        v('2008-2012 (8th Gen CP)', 2008, 2012, 2),
        v('2013-2017 (9th Gen CR)', 2013, 2017, 3),
        v('2018-2022 (10th Gen CV)', 2018, 2022, 4),
      ]},
      { name: 'HR-V', variants: [
        v('2015-2021 (1st Gen RU)', 2015, 2021, 1),
        v('2022-2024 (2nd Gen RV)', 2022, 2024, 2),
      ]},
      { name: 'CR-V', variants: [
        v('2007-2011 (3rd Gen RE)', 2007, 2011, 1),
        v('2012-2016 (4th Gen RM)', 2012, 2016, 2),
        v('2017-2022 (5th Gen RW)', 2017, 2022, 3),
        v('2023-2024 (6th Gen)', 2023, 2024, 4),
      ]},
      { name: 'City', variants: [
        v('2003-2008 (5th Gen GD)', 2003, 2008, 1),
        v('2008-2014 (6th Gen GM)', 2008, 2014, 2),
        v('2014-2020 (7th Gen GM6)', 2014, 2020, 3),
        v('2020-2024 (8th Gen GN)', 2020, 2024, 4),
      ]},
    ],
  },

  {
    name: 'Renault',
    slug: 'renault',
    glowColor: '#FFC700',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Renault_2021_Text.svg/200px-Renault_2021_Text.svg.png',
    communities: [
      { name: 'Logan', variants: [
        v('2004-2012 (1st Gen LS)', 2004, 2012, 1),
        v('2013-2022 (2nd Gen LS)', 2013, 2022, 2),
        v('2023-2024 (3rd Gen)', 2023, 2024, 3),
      ]},
      { name: 'Duster', variants: [
        v('2010-2017 (1st Gen HM)', 2010, 2017, 1),
        v('2018-2024 (2nd Gen HJC)', 2018, 2024, 2),
      ]},
      { name: 'Megane', variants: [
        v('2008-2015 (Megane III)', 2008, 2015, 1),
        v('2016-2024 (Megane IV)', 2016, 2024, 2),
      ]},
      { name: 'Symbol', variants: [
        v('2008-2013 (2nd Gen LS0)', 2008, 2013, 1),
        v('2013-2021 (3rd Gen L52)', 2013, 2021, 2),
      ]},
      { name: 'Sandero', variants: [
        v('2008-2012 (1st Gen BS)', 2008, 2012, 1),
        v('2013-2022 (2nd Gen B52)', 2013, 2022, 2),
        v('2023-2024 (3rd Gen)', 2023, 2024, 3),
      ]},
      { name: 'Captur', variants: [
        v('2013-2019 (1st Gen J87)', 2013, 2019, 1),
        v('2020-2024 (2nd Gen HJB)', 2020, 2024, 2),
      ]},
      { name: 'Kadjar', variants: [
        v('2015-2022 (HFE)', 2015, 2022, 1),
      ]},
      { name: 'Taliant', variants: [
        v('2021-2024 (BF)', 2021, 2024, 1),
      ]},
      { name: 'Fluence', variants: [
        v('2009-2016 (L38)', 2009, 2016, 1),
      ]},
    ],
  },

  {
    name: 'MG',
    slug: 'mg',
    glowColor: '#FF0000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/MG_Cars_logo.svg/200px-MG_Cars_logo.svg.png',
    communities: [
      { name: 'MG5', variants: [
        v('2013-2019 (1st Gen)', 2013, 2019, 1),
        v('2020-2024 (2nd Gen)', 2020, 2024, 2),
      ]},
      { name: 'MG6', variants: [
        v('2010-2016 (1st Gen)', 2010, 2016, 1),
        v('2017-2021 (2nd Gen)', 2017, 2021, 2),
        v('2022-2024 (3rd Gen)', 2022, 2024, 3),
      ]},
      { name: 'RX5', variants: [
        v('2016-2022 (1st Gen)', 2016, 2022, 1),
        v('2023-2024 (2nd Gen)', 2023, 2024, 2),
      ]},
      { name: 'ZS', variants: [
        v('2017-2021 (ZS)', 2017, 2021, 1),
        v('2021-2024 (ZS EV)', 2021, 2024, 2),
      ]},
      { name: 'HS', variants: [
        v('2018-2022 (HS)', 2018, 2022, 1),
        v('2023-2024 (HS Plus)', 2023, 2024, 2),
      ]},
      { name: 'One', variants: [
        v('2021-2024 (MG One)', 2021, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Skoda',
    slug: 'skoda',
    glowColor: '#4BA82E',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/%C5%A0koda_Auto_logo.svg/200px-%C5%A0koda_Auto_logo.svg.png',
    communities: [
      { name: 'Octavia', variants: [
        v('2004-2012 (2nd Gen 1Z)', 2004, 2012, 1),
        v('2013-2019 (3rd Gen 5E)', 2013, 2019, 2),
        v('2020-2024 (4th Gen NX)', 2020, 2024, 3),
      ]},
      { name: 'Fabia', variants: [
        v('2007-2014 (2nd Gen 5J)', 2007, 2014, 1),
        v('2015-2021 (3rd Gen NJ)', 2015, 2021, 2),
        v('2021-2024 (4th Gen PJ)', 2021, 2024, 3),
      ]},
      { name: 'Superb', variants: [
        v('2008-2015 (2nd Gen 3T)', 2008, 2015, 1),
        v('2015-2024 (3rd Gen 3V)', 2015, 2024, 2),
      ]},
      { name: 'Karoq', variants: [
        v('2017-2024 (NU)', 2017, 2024, 1),
      ]},
      { name: 'Kodiaq', variants: [
        v('2016-2024 (NS)', 2016, 2024, 1),
      ]},
      { name: 'Scala', variants: [
        v('2019-2024 (NW)', 2019, 2024, 1),
      ]},
      { name: 'Kamiq', variants: [
        v('2019-2024 (NW)', 2019, 2024, 1),
      ]},
      { name: 'Rapid', variants: [
        v('2012-2019 (NH)', 2012, 2019, 1),
      ]},
    ],
  },

  {
    name: 'Volkswagen',
    slug: 'volkswagen',
    glowColor: '#001E50',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/200px-Volkswagen_logo_2019.svg.png',
    communities: [
      { name: 'Golf', variants: [
        v('2003-2008 (Mk5 1K)', 2003, 2008, 1),
        v('2008-2012 (Mk6 5K)', 2008, 2012, 2),
        v('2012-2019 (Mk7 AU)', 2012, 2019, 3),
        v('2020-2024 (Mk8 CD)', 2020, 2024, 4),
      ]},
      { name: 'Polo', variants: [
        v('2001-2009 (Mk4 9N)', 2001, 2009, 1),
        v('2009-2017 (Mk5 6R)', 2009, 2017, 2),
        v('2018-2024 (Mk6 AW)', 2018, 2024, 3),
      ]},
      { name: 'Passat', variants: [
        v('2005-2010 (B6 3C)', 2005, 2010, 1),
        v('2010-2014 (B7 36)', 2010, 2014, 2),
        v('2015-2024 (B8 3G)', 2015, 2024, 3),
      ]},
      { name: 'Tiguan', variants: [
        v('2007-2017 (1st Gen 5N)', 2007, 2017, 1),
        v('2016-2024 (2nd Gen AD)', 2016, 2024, 2),
      ]},
      { name: 'Jetta', variants: [
        v('2005-2010 (Mk5 1K)', 2005, 2010, 1),
        v('2011-2018 (Mk6 16)', 2011, 2018, 2),
        v('2018-2024 (Mk7 BU)', 2018, 2024, 3),
      ]},
      { name: 'Touareg', variants: [
        v('2002-2010 (1st Gen 7L)', 2002, 2010, 1),
        v('2010-2018 (2nd Gen 7P)', 2010, 2018, 2),
        v('2018-2024 (3rd Gen CR)', 2018, 2024, 3),
      ]},
      { name: 'T-Roc', variants: [
        v('2017-2024 (A1)', 2017, 2024, 1),
      ]},
      { name: 'ID.4', variants: [
        v('2021-2024 (E21)', 2021, 2024, 1),
      ]},
      { name: 'Arteon', variants: [
        v('2017-2024 (3H)', 2017, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Fiat',
    slug: 'fiat',
    glowColor: '#A6192E',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Fiat_logo_%282020%29.svg/200px-Fiat_logo_%282020%29.svg.png',
    communities: [
      { name: 'Tipo', variants: [
        v('2016-2024 (Type 356)', 2016, 2024, 1),
      ]},
      { name: 'Punto', variants: [
        v('2006-2018 (3rd Gen 199)', 2006, 2018, 1),
      ]},
      { name: '500', variants: [
        v('2007-2015 (3rd Gen 312)', 2007, 2015, 1),
        v('2015-2024 (Facelift)', 2015, 2024, 2),
      ]},
      { name: '500X', variants: [
        v('2015-2024 (334)', 2015, 2024, 1),
      ]},
      { name: 'Panda', variants: [
        v('2003-2012 (2nd Gen 169)', 2003, 2012, 1),
        v('2012-2024 (3rd Gen 312)', 2012, 2024, 2),
      ]},
    ],
  },

  {
    name: 'Chery',
    slug: 'chery',
    glowColor: '#C8102E',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Chery_logo.svg/200px-Chery_logo.svg.png',
    communities: [
      { name: 'Tiggo 4', variants: [
        v('2016-2021 (1st Gen)', 2016, 2021, 1),
      ]},
      { name: 'Tiggo 4 Pro', variants: [
        v('2022-2024 (Tiggo 4 Pro)', 2022, 2024, 1),
      ]},
      { name: 'Tiggo 7', variants: [
        v('2016-2019 (1st Gen T15)', 2016, 2019, 1),
      ]},
      { name: 'Tiggo 7 Pro', variants: [
        v('2020-2024 (T19)', 2020, 2024, 1),
      ]},
      { name: 'Tiggo 8', variants: [
        v('2018-2022 (1st Gen T18)', 2018, 2022, 1),
      ]},
      { name: 'Tiggo 8 Pro', variants: [
        v('2022-2024 (Tiggo 8 Pro)', 2022, 2024, 1),
      ]},
      { name: 'Arrizo 5', variants: [
        v('2015-2020 (1st Gen A13)', 2015, 2020, 1),
        v('2021-2024 (2nd Gen A14)', 2021, 2024, 2),
      ]},
      { name: 'Arrizo 6', variants: [
        v('2018-2024 (A21)', 2018, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Opel',
    slug: 'opel',
    glowColor: '#F7A800',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Opel_2017.svg/200px-Opel_2017.svg.png',
    communities: [
      { name: 'Astra', variants: [
        v('2004-2009 (H A04)', 2004, 2009, 1),
        v('2009-2015 (J P10)', 2009, 2015, 2),
        v('2015-2021 (K B16)', 2015, 2021, 3),
        v('2022-2024 (L O5XF)', 2022, 2024, 4),
      ]},
      { name: 'Corsa', variants: [
        v('2006-2014 (D S07)', 2006, 2014, 1),
        v('2014-2019 (E X15)', 2014, 2019, 2),
        v('2019-2024 (F R9)', 2019, 2024, 3),
      ]},
      { name: 'Mokka', variants: [
        v('2012-2020 (1st Gen A)', 2012, 2020, 1),
        v('2020-2024 (2nd Gen B)', 2020, 2024, 2),
      ]},
      { name: 'Grandland', variants: [
        v('2017-2024 (P1UO)', 2017, 2024, 1),
      ]},
      { name: 'Insignia', variants: [
        v('2008-2017 (A OPC)', 2008, 2017, 1),
        v('2017-2024 (B)', 2017, 2024, 2),
      ]},
      { name: 'Crossland', variants: [
        v('2017-2024 (P2JO)', 2017, 2024, 1),
      ]},
      { name: 'Vectra', variants: [
        v('1995-2002 (B J96)', 1995, 2002, 1),
        v('2002-2009 (C Z02)', 2002, 2009, 2),
      ]},
    ],
  },

  {
    name: 'Peugeot',
    slug: 'peugeot',
    glowColor: '#1C2E5A',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Peugeot_2021_Logo.svg/200px-Peugeot_2021_Logo.svg.png',
    communities: [
      { name: '208', variants: [
        v('2012-2019 (1st Gen A9)', 2012, 2019, 1),
        v('2019-2024 (2nd Gen UB)', 2019, 2024, 2),
      ]},
      { name: '2008', variants: [
        v('2013-2019 (1st Gen A94)', 2013, 2019, 1),
        v('2019-2024 (2nd Gen P24)', 2019, 2024, 2),
      ]},
      { name: '301', variants: [
        v('2012-2024 (1A)', 2012, 2024, 1),
      ]},
      { name: '3008', variants: [
        v('2009-2016 (1st Gen T84)', 2009, 2016, 1),
        v('2017-2024 (2nd Gen M45)', 2017, 2024, 2),
      ]},
      { name: '408', variants: [
        v('2022-2024 (P54)', 2022, 2024, 1),
      ]},
      { name: '508', variants: [
        v('2011-2018 (1st Gen W23)', 2011, 2018, 1),
        v('2018-2024 (2nd Gen R8)', 2018, 2024, 2),
      ]},
      { name: '4008', variants: [
        v('2012-2017 (T84)', 2012, 2017, 1),
      ]},
      { name: '5008', variants: [
        v('2009-2016 (1st Gen 0U)', 2009, 2016, 1),
        v('2017-2024 (2nd Gen P87)', 2017, 2024, 2),
      ]},
      { name: 'e-208', variants: [
        v('2019-2024 (UB EV)', 2019, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Mitsubishi',
    slug: 'mitsubishi',
    glowColor: '#E60012',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Mitsubishi_logo.svg/200px-Mitsubishi_logo.svg.png',
    communities: [
      { name: 'Lancer Puma', variants: [
        v('1999-2007 (Lancer Puma 9th Gen)', 1999, 2007, 1),
      ]},
      { name: 'Lancer Shark', variants: [
        v('2007-2017 (Lancer Shark 10th Gen CS)', 2007, 2017, 1),
      ]},
      { name: 'Colt', variants: [
        v('2004-2012 (6th Gen Z30)', 2004, 2012, 1),
      ]},
      { name: 'Eclipse', variants: [
        v('1999-2005 (3rd Gen D30)', 1999, 2005, 1),
        v('2005-2011 (4th Gen D53)', 2005, 2011, 2),
      ]},
      { name: 'Outlander', variants: [
        v('2006-2012 (2nd Gen CW)', 2006, 2012, 1),
        v('2013-2021 (3rd Gen GF)', 2013, 2021, 2),
        v('2022-2024 (4th Gen GN)', 2022, 2024, 3),
      ]},
      { name: 'Pajero', variants: [
        v('1999-2006 (3rd Gen V60/V70)', 1999, 2006, 1),
        v('2006-2021 (4th Gen V80/V90)', 2006, 2021, 2),
      ]},
      { name: 'ASX', variants: [
        v('2010-2021 (1st Gen GA)', 2010, 2021, 1),
        v('2023-2024 (2nd Gen)', 2023, 2024, 2),
      ]},
      { name: 'L200', variants: [
        v('2005-2014 (4th Gen KB)', 2005, 2014, 1),
        v('2015-2022 (5th Gen KJ)', 2015, 2022, 2),
        v('2023-2024 (6th Gen KL)', 2023, 2024, 3),
      ]},
      { name: 'Eclipse Cross', variants: [
        v('2018-2024 (GK)', 2018, 2024, 1),
      ]},
    ],
  },

  {
    name: 'Daihatsu',
    slug: 'daihatsu',
    glowColor: '#CC0000',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Daihatsu_logo.svg/200px-Daihatsu_logo.svg.png',
    communities: [
      { name: 'Terios', variants: [
        v('1997-2006 (1st Gen J100)', 1997, 2006, 1),
        v('2006-2017 (2nd Gen J200)', 2006, 2017, 2),
      ]},
      { name: 'Grand Terios', variants: [
        v('2007-2017 (J210)', 2007, 2017, 1),
      ]},
      { name: 'Materia', variants: [
        v('2006-2011 (M400)', 2006, 2011, 1),
      ]},
      { name: 'Sirion', variants: [
        v('2005-2008 (2nd Gen M300)', 2005, 2008, 1),
        v('2008-2018 (3rd Gen M301)', 2008, 2018, 2),
      ]},
      { name: 'Mira', variants: [
        v('2003-2011 (L250)', 2003, 2011, 1),
        v('2011-2018 (L275)', 2011, 2018, 2),
      ]},
    ],
  },

  {
    name: 'Daewoo',
    slug: 'daewoo',
    glowColor: '#003087',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Daewoo_logo.svg/200px-Daewoo_logo.svg.png',
    communities: [
      { name: 'Lanos', variants: [
        v('1997-2009 (T100)', 1997, 2009, 1),
      ]},
      { name: 'Nubira', variants: [
        v('1997-2003 (J100/J150)', 1997, 2003, 1),
      ]},
      { name: 'Leganza', variants: [
        v('1997-2002 (V100)', 1997, 2002, 1),
      ]},
      { name: 'Matiz', variants: [
        v('1998-2005 (M100)', 1998, 2005, 1),
        v('2005-2008 (M200)', 2005, 2008, 2),
      ]},
      { name: 'Lacetti', variants: [
        v('2002-2008 (J200)', 2002, 2008, 1),
      ]},
    ],
  },

  {
    name: 'Mazda',
    slug: 'mazda',
    glowColor: '#910A2D',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/2017_Mazda_Motor_Corporation_Logo.svg/200px-2017_Mazda_Motor_Corporation_Logo.svg.png',
    communities: [
      { name: 'Mazda 2', variants: [
        v('2007-2014 (2nd Gen DE)', 2007, 2014, 1),
        v('2015-2024 (3rd Gen DJ)', 2015, 2024, 2),
      ]},
      { name: 'Mazda 3', variants: [
        v('2009-2013 (2nd Gen BL)', 2009, 2013, 1),
        v('2013-2018 (3rd Gen BM)', 2013, 2018, 2),
        v('2019-2024 (4th Gen BP)', 2019, 2024, 3),
      ]},
      { name: 'Mazda 6', variants: [
        v('2007-2012 (2nd Gen GH)', 2007, 2012, 1),
        v('2013-2024 (3rd Gen GJ)', 2013, 2024, 2),
      ]},
      { name: 'CX-3', variants: [
        v('2015-2024 (DK)', 2015, 2024, 1),
      ]},
      { name: 'CX-5', variants: [
        v('2012-2017 (1st Gen KE)', 2012, 2017, 1),
        v('2017-2024 (2nd Gen KF)', 2017, 2024, 2),
      ]},
      { name: 'CX-9', variants: [
        v('2007-2015 (1st Gen TB)', 2007, 2015, 1),
        v('2016-2024 (2nd Gen TC)', 2016, 2024, 2),
      ]},
    ],
  },

  {
    name: 'SEAT',
    slug: 'seat',
    glowColor: '#FA0027',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/SEAT_Logo.svg/200px-SEAT_Logo.svg.png',
    communities: [
      { name: 'Ibiza', variants: [
        v('2008-2017 (4th Gen 6J)', 2008, 2017, 1),
        v('2017-2024 (5th Gen KJ)', 2017, 2024, 2),
      ]},
      { name: 'Leon', variants: [
        v('2005-2012 (2nd Gen 1P)', 2005, 2012, 1),
        v('2012-2020 (3rd Gen 5F)', 2012, 2020, 2),
        v('2020-2024 (4th Gen KL)', 2020, 2024, 3),
      ]},
      { name: 'Ateca', variants: [
        v('2016-2024 (KH7)', 2016, 2024, 1),
      ]},
      { name: 'Arona', variants: [
        v('2017-2024 (KJ7)', 2017, 2024, 1),
      ]},
      { name: 'Tarraco', variants: [
        v('2019-2024 (KN2)', 2019, 2024, 1),
      ]},
      { name: 'Toledo', variants: [
        v('2004-2009 (3rd Gen 5P)', 2004, 2009, 1),
        v('2012-2019 (4th Gen KG)', 2012, 2019, 2),
      ]},
    ],
  },
];

// ─── Main seed function ──────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  MongoDB connected\n');

  let brandsAdded = 0, brandsUpdated = 0;
  let commAdded = 0, commUpdated = 0;
  let varAdded = 0, varUpdated = 0;

  for (const brandData of BRANDS) {
    const { communities: commsData, ...brandFields } = brandData;

    // ── Upsert brand ────────────────────────────────────────
    const brandResult = await Brand.updateOne(
      { slug: brandFields.slug },
      { $set: brandFields },
      { upsert: true }
    );
    const brand = await Brand.findOne({ slug: brandFields.slug });

    if (brandResult.upsertedCount > 0) {
      brandsAdded++;
      console.log(`  [+] Brand: ${brandFields.name}`);
    } else {
      brandsUpdated++;
    }

    // ── Upsert communities for this brand ───────────────────
    for (const commData of commsData) {
      const { variants: variantsData, ...commFields } = commData;
      const commSlug = `${brandFields.slug}-${toSlug(commFields.name)}`;

      const commResult = await Community.updateOne(
        { slug: commSlug },
        {
          $set: {
            name:    commFields.name,
            slug:    commSlug,
            brandId: brand._id,
          },
          $setOnInsert: {
            memberCount: 0,
            postCount:   0,
            isCentral:   false,
          }
        },
        { upsert: true }
      );

      const community = await Community.findOne({ slug: commSlug });

      if (commResult.upsertedCount > 0) {
        commAdded++;
      } else {
        commUpdated++;
      }

      // ── Upsert variants for this community ──────────────
      for (const varData of variantsData) {
        const varResult = await CarVariant.updateOne(
          { communityId: community._id, label: varData.label },
          { $set: { ...varData, communityId: community._id } },
          { upsert: true }
        );

        if (varResult.upsertedCount > 0) {
          varAdded++;
        } else {
          varUpdated++;
        }
      }
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('Seed complete.');
  console.log(`  Brands    — added: ${brandsAdded},  already existed (updated): ${brandsUpdated}`);
  console.log(`  Communities — added: ${commAdded},  already existed (updated): ${commUpdated}`);
  console.log(`  Variants  — added: ${varAdded},  already existed (updated): ${varUpdated}`);
  console.log('═══════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('MongoDB disconnected. Done ✅');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
