'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User                = require('../models/User');
const Community           = require('../models/Community');
const CommunityMembership = require('../models/CommunityMembership');
const Post                = require('../models/Post');
const Comment             = require('../models/Comment');
const Vote                = require('../models/Vote');

const NOW  = Date.now();
const HOUR = 60 * 60 * 1000;
const MIN  = 60 * 1000;

const ha  = h => new Date(NOW - h * HOUR);
const maf = (date, m) => new Date(date.getTime() + m * MIN);

function calcHotScore(upvotes, downvotes, createdAt) {
  const score = upvotes - downvotes;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign  = score > 0 ? 1 : score < 0 ? -1 : 0;
  const secs  = (createdAt.getTime() / 1000) - 1609459200;
  return parseFloat((sign * order + secs / 45000).toFixed(7));
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Find users ────────────────────────────────────────────────
  const userEmails = {
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
  for (const [key, email] of Object.entries(userEmails)) {
    const user = await User.findOne({ email });
    if (!user) { console.error(`User not found: ${email}`); process.exit(1); }
    U[key] = user;
  }
  console.log('All 8 users found');

  // ── Find communities ──────────────────────────────────────────
  const commSlugs = ['daihatsu-terios', 'nissan-qashqai', 'hyundai-tucson'];
  const C = {};
  for (const slug of commSlugs) {
    const comm = await Community.findOne({ slug });
    if (!comm) { console.error(`Community not found: ${slug}`); process.exit(1); }
    C[slug] = comm;
  }
  console.log('All 3 communities found');

  // ── Memberships ───────────────────────────────────────────────
  const membershipDefs = [
    { slug: 'daihatsu-terios', users: ['karim', 'ahmed', 'mostafa', 'sara', 'aya', 'youssef'] },
    { slug: 'nissan-qashqai',  users: ['mohamed', 'khaled', 'youssef', 'sara'] },
    { slug: 'hyundai-tucson',  users: ['sara', 'aya', 'ahmed', 'mostafa', 'khaled'] },
  ];
  let newMemberships = 0;
  for (const { slug, users } of membershipDefs) {
    const comm = C[slug];
    for (const uKey of users) {
      const userId = U[uKey]._id;
      const existing = await CommunityMembership.findOne({ userId, communityId: comm._id });
      if (!existing) {
        await CommunityMembership.create({ userId, communityId: comm._id });
        await Community.findByIdAndUpdate(comm._id, { $inc: { memberCount: 1 } });
        newMemberships++;
      }
    }
  }
  console.log(`Memberships: ${newMemberships} new`);

  // ── Helpers ───────────────────────────────────────────────────
  let postsCreated = 0, commentsCreated = 0, votesAdded = 0;
  const postMap    = {};
  const commentMap = {};

  async function createPost(label, authorKey, slug, title, body, imageUrls, createdAt) {
    const authorId    = U[authorKey]._id;
    const communityId = C[slug]._id;
    const existing    = await Post.findOne({ title, authorId });
    if (existing) { postMap[label] = existing; return existing; }
    const hotScore = calcHotScore(1, 0, createdAt);
    const post = await Post.create({
      communityId, authorId, title, body, imageUrls,
      upvotes: 1, downvotes: 0, score: 1, hotScore,
      commentCount: 0, createdAt, updatedAt: createdAt,
    });
    await Vote.create({ userId: authorId, postId: post._id, value: 1 });
    await Community.findByIdAndUpdate(communityId, { $inc: { postCount: 1 } });
    postMap[label] = post;
    postsCreated++;
    return post;
  }

  async function createComment(label, authorKey, postLabel, parentLabel, depth, body, createdAt) {
    const authorId = U[authorKey]._id;
    const post     = postMap[postLabel];
    const parentId = parentLabel ? (commentMap[parentLabel]?._id ?? null) : null;
    const existing = await Comment.findOne({ postId: post._id, authorId, body });
    if (existing) { commentMap[label] = existing; return existing; }
    const comment = await Comment.create({
      postId: post._id, authorId, parentId, depth, body, createdAt,
    });
    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
    commentMap[label] = comment;
    commentsCreated++;
    return comment;
  }

  async function addVote(authorKey, postLabel) {
    const userId = U[authorKey]._id;
    const post   = postMap[postLabel];
    const exists = await Vote.findOne({ userId, postId: post._id });
    if (exists) return;
    await Vote.create({ userId, postId: post._id, value: 1 });
    await Post.findByIdAndUpdate(post._id, { $inc: { upvotes: 1, score: 1 } });
    votesAdded++;
  }

  // ── Posts ─────────────────────────────────────────────────────

  // Daihatsu Terios
  await createPost('T1', 'karim', 'daihatsu-terios',
    'كمبريسور التيريوس — جربت كل حاجة ومش عارف أحل',
    'والله يا جماعة أنا زهقت خالص من الموضوع ده. تيريوس 2008 والتكييف بقاله شهرين مش شغال. غيرت الشارجة مرتين، غيرت الفريون، فحصته عند ناس كتير وكل واحد بيقولي حاجة تانية. واحد قالي الكمبريسور خلص، تاني قالي في تسريب في الكونديشن، تالت قالي السوينة بظبطش. صرفت فوق 3000 جنيه ولسه مش شغال. حد عنده تيريوس ومر بنفس الكلام ده؟',
    [], ha(91));

  await createPost('T2', 'mostafa', 'daihatsu-terios',
    'تيريوس 2010 — بعد 180,000 كم لسه معايا',
    'الحمد لله عربيتي بقالها 14 سنة معايا وعداداتها 180 الف. السر مش سر، بس صيانة منتظمة وعدم تحميل الموتور. الوحيد اللي اتغير فيها غير الصيانات الدورية: تايمنج بيلت مرتين، كلتش مرة واحدة، وبطارية 3 مرات. باقي العربية ماشية تمام. التيريوس دي متنة جداً لو اتعاملت معاها صح',
    [], ha(73));

  await createPost('T3', 'ahmed', 'daihatsu-terios',
    'فين أحسن قطع غيار تيريوس في القاهرة؟',
    'محتاج أغير تيل الدركسيون وجوانة عجل أمامي. اللي عارف مكان بيبيع قطع تيريوس أصلية أو كويسة في القاهرة يدلني. جربت في العتبة بس معظمهم بيبيعوا صيني مش عارف مصداقيته',
    [], ha(61));

  await createPost('T4', 'aya', 'daihatsu-terios',
    'تيريوس ولا راش — للاستخدام اليومي في القاهرة؟',
    'بفكر أشتري عربية صغيرة للمشوار اليومي في القاهرة والزحمة. التيريوس موجودة بسعر كويس بس شايفة الراش أقل استهلاك. حد عنده تجربة مع الاتنين يقولي رأيه؟ الاستخدام مشوار يومي تقريباً 30 كيلو في الزحمة',
    [], ha(49));

  // Nissan Qashqai
  await createPost('Q1', 'khaled', 'nissan-qashqai',
    'قشقاي 2020 — فحص قبل الشراء، اتعلمت منه حاجات',
    'اشتريت قشقاي 2020 الشهر اللي فات وعملت فحص كامل قبل الشراء. لقوا إن الفرامل الأمامية محتاجة تغيير وفيه رشة بسيطة في باب خلفي. استخدمت ده في التفاوض ونزلت 25 الف من السعر. نصيحتي لأي حد عايز يشتري: الفحص في مركز معتمد مش رفاهية، ده ضرورة. دفعت 800 جنيه للفحص ووفرت 25 الف',
    [], ha(85));

  await createPost('Q2', 'youssef', 'nissan-qashqai',
    'استهلاك بنزين القشقاي — الواقع مش الإعلانات',
    'بعد 6 شهور مع القشقاي 2019 هقولكم الاستهلاك الحقيقي. في الزحمة: 13-14 لتر على 100 كيلو. في الطريق السريع: 8-9 لتر على 100. مش زي ما نيسان بتقول بس معقول لعربية الحجم ده. اللي عايز يشتري يحسب بناءً على الأرقام دي مش أرقام الكتالوج',
    [], ha(67));

  await createPost('Q3', 'sara', 'nissan-qashqai',
    'قشقاي 2018 — مشكلة في الـ CVT بعد 95,000 كم',
    'يا جماعة محتاجة مساعدة. القشقاي 2018 بدأت تحس بتجاوب بطيء في الفتيس لما بتعدي 80 كيلو على الطريق السريع. زي ما الـ CVT بيتردد شوية. فحصتها وقالوا الـ CVT زيت محتاج تغيير وفيه wear بسيط. سعر تغيير الزيت 2800 جنيه عند التوكيل. ده طبيعي ولا في حاجة تانية؟',
    [], ha(43));

  // Hyundai Tucson
  await createPost('H1', 'sara', 'hyundai-tucson',
    'توسان 2022 — أول 10,000 كم انطباعاتي',
    'خلصت أول 10 الاف كيلو مع التوسان 2022 وهشارككم انطباعاتي. الإيجابيات: الشكل ممتاز، الـ interior فاخر جداً لسعره، الـ safety features ممتازة، هادية جداً على الطريق. السلبيات: استهلاك البنزين فوق التوقعات شوية، الـ infotainment بيتعلق أحياناً ومحتاج reset. بشكل عام راضية جداً، أحسن قرار اتخدته',
    [], ha(79));

  await createPost('H2', 'aya', 'hyundai-tucson',
    'توسان ولا سبورتاج؟ خليتوني أتجن',
    'بقالي شهر بسأل ومقدرتش أاخد قرار 😂 ميزانيتي 600 الف والاتنين موجودين بالسعر ده. كل ما قررت التوسان لقيت حد قالي السبورتاج أحسن وكل ما قررت السبورتاج لقيت حد قالي التوسان. محتاجة رأي حد جرب الاتنين فعلاً مش مجرد كلام',
    [], ha(55));

  await createPost('H3', 'ahmed', 'hyundai-tucson',
    'صيانة التوسان 2019 — تفاصيل التكاليف',
    'عملت صيانة الـ 60,000 كيلو للتوسان 2019 عند التوكيل وهشارككم التكلفة الكاملة عشان الناس تكون فاكرة: زيت موتور 0W-30 + فلتر: 1,200 جنيه. فلتر هواء: 450 جنيه. فلتر كابينة: 380 جنيه. تدوير عجل + ضبط زوايا: 650 جنيه. فحص فرامل: 200 جنيه. الإجمالي: 2,880 جنيه. غالية؟ أيوه. بس التوكيل ضمان وشغل نضيف',
    [], ha(37));

  console.log(`Posts: ${postsCreated} created`);

  // ── Comments ──────────────────────────────────────────────────

  // POST T1
  await createComment('C1',  'ahmed',   'T1', null, 0, 'أنا مريت بنفس الموقف بالظبط مع تيريوس 2007. المشكلة اللي عندك على الأغلب مش في الكمبريسور نفسه، المشكلة في الـ expansion valve. ده اللي بيتسبب في إن الفريون يتحط وما يشتغلش. سعره حوالي 800 جنيه وتركيبه مش صعب', maf(ha(91), 45));
  await createComment('C2',  'karim',   'T1', 'C1',  1, 'جد؟ ده أول حد يقولي الكلام ده. الناس اللي شوفتهم ما ذكروش الـ expansion valve خالص. فين ممكن أجيبه وهو بيتركب فين؟', maf(commentMap['C1'].createdAt, 25));
  await createComment('C3',  'ahmed',   'T1', 'C2',  2, 'في العتبة ممكن تلاقيه، اسأل عن قطع دايهاتسو. أو جرب سوق التوفيقية. للتركيب أي ميكانيكي تكييف عارف يعمله، مش لازم متخصص في التيريوس', maf(commentMap['C2'].createdAt, 20));
  await createComment('C4',  'mostafa', 'T1', null,  0, 'الكمبريسور في التيريوس معروف إنه بيعاني بعد الـ 100 الف كيلو. بس قبل ما تصرف على حاجة تانية، فحص الـ clutch بتاع الكمبريسور. لو الـ clutch مش بيشتبك صح، الكمبريسور مش هيشتغل حتى لو الفريون تمام', maf(ha(91), 90));
  await createComment('C5',  'youssef', 'T1', 'C4',  1, 'كلام صح ده. أنا كمان جربت ده. الـ clutch بيتبلى وسعره حوالي 600-700 جنيه، أرخص بكتير من كمبريسور جديد اللي ممكن يوصل لـ 4000-5000', maf(commentMap['C4'].createdAt, 30));
  await createComment('C6',  'karim',   'T1', 'C5',  2, 'يعني ممكن المشكلة في الـ clutch بس؟ ما كانش في بالي خالص الموضوع ده. هروح أفحصه بكره', maf(commentMap['C5'].createdAt, 15));
  await createComment('C7',  'sara',    'T1', null,  0, 'جاري قرأ الموضوع ده وحاسة إنه مهم 😅 عندي سؤال — الكمبريسور البديل لازم يكون أصلي ولا الصيني بيعدي؟ سألت ناس وكل واحد بيقول حاجة', maf(ha(91), 135));
  await createComment('C8',  'ahmed',   'T1', 'C7',  1, 'الأصلي أحسن طبعاً بس سعره صعب. فيه تاني خيار وهو الـ remanufactured يعني كمبريسور اتعمله rebuild. ده بيكون بسعر معقول وأحسن من الصيني الجديد', maf(commentMap['C7'].createdAt, 40));
  await createComment('C9',  'aya',     'T1', null,  0, 'ربنا يسهل عليك يا كريم 😂 العربيات الصغيرة دي التكييف فيها دايماً مشكلة في الصيف. أنا كنت بفكر في التيريوس بس الموضوع ده خلاني أفكر تاني', maf(ha(91), 180));
  await createComment('C10', 'karim',   'T1', 'C9',  1, 'لا لا التيريوس عربية ممتازة، المشكلة دي ممكن تحصل مع أي عربية قديمة. المشكلة مني أنا إني فضلت أصرف على ناس مش شاطرة 😂', maf(commentMap['C9'].createdAt, 20));

  // POST T2
  await createComment('C11', 'karim',   'T2', null,  0, '180 الف كيلو ده إنجاز يا مستفى 👏 إيه الزيت اللي بتستخدمه؟', maf(ha(73), 60));
  await createComment('C12', 'mostafa', 'T2', 'C11', 1, 'Castrol 10W-40 طول عمري. مش بغير ولا بجرب حاجة تانية 😄', maf(commentMap['C11'].createdAt, 30));
  await createComment('C13', 'ahmed',   'T2', null,  0, 'التايمنج بيلت مرتين معناها غيرته على كل 80-90 الف، ده صح. كتير من الناس بيفضل يؤخره وبيندم', maf(ha(73), 90));
  await createComment('C14', 'youssef', 'T2', null,  0, 'الكلتش مرة واحدة على 180 الف ده كويس جداً. بتشيل إيه في العربية؟', maf(ha(73), 120));
  await createComment('C15', 'mostafa', 'T2', 'C14', 1, 'بشيل 4 أفراد بس 😂 ما بحملش حاجات تقيلة ولا بركبها على رصيف', maf(commentMap['C14'].createdAt, 25));

  // POST T3
  await createComment('C16', 'karim',   'T3', null,  0, 'في محل في الموسكي اسمه الحاج سعيد متخصص في قطع الياباني القديم، جرب هناك', maf(ha(61), 50));
  await createComment('C17', 'mostafa', 'T3', null,  0, 'سوق التوفيقية فيه ناس كتير بتتعامل في التيريوس، بس اتأكد إنهم بيبيعوا original أو genuine مش صيني', maf(ha(61), 80));
  await createComment('C18', 'sara',    'T3', null,  0, 'أنا سمعت إن في موقع كاريانا بيبيع قطع غيار أصلية أونلاين، جربته حد؟', maf(ha(61), 110));

  // POST T4
  await createComment('C19', 'mostafa', 'T4', null,  0, 'التيريوس على طول، الراش استهلاكه أعلى والقطع أغلى. التيريوس ده موتوره بسيط وصيانته رخيصة وكل ميكانيكي يعرف يصلحه', maf(ha(49), 40));
  await createComment('C20', 'ahmed',   'T4', null,  0, 'الاتنين كويسين بصراحة. بس للزحمة اليومية التيريوس أريح لأن حجمه أصغر ومناسب أكتر للزحمة', maf(ha(49), 70));
  await createComment('C21', 'karim',   'T4', 'C20', 1, 'وبنزينه أقل كمان، الراش موتوره 1500 والتيريوس 1000. في الزحمة الفرق بيظهر', maf(commentMap['C20'].createdAt, 20));

  // POST Q1
  await createComment('C22', 'karim',   'Q1', null,  0, 'نصيحة ذهبية. أنا اشتريت من غير فحص زمان وندمت، دفعت فلوس كتير بعدين في صيانات كان ممكن أعرفها قبل', maf(ha(85), 55));
  await createComment('C23', 'youssef', 'Q1', null,  0, 'فين بتعمل الفحص؟ عارف مركز كويس في القاهرة؟', maf(ha(85), 100));
  await createComment('C24', 'khaled',  'Q1', 'C23', 1, 'أنا عملته في Car Check Egypt في مدينة نصر، تقريباً 800-1000 جنيه وبيديك تقرير كامل', maf(commentMap['C23'].createdAt, 35));
  await createComment('C25', 'sara',    'Q1', null,  0, 'وفرت 25 الف بـ 800 جنيه 😂 ده استثمار أذكى حاجة عملتها', maf(ha(85), 140));

  // POST Q2
  await createComment('C26', 'khaled',  'Q2', null,  0, 'أرقام قريبة من اللي عندي. بس لو عملت ضبط زوايا كويس وكاوتش مناسب الاستهلاك بيتحسن شوية', maf(ha(67), 65));
  await createComment('C27', 'karim',   'Q2', null,  0, '13-14 في الزحمة ده كتير شوية. أنا 2018 بياكل 11-12 في الزحمة. ممكن الـ fuel injectors محتاجة نضافة', maf(ha(67), 95));
  await createComment('C28', 'youssef', 'Q2', 'C27', 1, 'ممكن. بس أنا كمان سلوكي في القيادة مش اقتصادي 😄 بحب أقود بسرعة', maf(commentMap['C27'].createdAt, 30));

  // POST Q3
  await createComment('C29', 'khaled',  'Q3', null,  0, 'الـ CVT في القشقاي دي نقطة ضعف معروفة. 2800 للزيت ده مبالغ فيه شوية، جربي خارج التوكيل بزيت Nissan NS-3 الأصلي بسعر أرخص', maf(ha(43), 50));
  await createComment('C30', 'youssef', 'Q3', null,  0, 'تغيير زيت الـ CVT لازم يتعمل كل 40 الف كيلو، لو اتأخر بيبدأ يحس بالـ wear. ده مش عيب في العربية، ده صيانة لازمة', maf(ha(43), 75));
  await createComment('C31', 'ahmed',   'Q3', null,  0, 'لو الـ wear بسيط ومش فيه صوت أو رجفة، تغيير الزيت هيحل المشكلة. لو فيه صوت مع الـ hesitation يبقى لازم تتعمقي أكتر', maf(ha(43), 110));

  // POST H1
  await createComment('C32', 'aya',    'H1', null,  0, 'ده اللي كنت محتاجاه 😍 خصوصاً جزء السلبيات، الـ infotainment بيتعلق ده عرفته من ناس كتير', maf(ha(79), 45));
  await createComment('C33', 'ahmed',  'H1', null,  0, 'الـ infotainment في التوسان معروف إن فيه مشكلة. جربي تعملي reset كامل من الإعدادات وشوفي لو هيتحسن', maf(ha(79), 80));
  await createComment('C34', 'sara',   'H1', 'C33', 1, 'عملت ده فعلاً وتحسن. بس بيرجع تاني بعد فترة. على ما يلاقوله حل بالـ update', maf(commentMap['C33'].createdAt, 25));
  await createComment('C35', 'khaled', 'H1', null,  0, 'التوسان 2022 مختلفة كتير عن اللي قبلها. الـ interior قفز قفزة كبيرة. انبسطي بيها', maf(ha(79), 120));

  // POST H2
  await createComment('C36', 'sara',   'H2', null,  0, 'خدي التوسان، الـ interior أفضل بكتير والـ safety rating أعلى. السبورتاج شكله أحلى بس التوسان أمتن', maf(ha(55), 40));
  await createComment('C37', 'khaled', 'H2', null,  0, 'السبورتاج لو خدتيه GT Line الشكل ده جميل جداً وفيه مميزات كتير. بس للأمان التوسان أوفر', maf(ha(55), 75));
  await createComment('C38', 'aya',    'H2', 'C37', 1, 'الـ GT Line دي بـ 680 الف دلوقتي، خارج ميزانيتي 😢', maf(commentMap['C37'].createdAt, 20));
  await createComment('C39', 'ahmed',  'H2', null,  0, 'الاتنين كويسين ومش هتندمي على أي منهم. بس لو هتتقلي قرار — التوسان', maf(ha(55), 110));

  // POST H3
  await createComment('C40', 'sara',    'H3', null,  0, 'شكراً على التفاصيل دي، ده بالظبط اللي بيبحث عنه الناس قبل الشراء. صيانة التوكيل غالية بس مريحة', maf(ha(37), 50));
  await createComment('C41', 'mostafa', 'H3', null,  0, '2,880 معقولة للـ 60 الف. لو عملتها برا هتدفع نص ده تقريباً بس مفيش ضمان', maf(ha(37), 85));
  await createComment('C42', 'khaled',  'H3', 'C41', 1, 'أنا بعمل الصيانات برا بقطع أصلية وبدفع تقريباً 1,600-1,800. الفرق كبير وما لقيتش مشكلة لحد دلوقتي', maf(commentMap['C41'].createdAt, 30));

  console.log(`Comments: ${commentsCreated} created`);

  // ── Votes ─────────────────────────────────────────────────────
  for (const u of ['ahmed', 'sara', 'youssef', 'mostafa', 'aya'])  await addVote(u, 'T1');
  for (const u of ['karim', 'ahmed', 'youssef', 'sara'])            await addVote(u, 'T2');
  for (const u of ['karim', 'youssef', 'sara', 'mostafa', 'aya'])   await addVote(u, 'Q1');
  for (const u of ['khaled', 'youssef', 'ahmed'])                   await addVote(u, 'Q3');
  for (const u of ['aya', 'ahmed', 'khaled', 'mostafa'])            await addVote(u, 'H1');
  for (const u of ['sara', 'khaled', 'ahmed', 'youssef'])           await addVote(u, 'H2');
  for (const u of ['sara', 'mostafa', 'khaled'])                    await addVote(u, 'H3');
  console.log(`Votes: ${votesAdded} added`);

  // ── Recalculate hotScores for voted posts ─────────────────────
  for (const label of ['T1', 'T2', 'Q1', 'Q3', 'H1', 'H2', 'H3']) {
    const p  = await Post.findById(postMap[label]._id);
    if (!p) continue;
    const hs = calcHotScore(p.upvotes, p.downvotes, p.createdAt);
    await Post.findByIdAndUpdate(p._id, { $set: { hotScore: hs } });
  }

  // ── Manual media tasks ────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                 MANUAL MEDIA TASKS                           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ 1. Login: k.mansour@rxtest.com (Karim)                       ║');
  console.log('║    Community: Daihatsu Terios                                ║');
  console.log('║    Post: كمبريسور التيريوس — جربت كل حاجة                   ║');
  console.log('║    Add image of: broken AC compressor / car engine           ║');
  console.log('║    Search: "car AC compressor broken egypt"                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ 2. Login: m.nasser@rxtest.com (Mostafa)                      ║');
  console.log('║    Community: Daihatsu Terios                                ║');
  console.log('║    Post: تيريوس 2010 — بعد 180,000 كم                       ║');
  console.log('║    Add image of: high odometer reading / terios dashboard    ║');
  console.log('║    Search: "daihatsu terios odometer 180000"                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ 3. Login: k.fawzy@rxtest.com (Khaled)                        ║');
  console.log('║    Community: Nissan Qashqai                                 ║');
  console.log('║    Post: قشقاي 2020 — فحص قبل الشراء                        ║');
  console.log('║    Add image of: car inspection report / mechanic checking   ║');
  console.log('║    Search: "car pre purchase inspection report"               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ 4. Login: s.elsayed@rxtest.com (Sara)                        ║');
  console.log('║    Community: Hyundai Tucson                                 ║');
  console.log('║    Post: توسان 2022 — أول 10,000 كم                         ║');
  console.log('║    Add image of: Hyundai Tucson 2022 interior or exterior    ║');
  console.log('║    Search: "hyundai tucson 2022 interior"                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  console.log(`Done. Summary: ${postsCreated} posts, ${commentsCreated} comments, ${votesAdded} votes, ${newMemberships} memberships`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
