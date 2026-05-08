// ─── Navbar Scroll ───────────────────────────────────────────
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 80);
    });

    const navIndicator   = document.getElementById('navIndicator');
    const navLinksList   = document.querySelector('.nav-links');
    const navLinkAnchors = document.querySelectorAll('.nav-links a');

    if (navIndicator && navLinksList) {
        function moveIndicator(anchor) {
            const listRect = navLinksList.getBoundingClientRect();
            const linkRect = anchor.getBoundingClientRect();
            navIndicator.style.left    = (linkRect.left - listRect.left) + 'px';
            navIndicator.style.width   = linkRect.width + 'px';
            navIndicator.style.opacity = '1';
        }
        navLinkAnchors.forEach(a => a.addEventListener('mouseenter', () => moveIndicator(a)));
        navLinksList.addEventListener('mouseleave', () => { navIndicator.style.opacity = '0'; });
    }
}

// ─── Brand Data (34 communities, 3 pages) ───────────────────
const communityBrands = [
    { id:'toyota-corolla',    name:'Toyota Corolla',       members:'12,400', img:'../assets/images/toyota.png'      },
    { id:'mercedes-c200',     name:'Mercedes C200',        members:'9,100',  img:'../assets/images/mercedes.png'    },
    { id:'bmw-320i',          name:'BMW 320i',             members:'8,200',  img:'../assets/images/bmw.png'         },
    { id:'kia-sportage',      name:'Kia Sportage',         members:'7,800',  img:'../assets/images/kia.png'         },
    { id:'hyundai-elantra',   name:'Hyundai Elantra',      members:'6,500',  img:'../assets/images/hyundai.png'     },
    { id:'nissan-sunny',      name:'Nissan Sunny',         members:'5,200',  img:'../assets/images/nissan.png'      },
    { id:'chevrolet-cruze',   name:'Chevrolet Cruze',      members:'4,800',  img:'../assets/images/chevrolet.png'   },
    { id:'mg-rx5',            name:'MG RX5',               members:'4,100',  img:'../assets/images/mg.png'          },
    { id:'honda-civic',       name:'Honda Civic',          members:'3,600',  img:'../assets/images/honda.png'       },
    { id:'vw-passat',         name:'Volkswagen Passat',    members:'3,900',  img:'../assets/images/volkswagen.png'  },
    { id:'peugeot-208',       name:'Peugeot 208',          members:'3,200',  img:'../assets/images/peugeot.png'     },
    { id:'renault-clio',      name:'Renault Clio',         members:'2,200',  img:'../assets/images/renault.png'     },
    { id:'fiat-tipo',         name:'Fiat Tipo',            members:'2,800',  img:'../assets/images/fiat.png'        },
    { id:'chery-tiggo',       name:'Chery Tiggo 7',        members:'2,600',  img:'../assets/images/chery.png'       },
    { id:'skoda-octavia',     name:'Skoda Octavia',        members:'2,400',  img:'../assets/images/skoda.png'       },
    { id:'opel-astra',        name:'Opel Astra',           members:'1,900',  img:'../assets/images/opel.png'        },
    { id:'mazda-3',           name:'Mazda 3',              members:'2,800',  img:'../assets/images/mazda.png'       },
    { id:'mitsubishi-lancer', name:'Mitsubishi Lancer',    members:'2,100',  img:'../assets/images/mitsubishi.png'  },
    { id:'ford-focus',        name:'Ford Focus',           members:'1,800',  img:'../assets/images/ford.png'        },
    { id:'jeep-cherokee',     name:'Jeep Cherokee',        members:'2,400',  img:'../assets/images/jeep.png'        },
    { id:'audi-a4',           name:'Audi A4',              members:'3,200',  img:'../assets/images/audi.png'        },
    { id:'lexus-es',          name:'Lexus ES',             members:'1,600',  img:'../assets/images/lexus.png'       },
    { id:'infiniti-q50',      name:'Infiniti Q50',         members:'1,400',  img:'../assets/images/infiniti.png'    },
    { id:'subaru-outback',    name:'Subaru Outback',       members:'1,100',  img:'../assets/images/subaru.png'      },
    { id:'suzuki-swift',      name:'Suzuki Swift',         members:'1,800',  img:'../assets/images/suzuki.png'      },
    { id:'daihatsu-terios',   name:'Daihatsu Terios',      members:'2,200',  img:'../assets/images/daihatsu.png'    },
    { id:'geely-emgrand',     name:'Geely Emgrand',        members:'1,900',  img:'../assets/images/geely.png'       },
    { id:'baic-x35',          name:'BAIC X35',             members:'1,600',  img:'../assets/images/baic.png'        },
    { id:'haval-h6',          name:'Haval H6',             members:'2,800',  img:'../assets/images/haval.png'       },
    { id:'jac-s3',            name:'JAC S3',               members:'1,200',  img:'../assets/images/jac.png'         },
    { id:'isuzu-dmax',        name:'Isuzu D-Max',          members:'900',    img:'../assets/images/isuzu.png'       },
    { id:'volvo-xc60',        name:'Volvo XC60',           members:'1,100',  img:'../assets/images/volvo.png'       },
    { id:'porsche-cayenne',   name:'Porsche Cayenne',      members:'1,400',  img:'../assets/images/porsche.png'     },
    { id:'land-rover',        name:'Land Rover Discovery', members:'1,800',  img:'../assets/images/landrover.png'   },
];

// ─── Post Data ──────────────────────────────────────────────
const communityPosts = {
    'toyota-corolla': [
        { id:1, author:'Ahmed Hassan',  avatar:'👤', time:'2 hours ago',
          text:'Anyone know a reliable mechanic in Cairo for a Corolla 2019? My AC compressor is making a grinding noise and I need someone I can actually trust.',
          lang:'en', likes:24, dislikes:1, comments:8 },
        { id:2, author:'Mohamed Ali',   avatar:'👤', time:'5 hours ago',
          text:'عملت صيانة الـ 60,000 كيلو لكورولا 2020. غيرت الزيت وفلتر الهواء والبوجيهات. التمانة من التوكيل كانت 4,200 جنيه. معقول؟',
          lang:'ar', likes:37, dislikes:0, comments:14 },
        { id:3, author:'Nour Khalil',   avatar:'👤', time:'1 day ago',
          text:'Thinking of upgrading from a 2017 Corolla to the 2024 model. Is the difference worth the price jump? The interior feels much more premium but I\'m unsure about long-term reliability.',
          lang:'en', likes:55, dislikes:3, comments:22 },
        { id:4, author:'Sara Nabil',    avatar:'👤', time:'2 days ago',
          text:'هل في حد جرب التأمين الشامل على كورولا 2021؟ أي شركة بتنصح بيها؟ جربت اتنين وكانوا بطيئين جداً في التسوية.',
          lang:'ar', likes:19, dislikes:2, comments:11 },
        { id:5, author:'Tamer Ibrahim', avatar:'👤', time:'3 days ago',
          text:'Just passed 200,000 km on my 2012 Corolla with zero major issues. Regular oil changes every 5,000 km and timing belt at 100k. This car is genuinely built to last.',
          lang:'en', likes:142, dislikes:0, comments:47 },
    ],
    'bmw-320i': [
        { id:1, author:'Karim Mostafa', avatar:'👤', time:'3 hours ago',
          text:'Just hit 100,000 km on my 2018 320i. Planning a full service — timing chain, spark plugs, or cooling system first? Looking for a specialist in Maadi.',
          lang:'en', likes:41, dislikes:0, comments:15 },
        { id:2, author:'Omar Sameh',    avatar:'👤', time:'6 hours ago',
          text:'تحذير: لو عندك 320i 2015-2017 وعندك vibration في العجل على سرعة 120+، راجع الـ wheel balancing والـ control arm bushings. كانت مشكلة شائعة عند الفئة دي.',
          lang:'ar', likes:88, dislikes:1, comments:34 },
        { id:3, author:'Hany Farouk',   avatar:'👤', time:'1 day ago',
          text:'Genuine vs aftermarket parts for BMW in Egypt — what\'s your real experience? The price gap is enormous but I\'m not confident in local aftermarket consistency.',
          lang:'en', likes:33, dislikes:4, comments:19 },
        { id:4, author:'Youssef Ragab', avatar:'👤', time:'2 days ago',
          text:'عارض بيعها بعد 3 سنين. ما فيش مشاكل كبيرة بس الصيانة مكلفة جداً لو مش عارف تتعامل مع ناس متخصصين. البيتزا مش للجميع 😂',
          lang:'ar', likes:71, dislikes:5, comments:28 },
        { id:5, author:'Adel Wagih',    avatar:'👤', time:'4 days ago',
          text:'Installed a cold air intake and got noticeable improvement in throttle response. Anyone done a tune on an N20 engine in Egypt? Looking for a reliable dyno shop.',
          lang:'en', likes:29, dislikes:2, comments:12 },
    ],
    'kia-sportage': [
        { id:1, author:'Sara Nabil',   avatar:'👤', time:'1 hour ago',
          text:'Comparing the 2023 Sportage vs the MG RX5 for a family car. Which holds better resale value in the Egyptian market long term?',
          lang:'en', likes:67, dislikes:3, comments:29 },
        { id:2, author:'Rania Fouad',  avatar:'👤', time:'4 hours ago',
          text:'ريفيو بعد سنة: سبورتاج 2022. الجوانب الإيجابية كتير — التصميم ممتاز، الكابينة واسعة، الـ safety features حلوة. السلبية: استهلاك البنزين أعلى من المتوقع في الزحمة.',
          lang:'ar', likes:94, dislikes:2, comments:41 },
        { id:3, author:'Khaled Bahaa', avatar:'👤', time:'2 days ago',
          text:'Anyone using the Sportage for regular highway trips to North Coast or Ain Sokhna? What\'s fuel economy like at a steady 120 km/h?',
          lang:'en', likes:22, dislikes:0, comments:13 },
        { id:4, author:'Dina Medhat',  avatar:'👤', time:'3 days ago',
          text:'غيرت الزيت والفلاتر عند وكيل كيا — التكلفة 3,800 جنيه. نفس الشيء في ورشة موثوقة بـ 2,100 جنيه. القرار بيتكم.',
          lang:'ar', likes:156, dislikes:8, comments:62 },
        { id:5, author:'Amr Hamdi',    avatar:'👤', time:'5 days ago',
          text:'The panoramic sunroof on the Sportage is a game changer. But I\'ve heard rattling issues with some 2022 batches — anyone else experiencing this?',
          lang:'en', likes:18, dislikes:1, comments:9 },
    ],
    'mercedes-c200': [
        { id:1, author:'Sherif Badr',  avatar:'👤', time:'30 min ago',
          text:'C200 W205 owners — OEM only or do you trust local alternatives? Specifically asking about brake pads and rotors. Big price difference.',
          lang:'en', likes:31, dislikes:0, comments:10 },
        { id:2, author:'Layla Hassan', avatar:'👤', time:'3 hours ago',
          text:'بعد سنتين على C200 2020، التكلفة الكلية للصيانة وصلت تقريباً لـ 38,000 جنيه. غالية بس المتعة مش قابلة للنقاش 😌',
          lang:'ar', likes:47, dislikes:6, comments:21 },
        { id:3, author:'Walid Nour',   avatar:'👤', time:'1 day ago',
          text:'Anyone dealt with the MBUX system freezing on the C-Class? Happened twice on my 2021, dealer says it\'s a software update. Is this a widespread issue?',
          lang:'en', likes:39, dislikes:0, comments:17 },
        { id:4, author:'Hassan Gaber', avatar:'👤', time:'2 days ago',
          text:'قارنت بين C200 وBMW 320i لمدة شهر قبل ما اشتري. الـ C200 ربح بسبب: الكابينة أفضل للسواقة اليومية، الديلر أحسن في مصر، وقطع الغيار متوفرة أكتر.',
          lang:'ar', likes:112, dislikes:9, comments:53 },
        { id:5, author:'Mina Samir',   avatar:'👤', time:'4 days ago',
          text:'Reselling my 2019 C200 after 4 years. It retained about 78% of its value — impressive. Mercedes holds value really well in Egypt vs other European brands.',
          lang:'en', likes:85, dislikes:1, comments:38 },
    ],
    'hyundai-elantra': [
        { id:1, author:'Mostafa Nasser', avatar:'👤', time:'1 hour ago',
          text:'Is the Elantra 2023 facelift worth the extra cost over the 2021? New front end looks great but the price gap is around 80,000 EGP.',
          lang:'en', likes:28, dislikes:1, comments:14 },
        { id:2, author:'Aya Fawzy',      avatar:'👤', time:'5 hours ago',
          text:'إيلانترا 2022 — بعد 40,000 كيلو. محدش يقلق من الصيانة. سعرها معقول، ورشة هيونداي موجودة في كل مكان، وقطع الغيار بأسعار محتملة.',
          lang:'ar', likes:63, dislikes:0, comments:27 },
        { id:3, author:'Tarek Sabry',    avatar:'👤', time:'1 day ago',
          text:'Anyone added aftermarket audio to their Elantra? Looking to upgrade speakers and head unit without touching the safety systems.',
          lang:'en', likes:15, dislikes:0, comments:7 },
        { id:4, author:'Nada Mohsen',    avatar:'👤', time:'3 days ago',
          text:'ملاحظة مهمة: لو عندك إيلانترا 2020-2022 وعندك صوت طقطقة من الـ dashboard في الجو الحر، ده مشكلة شائعة في البلاستيك. حلها بسيط عند أي ميكانيكي محترف.',
          lang:'ar', likes:74, dislikes:0, comments:31 },
        { id:5, author:'Fady George',    avatar:'👤', time:'4 days ago',
          text:'Elantra vs Kia Cerato — same platform, different character. Elantra has better looks, Cerato has a more comfortable ride. Curious what others think.',
          lang:'en', likes:44, dislikes:7, comments:23 },
    ],
};

// ─── Generic Fallback Posts ──────────────────────────────────
function getGenericPosts(brandName) {
    return [
        { id:1, author:'Car Enthusiast',   avatar:'👤', time:'3 hours ago',
          text:`Welcome to the ${brandName} community! Share your experiences, questions, and tips with fellow owners across Egypt.`,
          lang:'en', likes:12, dislikes:0, comments:3 },
        { id:2, author:'Egyptian Driver',  avatar:'👤', time:'1 day ago',
          text:`أهلاً بكم في مجتمع ${brandName}! شاركونا تجاربكم ومشاكلكم وأي نصيحة تفيد الأعضاء.`,
          lang:'ar', likes:8, dislikes:0, comments:2 },
        { id:3, author:'RevXChange Member',avatar:'👤', time:'2 days ago',
          text:`Looking for a trusted mechanic who specializes in ${brandName} in Cairo. Any recommendations? Prefer Heliopolis or Nasr City area.`,
          lang:'en', likes:5, dislikes:0, comments:1 },
    ];
}

// ─── State ──────────────────────────────────────────────────
const BRANDS_PER_PAGE = 16;
let currentPage    = 0;
let currentBrandId = null;
let currentSort    = 'top';
let filteredBrands = [...communityBrands];

// ─── Sort ────────────────────────────────────────────────────
function sortPosts(posts, sort) {
    const s = [...posts];
    switch (sort) {
        case 'top':          return s.sort((a,b) => b.likes - a.likes);
        case 'new':          return s.sort((a,b) => b.id - a.id);
        case 'trending':     return s.sort((a,b) => (b.likes + b.comments*2) - (a.likes + a.comments*2));
        case 'controversial':return s.sort((a,b) => b.dislikes - a.dislikes);
        default:             return s;
    }
}

// ─── Render: Brand Grid ──────────────────────────────────────
function renderBrandGrid() {
    const grid      = document.getElementById('commBrandsGrid');
    const indicator = document.getElementById('pageIndicator');
    const leftBtn   = document.getElementById('pageLeft');
    const rightBtn  = document.getElementById('pageRight');
    if (!grid) return;

    const totalPages = Math.max(1, Math.ceil(filteredBrands.length / BRANDS_PER_PAGE));
    const start      = currentPage * BRANDS_PER_PAGE;
    const pageItems  = filteredBrands.slice(start, start + BRANDS_PER_PAGE);

    grid.innerHTML = pageItems.length
        ? pageItems.map(brand => `
            <div class="comm-brand-card${currentBrandId === brand.id ? ' selected' : ''}"
                 onclick="loadCommunity('${brand.id}')">
                <img src="${brand.img}" alt="${brand.name}" onerror="this.style.opacity='0'">
                <h4>${brand.name}</h4>
                <span>${brand.members} members</span>
            </div>`).join('')
        : `<p style="color:var(--text-light);font-family:'Segoe UI',sans-serif;grid-column:1/-1;padding:40px 0;text-align:center;">No communities match your search.</p>`;

    if (indicator) indicator.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    if (leftBtn)   leftBtn.disabled   = currentPage === 0;
    if (rightBtn)  rightBtn.disabled  = currentPage >= totalPages - 1;
}

// ─── Render: Single Post ─────────────────────────────────────
function renderPost(post) {
    const dir = post.lang === 'ar' ? 'rtl' : 'ltr';
    return `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar">${post.avatar}</div>
                <div>
                    <div class="post-author">${post.author}</div>
                    <div class="post-time">${post.time}</div>
                </div>
            </div>
            <p class="post-body" dir="${dir}">${post.text}</p>
            <div class="post-actions">
                <button class="post-action-btn upvote" onclick="vote(this)">
                    ▲ <span class="vote-count">${post.likes}</span>
                </button>
                <button class="post-action-btn downvote" onclick="vote(this)">
                    ▼ <span class="vote-count">${post.dislikes}</span>
                </button>
                <button class="post-action-btn">💬 ${post.comments}</button>
                <button class="post-action-btn">↗ Share</button>
            </div>
        </div>`;
}

// ─── Load Community ──────────────────────────────────────────
function loadCommunity(brandId) {
    const brand = communityBrands.find(b => b.id === brandId);
    if (!brand) return;

    currentBrandId = brandId;
    renderBrandGrid();

    const feed       = document.getElementById('commFeed');
    const feedHeader = document.getElementById('commFeedHeader');
    const postsList  = document.getElementById('postsList');
    if (!feed || !feedHeader || !postsList) return;

    feedHeader.innerHTML = `
        <div class="comm-feed-identity">
            <img src="${brand.img}" alt="${brand.name}" class="comm-feed-logo" onerror="this.style.display='none'">
            <div>
                <div class="comm-feed-name">${brand.name} Community</div>
                <div class="comm-feed-members">${brand.members} members</div>
            </div>
        </div>
        <div class="comm-feed-actions">
            <button class="back-btn" onclick="closeFeed()">← Back</button>
            <button class="join-btn">Join Community</button>
        </div>`;

    currentSort = 'top';
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === 'top');
    });

    const raw    = communityPosts[brandId] || getGenericPosts(brand.name);
    const sorted = sortPosts(raw, currentSort);
    postsList.innerHTML = sorted.map(renderPost).join('');

    // Show with animation
    feed.style.display    = 'block';
    feed.style.animation  = 'none';
    void feed.offsetHeight;
    feed.style.animation  = 'feedSlideIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards';

    setTimeout(() => {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

// ─── Close Feed ──────────────────────────────────────────────
function closeFeed() {
    const feed = document.getElementById('commFeed');
    feed.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    feed.style.opacity    = '0';
    feed.style.transform  = 'translateY(12px)';
    setTimeout(() => {
        feed.style.display    = 'none';
        feed.style.opacity    = '';
        feed.style.transform  = '';
        feed.style.transition = '';
        feed.style.animation  = '';
    }, 240);
    currentBrandId = null;
    renderBrandGrid();
    document.querySelector('.comm-brands-section')
        .scrollIntoView({ behavior: 'smooth' });
}

// ─── Vote ────────────────────────────────────────────────────
function vote(btn) {
    const count   = btn.querySelector('.vote-count');
    const active  = btn.classList.contains('active');
    const current = parseInt(count.textContent.replace(',', '')) || 0;
    btn.classList.toggle('active', !active);
    count.textContent = active ? current - 1 : current + 1;
}

// ─── Sort Handler ────────────────────────────────────────────
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.sort-btn');
    if (!btn || !currentBrandId) return;

    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;

    const brand     = communityBrands.find(b => b.id === currentBrandId);
    const raw       = communityPosts[currentBrandId] || getGenericPosts(brand?.name || '');
    const sorted    = sortPosts(raw, currentSort);
    const postsList = document.getElementById('postsList');

    postsList.style.opacity   = '0';
    postsList.style.transform = 'translateY(8px)';
    setTimeout(() => {
        postsList.innerHTML        = sorted.map(renderPost).join('');
        postsList.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        postsList.style.opacity    = '1';
        postsList.style.transform  = 'translateY(0)';
    }, 150);
});

// ─── Search ──────────────────────────────────────────────────
document.getElementById('commSearch')?.addEventListener('input', function() {
    const q    = this.value.toLowerCase().trim();
    filteredBrands = q
        ? communityBrands.filter(b => b.name.toLowerCase().includes(q))
        : [...communityBrands];
    currentPage = 0;
    renderBrandGrid();
});

// ─── Pagination ──────────────────────────────────────────────
document.getElementById('pageLeft')?.addEventListener('click', () => {
    if (currentPage > 0) { currentPage--; renderBrandGrid(); }
});

document.getElementById('pageRight')?.addEventListener('click', () => {
    const total = Math.ceil(filteredBrands.length / BRANDS_PER_PAGE);
    if (currentPage < total - 1) { currentPage++; renderBrandGrid(); }
});

// ─── Init ────────────────────────────────────────────────────
renderBrandGrid();