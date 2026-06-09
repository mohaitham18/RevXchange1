'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User                = require('../models/User');
const Post                = require('../models/Post');
const Comment             = require('../models/Comment');
const Community           = require('../models/Community');
const CommunityMembership = require('../models/CommunityMembership');
const Vote                = require('../models/Vote');

// ── Helpers ────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;

function hoursAgo(h) {
  return new Date(NOW - h * HOUR);
}

// Reddit-style hot score (reference epoch = 2021-01-01)
function calcHotScore(upvotes, downvotes, createdAt) {
  const score = upvotes - downvotes;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign  = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = (createdAt.getTime() / 1000) - 1609459200;
  return parseFloat((sign * order + seconds / 45000).toFixed(7));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  // ════════════════════════════════════════════
  // STEP 1 — Find test users
  // ════════════════════════════════════════════
  console.log('── Step 1: Finding test users ──');

  const userMap = {
    mohamed: 'm.hassan@rxtest.com',
    ahmed:   'a.ibrahim@rxtest.com',
    sara:    's.elsayed@rxtest.com',
    khaled:  'k.fawzy@rxtest.com',
    youssef: 'y.saleh@rxtest.com',
    mostafa: 'm.nasser@rxtest.com',
    aya:     'a.zaki@rxtest.com',
    karim:   'k.mansour@rxtest.com',
  };

  const U = {};
  for (const [key, email] of Object.entries(userMap)) {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`  ⚠ Not found: ${email} (${key}) — their content will be skipped`);
    } else {
      U[key] = user;
      console.log(`  ✓ ${user.name} <${email}>`);
    }
  }

  // ════════════════════════════════════════════
  // STEP 2 — Find communities
  // ════════════════════════════════════════════
  console.log('\n── Step 2: Finding communities ──');

  const allSlugs = [
    'toyota-corolla', 'nissan-qashqai', 'revxchange',
    'hyundai-elantra', 'bmw-3-series',  'kia-sportage',
    'mercedes-c-class','renault-logan',  'mazda-mazda-3',
    'opel-astra',      'chevrolet-cruze','mitsubishi-lancer-puma',
  ];

  const C = {};
  for (const slug of allSlugs) {
    const comm = await Community.findOne({ slug });
    if (!comm) {
      console.warn(`  ⚠ Community not found: ${slug} — related content skipped`);
    } else {
      C[slug] = comm;
      console.log(`  ✓ ${comm.name} (${slug})`);
    }
  }

  // ════════════════════════════════════════════
  // STEP 3 — Join communities (upsert memberships)
  // ════════════════════════════════════════════
  console.log('\n── Step 3: Creating memberships ──');

  const membershipDefs = [
    { key: 'mohamed', slugs: ['toyota-corolla', 'nissan-qashqai',       'revxchange'] },
    { key: 'ahmed',   slugs: ['hyundai-elantra', 'bmw-3-series',         'revxchange'] },
    { key: 'sara',    slugs: ['kia-sportage',    'hyundai-elantra',       'revxchange'] },
    { key: 'khaled',  slugs: ['bmw-3-series',    'mercedes-c-class',      'revxchange'] },
    { key: 'youssef', slugs: ['renault-logan',   'mazda-mazda-3',         'revxchange'] },
    { key: 'mostafa', slugs: ['opel-astra',      'chevrolet-cruze',       'revxchange'] },
    { key: 'aya',     slugs: ['toyota-corolla',  'kia-sportage',          'revxchange'] },
    { key: 'karim',   slugs: ['mitsubishi-lancer-puma', 'nissan-qashqai', 'revxchange'] },
  ];

  for (const { key, slugs } of membershipDefs) {
    const user = U[key];
    if (!user) continue;
    for (const slug of slugs) {
      const comm = C[slug];
      if (!comm) continue;
      const exists = await CommunityMembership.findOne({ userId: user._id, communityId: comm._id });
      if (!exists) {
        await CommunityMembership.create({ userId: user._id, communityId: comm._id });
        await Community.findByIdAndUpdate(comm._id, { $inc: { memberCount: 1 } });
        console.log(`  + ${user.name} → ${slug}`);
      }
    }
  }

  // ════════════════════════════════════════════
  // STEP 4 — Create posts
  // ════════════════════════════════════════════
  console.log('\n── Step 4: Creating posts ──');

  let postsCreated = 0;

  async function createPost({ key, authorKey, slug, title, body, hrsAgo }) {
    const author = U[authorKey];
    const comm   = C[slug];
    if (!author) { console.warn(`  ⚠ Skipping "${title}" — user "${authorKey}" not found`); return null; }
    if (!comm)   { console.warn(`  ⚠ Skipping "${title}" — community "${slug}" not found`); return null; }

    const existing = await Post.findOne({ title, authorId: author._id });
    if (existing) {
      console.log(`  ~ Already exists: "${title}"`);
      return existing;
    }

    const createdAt = hoursAgo(hrsAgo);
    const post = await Post.create({
      communityId:       comm._id,
      authorId:          author._id,
      title,
      body,
      imageUrls:         [],
      upvotes:           1,
      downvotes:         0,
      score:             1,
      hotScore:          calcHotScore(1, 0, createdAt),
      controversyScore:  0,
      commentCount:      0,
      createdAt,
      updatedAt:         createdAt,
    });

    // Author self-vote
    const voteExists = await Vote.findOne({ userId: author._id, postId: post._id });
    if (!voteExists) {
      await Vote.create({ userId: author._id, postId: post._id, value: 1 });
    }

    await Community.findByIdAndUpdate(comm._id, { $inc: { postCount: 1 } });
    postsCreated++;
    console.log(`  + [${key}] "${title}"`);
    return post;
  }

  const postDefs = [
    {
      key: 'p1', authorKey: 'mohamed', slug: 'toyota-corolla', hrsAgo: 70,
      title: 'صوت طقطقة في الموتور صباحاً',
      body:  'عندي كورولا 2019 وبدأت تعمل صوت غريب من ناحية الموتور لما بشغلها الصبح، زي صوت طقطقة خفيف بس بيقل بعد شوية. حد مر بنفس المشكلة؟',
    },
    {
      key: 'p2', authorKey: 'ahmed', slug: 'hyundai-elantra', hrsAgo: 68,
      title: 'تغيير فرامل خلفية — التوكيل ولا برا؟',
      body:  'إيلانترا 2020 بعد 40,000 كم — عملتلها فل سيرفس عند التوكيل. كل حاجة تمام ما عدا إن الفرامل الخلفية محتاجة تبديل. السعر عندهم 3,200 جنيه — ده معقول ولا أدور على ميكانيكي برا؟',
    },
    {
      key: 'p3', authorKey: 'sara', slug: 'kia-sportage', hrsAgo: 65,
      title: 'سبورتاج 2021 اختبار عزم',
      body:  'سبورتاج 2021 — اختبار الـ 0-100 في القاهرة 😂 مش فارمولا 1 بس محترمة للي موجود',
    },
    {
      key: 'p4', authorKey: 'aya', slug: 'toyota-corolla', hrsAgo: 62,
      title: 'غيرت فرش الكورولا ألكنتارا',
      body:  'كورولا 2018 — غيرت الفرش بألكنتارا وحاسة إن العربية اتجددت خالص 😍 الشغل اتعمل في ورشة في المعادي بـ 4,500 جنيه',
    },
    {
      key: 'p5', authorKey: 'khaled', slug: 'bmw-3-series', hrsAgo: 58,
      title: '320i وصلت 60,000 كم — إيه اللي لازم أعمله؟',
      body:  '320i 2019 وصلت 60,000 كم — عملتلها تغيير زيت، فلتر هواء، فلتر كابينة، وبلاجات. التكلفة عند التوكيل 8,500 جنيه. في حاجة تانية لازم أعملها؟',
    },
    {
      key: 'p6', authorKey: 'youssef', slug: 'renault-logan', hrsAgo: 54,
      title: 'لوجان 230,000 كم ولسه شغالة',
      body:  'لوجان 2017 عملالي 230,000 كم والحمد لله لسه شغالة زي الأول. سر الموضوع؟ صيانة منتظمة كل 5,000 كم وزيت كويس. العربية دي مظلومة في مصر',
    },
    {
      key: 'p7', authorKey: 'mostafa', slug: 'opel-astra', hrsAgo: 48,
      title: 'تغيير تايمنج بيلت الأسترا — تحذير مهم',
      body:  'أسترا 2016 — غيرت التايمنج بيلت والواتر بمب بعد 90,000 كم. التكلفة 6,800 جنيه. لو عندك أسترا وعداداتها قربت متترددش',
    },
    {
      key: 'p8', authorKey: 'mostafa', slug: 'chevrolet-cruze', hrsAgo: 42,
      title: 'كروز بعد غسيل بخار كامل 🔥',
      body:  'كروز 2019 بعد غسيل بالبخار الكامل — فرق كبير جداً خصوصاً المحرك 🔥 الشغل اتعمل في مغسلة في شبرا بـ 350 جنيه',
    },
    {
      key: 'p9', authorKey: 'karim', slug: 'mitsubishi-lancer-puma', hrsAgo: 36,
      title: 'لانسر بومة أوفرهول كامل بعد 150,000 كم',
      body:  'لانسر بومة 2014 — وصلت 150,000 كم وعملتلها أوفرهول كامل. الموتور اتفك وانضف وتغيرت كل الجوانات. التكلفة 12,000 جنيه. دلوقتي شغالة كأنها زيرو',
    },
    {
      key: 'p10', authorKey: 'karim', slug: 'nissan-qashqai', hrsAgo: 28,
      title: 'قشقاي 2018 — غيرت الكفرات Bridgestone',
      body:  'قشقاي 2018 فيس لافت — جبت ليها كفرات جديدة Bridgestone وفرق كبير في الـ handling. أي حد بيفكر يغير الكفرات، Bridgestone أو Michelin الأحسن للقشقاي',
    },
    {
      key: 'p11', authorKey: 'mohamed', slug: 'revxchange', hrsAgo: 20,
      title: 'أحسن تأمين سيارة في مصر دلوقتي؟',
      body:  'سؤال للجميع — إيه أحسن تأمين على السيارة في مصر دلوقتي من ناحية التغطية والسعر؟ أنا بين Misr Insurance و AXA',
    },
    {
      key: 'p12', authorKey: 'karim', slug: 'revxchange', hrsAgo: 10,
      title: 'رحلة القاهرة للساحل الشمالي — أحسن طريق؟',
      body:  'حد جرب يعمل لف ع المحور من القاهرة للساحل الشمالي؟ بفكر أعمل رحلة وعايز أعرف الطريق الأحسن للعربيات العادية',
    },
  ];

  const P = {};
  for (const def of postDefs) {
    P[def.key] = await createPost(def);
  }

  // ════════════════════════════════════════════
  // STEP 5 — Create comments
  // ════════════════════════════════════════════
  console.log('\n── Step 5: Creating comments ──');

  let commentsCreated = 0;

  async function createComment({ postKey, authorKey, parentComment = null, depth = 0, body, minsAfterPost }) {
    const post   = P[postKey];
    const author = U[authorKey];
    if (!post || !author) return null;

    const existing = await Comment.findOne({ postId: post._id, authorId: author._id, body });
    if (existing) return existing;

    const createdAt = new Date(post.createdAt.getTime() + minsAfterPost * 60 * 1000);

    const comment = await Comment.create({
      postId:    post._id,
      authorId:  author._id,
      parentId:  parentComment ? parentComment._id : null,
      depth,
      body,
      imageUrls: [],
      createdAt,
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
    commentsCreated++;
    console.log(`  + comment by ${author.name} on [${postKey}]`);
    return comment;
  }

  // ── Post 1 (Corolla طقطقة) ─────────────────
  const c1_ahmed = await createComment({
    postKey: 'p1', authorKey: 'ahmed', depth: 0, minsAfterPost: 45,
    body: 'أنا مريت بنفس الظاهرة، اتضح إن دي مشكلة في الـ VVT-i لوكيت الكامة. غير الأويل فلتر وشوف الفرق',
  });
  await createComment({
    postKey: 'p1', authorKey: 'aya', parentComment: c1_ahmed, depth: 1, minsAfterPost: 80,
    body: 'نفس الكلام حصل معايا بالظبط، بعد تغيير الزيت اختفى الصوت خالص',
  });
  await createComment({
    postKey: 'p1', authorKey: 'youssef', depth: 0, minsAfterPost: 110,
    body: 'ممكن يكون برضو الـ heat shield بتاع الـ exhaust، بيعمل صوت طقطقة لما يبرد',
  });

  // ── Post 2 (Elantra فرامل) ────────────────
  const c2_sara = await createComment({
    postKey: 'p2', authorKey: 'sara', depth: 0, minsAfterPost: 35,
    body: 'لا والله ده غالي، أنا عملت نفس الحاجة برا بـ 1,800 وكانت قطع كويسة. في ميكانيكي في مدينة نصر اسمه أبو علي بيتعامل بشفافية',
  });
  const c2_mohamed = await createComment({
    postKey: 'p2', authorKey: 'mohamed', parentComment: c2_sara, depth: 1, minsAfterPost: 65,
    body: 'ممكن تبعت رقمه؟ أنا كمان محتاج حاجة زي كده',
  });
  await createComment({
    postKey: 'p2', authorKey: 'sara', parentComment: c2_mohamed, depth: 2, minsAfterPost: 95,
    body: 'هبعتهولك على الخاص',
  });
  await createComment({
    postKey: 'p2', authorKey: 'khaled', depth: 0, minsAfterPost: 120,
    body: 'التوكيل دايماً أغلى بس ضمان القطع أحسن، أنا شخصياً بفضل برا بقطع أصلية',
  });

  // ── Post 3 (Sportage عزم) ─────────────────
  await createComment({
    postKey: 'p3', authorKey: 'aya', depth: 0, minsAfterPost: 30,
    body: 'ده كويس جداً للـ 2.0 العادي، الناس بتقلل من السبورتاج بدون سبب',
  });
  await createComment({
    postKey: 'p3', authorKey: 'karim', depth: 0, minsAfterPost: 55,
    body: 'الـ AWD بتاعها بيفرق جداً في الشتا، أنا جربتها على طريق مبلل وكانت ثابتة جداً',
  });
  const c3_mohamed = await createComment({
    postKey: 'p3', authorKey: 'mohamed', depth: 0, minsAfterPost: 80,
    body: 'السبورتاج أو التوسان؟ أنا بين الاتنين دول',
  });
  await createComment({
    postKey: 'p3', authorKey: 'aya', parentComment: c3_mohamed, depth: 1, minsAfterPost: 105,
    body: 'السبورتاج شكلها أحلى والـ interior أفضل، التوسان موتورها أقوى شوية',
  });

  // ── Post 5 (BMW 60k) ──────────────────────
  await createComment({
    postKey: 'p5', authorKey: 'mohamed', depth: 0, minsAfterPost: 40,
    body: 'غير كمان فلتر الوقود لو مش اتغيرش من فترة، وخلي بالك من مستوى الـ coolant',
  });
  await createComment({
    postKey: 'p5', authorKey: 'ahmed', depth: 0, minsAfterPost: 70,
    body: 'وادي برضو الـ brake fluid لو فات عليها سنتين — ده بيتنسى كتير',
  });
  await createComment({
    postKey: 'p5', authorKey: 'karim', depth: 0, minsAfterPost: 95,
    body: 'وخلي بالك من الـ DSC و iDrive، لو في أي رسالة خطأ بلغها بدري',
  });
  await createComment({
    postKey: 'p5', authorKey: 'youssef', depth: 0, minsAfterPost: 115,
    body: 'البي إم دبليو من بعد الـ 60,000 بتحتاج اهتمام أكتر، خصوصاً الـ cooling system',
  });

  // ── Post 6 (Logan 230k) ───────────────────
  await createComment({
    postKey: 'p6', authorKey: 'mostafa', depth: 0, minsAfterPost: 50,
    body: 'صح كلامك، اللوجان من أوفر العربيات في مصر، قطع غيارها رخيصة وميكانيكي كل حتة عارفها',
  });
  const c6_mohamed = await createComment({
    postKey: 'p6', authorKey: 'mohamed', depth: 0, minsAfterPost: 75,
    body: 'أنا كمان فكرت فيها بس الناس بتاخد كورولا عشان الريسيل، اللوجان ريسيلها وحش شوية',
  });
  await createComment({
    postKey: 'p6', authorKey: 'mostafa', parentComment: c6_mohamed, depth: 1, minsAfterPost: 100,
    body: 'صح بس لو مش ناوي تبيع في القريب، اللوجان أوفر بكتير في التشغيل',
  });
  await createComment({
    postKey: 'p6', authorKey: 'sara', depth: 0, minsAfterPost: 115,
    body: 'اللوجان والسيمبول من أحسن العربيات للاستخدام اليومي في مصر',
  });

  // ── Post 7 (Astra تايمنج) ─────────────────
  await createComment({
    postKey: 'p7', authorKey: 'aya', depth: 0, minsAfterPost: 35,
    body: 'شكراً على التنبيه، أنا عندي 2015 وعدادها 85,000 — هبدأ أسأل عنها',
  });
  await createComment({
    postKey: 'p7', authorKey: 'ahmed', depth: 0, minsAfterPost: 60,
    body: 'الأسترا دي عربية محترمة بس محتاجة اهتمام، التايمنج بيلت فيها حساس',
  });
  const c7_karim = await createComment({
    postKey: 'p7', authorKey: 'karim', depth: 0, minsAfterPost: 85,
    body: 'لازم كمان تغير الواتر بمب مع التايمنج، متوفرش في الاتنين لأنهم بيشتغلوا مع بعض',
  });
  await createComment({
    postKey: 'p7', authorKey: 'mostafa', parentComment: c7_karim, depth: 1, minsAfterPost: 110,
    body: 'ده اللي عملته فعلاً، غيرت الاتنين مع بعض وفضل مطمن',
  });

  // ── Post 9 (Lancer أوفرهول) ──────────────
  await createComment({
    postKey: 'p9', authorKey: 'mohamed', depth: 0, minsAfterPost: 45,
    body: 'الأوفرهول ده بيفرق فعلاً، بس لازم تتأكد إن اللي عمله عنده خبرة بالمحركات اليابانية',
  });
  const c9_youssef = await createComment({
    postKey: 'p9', authorKey: 'youssef', depth: 0, minsAfterPost: 70,
    body: '12,000 ده سعر كويس جداً للأوفرهول الكامل، فين الورشة لو سمحت؟',
  });
  await createComment({
    postKey: 'p9', authorKey: 'karim', parentComment: c9_youssef, depth: 1, minsAfterPost: 95,
    body: 'في شبرا الخيمة، ورشة اسمها أبو الوفا، متخصصة في الياباني',
  });
  await createComment({
    postKey: 'p9', authorKey: 'sara', depth: 0, minsAfterPost: 115,
    body: 'اللانسر بومة من أمتن العربيات، بس لازم تلاقي حد شاطر يصلحها',
  });

  // ── Post 11 (تأمين) ───────────────────────
  await createComment({
    postKey: 'p11', authorKey: 'sara', depth: 0, minsAfterPost: 30,
    body: 'AXA تجربتي معاها كانت كويسة، الرد السريع في الحوادث ميزتهم الكبيرة',
  });
  await createComment({
    postKey: 'p11', authorKey: 'khaled', depth: 0, minsAfterPost: 50,
    body: 'أنا مع GIG Insurance، أسعارهم معقولة وبيتعاملوا بجدية',
  });
  await createComment({
    postKey: 'p11', authorKey: 'youssef', depth: 0, minsAfterPost: 65,
    body: 'Allianz كمان خيار كويس، عندهم تغطية شاملة بسعر معقول نسبياً',
  });
  await createComment({
    postKey: 'p11', authorKey: 'aya', depth: 0, minsAfterPost: 80,
    body: 'أنا جربت Misr وكانت تجربة مش حلوة في تسوية الحوادث، غيرت على AXA',
  });
  const c11_ahmed = await createComment({
    postKey: 'p11', authorKey: 'ahmed', depth: 0, minsAfterPost: 100,
    body: 'أنا لسه بدفع تأمين وعمري ما استخدمته 😂 بس خير',
  });
  await createComment({
    postKey: 'p11', authorKey: 'mostafa', parentComment: c11_ahmed, depth: 1, minsAfterPost: 115,
    body: 'ده أحسن حاجة تحصلك، معناها إنك مش بتتحوادث 😂',
  });

  // ── Post 12 (رحلة ساحل شمالي) ────────────
  const c12_mohamed = await createComment({
    postKey: 'p12', authorKey: 'mohamed', depth: 0, minsAfterPost: 40,
    body: 'طريق الضبعة الجديد أحسن بكتير، مش فيه zoles وسريع',
  });
  await createComment({
    postKey: 'p12', authorKey: 'sara', depth: 0, minsAfterPost: 60,
    body: 'خد بالك من محطات البنزين، في مناطق فيها محطات بعيدة، ابدأ بتانك كامل',
  });
  await createComment({
    postKey: 'p12', authorKey: 'ahmed', depth: 0, minsAfterPost: 80,
    body: 'روح بدري الصبح، بعد الساعة 10 الزحمة بتبدأ على الطريق',
  });
  await createComment({
    postKey: 'p12', authorKey: 'youssef', parentComment: c12_mohamed, depth: 1, minsAfterPost: 100,
    body: 'وفيه كاميرات سرعة كتير على الضبعة، خلي بالك',
  });

  // ════════════════════════════════════════════
  // STEP 6 — Add votes on posts
  // ════════════════════════════════════════════
  console.log('\n── Step 6: Adding votes ──');

  let votesAdded = 0;

  async function addVote(postKey, voterKey) {
    const post  = P[postKey];
    const voter = U[voterKey];
    if (!post || !voter) return;

    const exists = await Vote.findOne({ userId: voter._id, postId: post._id });
    if (exists) return;

    await Vote.create({ userId: voter._id, postId: post._id, value: 1 });
    await Post.findByIdAndUpdate(post._id, { $inc: { upvotes: 1, score: 1 } });
    votesAdded++;
    console.log(`  + vote: ${voter.name} → [${postKey}]`);
  }

  // Post 1: Ahmed, Aya, Youssef, Sara
  await addVote('p1', 'ahmed');
  await addVote('p1', 'aya');
  await addVote('p1', 'youssef');
  await addVote('p1', 'sara');

  // Post 2: Sara, Mohamed, Khaled
  await addVote('p2', 'sara');
  await addVote('p2', 'mohamed');
  await addVote('p2', 'khaled');

  // Post 5: Mohamed, Ahmed, Karim, Youssef
  await addVote('p5', 'mohamed');
  await addVote('p5', 'ahmed');
  await addVote('p5', 'karim');
  await addVote('p5', 'youssef');

  // Post 6: Mostafa, Sara, Aya
  await addVote('p6', 'mostafa');
  await addVote('p6', 'sara');
  await addVote('p6', 'aya');

  // Post 9: Mohamed, Youssef, Sara, Aya
  await addVote('p9', 'mohamed');
  await addVote('p9', 'youssef');
  await addVote('p9', 'sara');
  await addVote('p9', 'aya');

  // Post 11: Sara, Khaled, Youssef, Aya, Mostafa, Karim
  await addVote('p11', 'sara');
  await addVote('p11', 'khaled');
  await addVote('p11', 'youssef');
  await addVote('p11', 'aya');
  await addVote('p11', 'mostafa');
  await addVote('p11', 'karim');

  // Recalculate hotScore for posts that received extra votes
  for (const postKey of ['p1', 'p2', 'p5', 'p6', 'p9', 'p11']) {
    const p = P[postKey];
    if (!p) continue;
    const fresh = await Post.findById(p._id).select('upvotes downvotes createdAt');
    if (!fresh) continue;
    await Post.findByIdAndUpdate(p._id, {
      hotScore: calcHotScore(fresh.upvotes, fresh.downvotes, fresh.createdAt),
    });
  }

  // ════════════════════════════════════════════
  // STEP 7 — Create share posts
  // ════════════════════════════════════════════
  console.log('\n── Step 7: Creating share posts ──');

  const centralComm = C['revxchange'];

  async function createShare({ originalPostKey, authorKey, shareCommentary, hrsAgo }) {
    const original = P[originalPostKey];
    const author   = U[authorKey];
    if (!original || !author || !centralComm) {
      console.warn(`  ⚠ Skipping share — missing post, user, or central community`);
      return;
    }

    const exists = await Post.findOne({
      isShare:       true,
      sharedPostId:  original._id,
      authorId:      author._id,
    });
    if (exists) {
      console.log(`  ~ Share already exists: ${author.name} → [${originalPostKey}]`);
      return;
    }

    const createdAt = hoursAgo(hrsAgo);
    const sharePost = await Post.create({
      communityId:      centralComm._id,
      authorId:         author._id,
      title:            `shared: ${original.title}`,
      body:             null,
      imageUrls:        [],
      isShare:          true,
      sharedPostId:     original._id,
      shareCommentary,
      upvotes:          1,
      downvotes:        0,
      score:            1,
      hotScore:         calcHotScore(1, 0, createdAt),
      controversyScore: 0,
      commentCount:     0,
      createdAt,
      updatedAt:        createdAt,
    });

    const voteExists = await Vote.findOne({ userId: author._id, postId: sharePost._id });
    if (!voteExists) {
      await Vote.create({ userId: author._id, postId: sharePost._id, value: 1 });
    }

    await Community.findByIdAndUpdate(centralComm._id, { $inc: { postCount: 1 } });
    postsCreated++;
    console.log(`  + Share: ${author.name} shared [${originalPostKey}] → revxchange`);
  }

  // Youssef shares Post 9 (Lancer أوفرهول)
  await createShare({
    originalPostKey: 'p9',
    authorKey: 'youssef',
    shareCommentary: 'الأوفرهول ده بيستاهل فعلاً للعربيات اليابانية القديمة',
    hrsAgo: 8,
  });

  // Sara shares Post 1 (Corolla طقطقة)
  await createShare({
    originalPostKey: 'p1',
    authorKey: 'sara',
    shareCommentary: 'سؤال مهم — حد عنده خبرة مع صوت الطقطقة دي في الكورولا؟',
    hrsAgo: 5,
  });

  // ════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════
  console.log('\n' + '─'.repeat(56));
  console.log(`✓ ${postsCreated} posts created, ${commentsCreated} comments created, ${votesAdded} votes added`);
  console.log('─'.repeat(56));

  // ════════════════════════════════════════════
  // STEP 8 — Print manual image/video task list
  // ════════════════════════════════════════════
  console.log(`
╔══════════════════════════════════════════════════════╗
║           MANUAL IMAGE/VIDEO TASKS                   ║
╠══════════════════════════════════════════════════════╣
║ 1. Log in as: m.hassan@rxtest.com (Mohamed)          ║
║    Go to: Toyota Corolla community                   ║
║    Find post: "صوت طقطقة في الموتور صباحاً"          ║
║    Edit post → add image                             ║
║    Search: "toyota corolla engine bay"               ║
╠══════════════════════════════════════════════════════╣
║ 2. Log in as: s.elsayed@rxtest.com (Sara)            ║
║    Go to: Kia Sportage community                     ║
║    Find post: "سبورتاج 2021 اختبار عزم"              ║
║    Edit post → add video                             ║
║    Search: any car acceleration video                ║
╠══════════════════════════════════════════════════════╣
║ 3. Log in as: a.zaki@rxtest.com (Aya)                ║
║    Go to: Toyota Corolla community                   ║
║    Find post: "غيرت فرش الكورولا ألكنتارا"           ║
║    Edit post → add image                             ║
║    Search: "car interior alcantara seats"            ║
╠══════════════════════════════════════════════════════╣
║ 4. Log in as: k.fawzy@rxtest.com (Khaled)            ║
║    Go to: BMW 3 Series community                     ║
║    Find post: "320i وصلت 60,000 كم"                  ║
║    Edit post → add image                             ║
║    Search: "bmw 320i engine bay"                     ║
╠══════════════════════════════════════════════════════╣
║ 5. Log in as: m.nasser@rxtest.com (Mostafa)          ║
║    Go to: Chevrolet Cruze community                  ║
║    Find post: "كروز بعد غسيل بخار كامل"              ║
║    Edit post → add image                             ║
║    Search: "engine steam cleaning car"               ║
╠══════════════════════════════════════════════════════╣
║ 6. Log in as: k.mansour@rxtest.com (Karim)           ║
║    Go to: Mitsubishi Lancer community                ║
║    Find post: "لانسر بومة أوفرهول كامل"              ║
║    Edit post → add image                             ║
║    Search: "mitsubishi lancer engine"                ║
╚══════════════════════════════════════════════════════╝`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ Seed script failed:', err.message);
  mongoose.disconnect().finally(() => process.exit(1));
});
