(function () {
    // ── Skip login page ────────────────────────────────────────
    if (window.location.pathname.toLowerCase().includes('login')) return;

    // ── Remove any hardcoded FAB/panel from HTML ───────────────
    const existingFab   = document.getElementById('caraFab');
    const existingPanel = document.getElementById('caraPanel');
    if (existingFab)   existingFab.remove();
    if (existingPanel) existingPanel.remove();

    // ── Icon SVG ───────────────────────────────────────────────
    function iconSVG(size, color) {
        const c = color || 'currentColor';
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${c}" style="flex-shrink:0;">
            <path d="M12 2 L13.2 8.8 L20 10 L13.2 11.2 L12 18 L10.8 11.2 L4 10 L10.8 8.8 Z"/>
            <path d="M19 2 L19.6 4.4 L22 5 L19.6 5.6 L19 8 L18.4 5.6 L16 5 L18.4 4.4 Z" opacity="0.75"/>
            <path d="M20 14 L20.4 15.6 L22 16 L20.4 16.4 L20 18 L19.6 16.4 L18 16 L19.6 15.6 Z" opacity="0.55"/>
        </svg>`;
    }

    // ── Inject DOM ─────────────────────────────────────────────
    document.body.insertAdjacentHTML('beforeend', `
        <button class="cara-fab" id="caraFab" aria-label="Open Cara AI">
            <span class="cara-fab-spark"></span>
            <span class="cara-fab-spark"></span>
            <span class="cara-fab-spark"></span>
            <span class="cara-fab-spark"></span>
            <span class="cara-fab-spark"></span>
            <span class="cara-fab-spark"></span>
            <span class="cara-fab-icon">${iconSVG(20, '#e9d5ff')}</span>
            <span class="cara-fab-label">Ask Cara</span>
        </button>

        <div class="cara-panel cara-hidden" id="caraPanel">
            <div class="cara-header">
                <div class="cara-header-avatar">${iconSVG(18, '#ddd6fe')}</div>
                <div class="cara-header-info">
                    <div class="cara-header-name">Cara AI</div>
                    <div class="cara-header-status">
                        <span class="cara-status-dot"></span>
                        Online · Always ready
                    </div>
                </div>
                <button class="cara-header-close" id="caraClose">✕</button>
            </div>
            <div class="cara-messages" id="caraMessages"></div>
            <div class="cara-input-bar">
                <input class="cara-text-input" id="caraInput" type="text"
                    placeholder="Type in English or عربي..." autocomplete="off">
                <button class="cara-send-btn" id="caraSend">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `);

    // ── Wire up navbar Cara link if present ────────────────────
    const navBtn = document.getElementById('caraNavBtn');
    if (navBtn) {
        navBtn.addEventListener('click', (e) => {
            e.preventDefault();
            togglePanel();
        });
    }

    // ── DOM refs ───────────────────────────────────────────────
    const fab      = document.getElementById('caraFab');
    const panel    = document.getElementById('caraPanel');
    const closeBtn = document.getElementById('caraClose');
    const messages = document.getElementById('caraMessages');
    const input    = document.getElementById('caraInput');
    const sendBtn  = document.getElementById('caraSend');

    // ── State ──────────────────────────────────────────────────
    let isOpen  = false;
    let started = false;
    const ctx   = { brand: null, model: null };

    // ── Session persistence ────────────────────────────────────
    const SESSION_KEY  = 'caraMessages';
    const SESSION_OPEN = 'caraOpen';
    let messageLog = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]');

    function saveLog() {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(messageLog));
    }

    // ── Data ───────────────────────────────────────────────────
    const brands = {
        'Toyota':     ['Corolla', 'Camry', 'Yaris', 'RAV4', 'Hilux', 'Fortuner'],
        'Kia':        ['Sportage', 'Cerato', 'Picanto', 'Sorento', 'K5', 'Stinger'],
        'Hyundai':    ['Elantra', 'Tucson', 'Santa Fe', 'i10', 'i20', 'Sonata'],
        'Mercedes':   ['C200', 'E200', 'A200', 'GLC', 'CLA', 'GLA'],
        'BMW':        ['320i', '520i', 'X3', 'X5', '118i', 'X1'],
        'Nissan':     ['Sunny', 'Sentra', 'Qashqai', 'X-Trail', 'Patrol', 'Kicks'],
        'Chevrolet':  ['Cruze', 'Spark', 'Captiva', 'Aveo', 'Optra', 'Equinox'],
        'Honda':      ['Civic', 'Accord', 'CR-V', 'City', 'Jazz', 'HR-V'],
        'Mitsubishi': ['Lancer', 'Eclipse Cross', 'Outlander', 'L200', 'ASX', 'Pajero'],
        'Mazda':      ['Mazda 3', 'Mazda 6', 'CX-5', 'CX-30', 'CX-3', 'MX-5'],
        'Other':      ['My brand isn\'t listed'],
    };

    const quickActions = [
        { label: '🔧 My car broke down', flow: 'breakdown' },
        { label: '🔍 Help me find a car', flow: 'buy'       },
        { label: '🏷️ Price my car',        flow: 'sell'      },
        { label: '🔩 Find a mechanic',     flow: 'mechanic'  },
    ];

    const isSubpage = window.location.pathname.includes('/pages/');
    const root = isSubpage ? '../' : '';

    // ── Toggle ─────────────────────────────────────────────────
    function restoreSession() {
        // Find the last interactive element in the log
        let lastInteractiveIndex = -1;
        messageLog.forEach((msg, i) => {
            if (msg.type === 'chips' || msg.type === 'quickactions') {
                lastInteractiveIndex = i;
            }
        });

        messageLog.forEach((msg, i) => {
            if (msg.type === 'bubble') {
                // Render bubble without saving again
                const isAr = /[\u0600-\u06FF]/.test(msg.html);
                const dir  = isAr ? 'rtl' : 'ltr';
                const wrap = document.createElement('div');
                wrap.className = `cara-msg from-${msg.from}`;
                if (msg.from === 'cara') {
                    wrap.innerHTML = `
                        <div class="cara-msg-avatar">${iconSVG(13, '#ddd6fe')}</div>
                        <div class="cara-bubble" dir="${dir}">${msg.html}</div>`;
                } else {
                    wrap.innerHTML = `<div class="cara-bubble" dir="${dir}">${msg.html}</div>`;
                }
                messages.appendChild(wrap);
            } else if (i === lastInteractiveIndex) {
                // Only re-render the LAST set of chips/actions so user can still interact
                if (msg.type === 'quickactions') {
                    addQuickActions();
                } else if (msg.type === 'chips' && msg.items) {
                    addChips(msg.items, async (choice) => {
                        await speak('Let me help with that.', 600);
                        addQuickActions();
                    });
                }
            }
        });

        scroll();
    }

    function openPanel() {
        panel.classList.remove('cara-hidden');
        isOpen = true;
        sessionStorage.setItem(SESSION_OPEN, 'true');
        if (!started) {
            started = true;
            if (messageLog.length > 0) {
                restoreSession();
            } else {
                startConversation();
            }
        }
        setTimeout(() => input.focus(), 100);
    }

    function closePanel() {
        panel.classList.add('cara-hidden');
        isOpen = false;
        sessionStorage.removeItem(SESSION_OPEN);
        // Do NOT clear messageLog here — keep history for the session
    }

    function togglePanel() { isOpen ? closePanel() : openPanel(); }

    fab.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', closePanel);

    let suppressClose = false;

    document.addEventListener('click', (e) => {
        if (suppressClose) { suppressClose = false; return; }
        if (e.target.closest('a[href]')) return;
        if (isOpen && !panel.contains(e.target) && !fab.contains(e.target) &&
            (!navBtn || !navBtn.contains(e.target))) {
            closePanel();
        }
    });

    // ── Message builders ───────────────────────────────────────
    function addBubble(html, from) {
        const isAr = /[\u0600-\u06FF]/.test(html);
        const dir  = isAr ? 'rtl' : 'ltr';
        const wrap = document.createElement('div');
        wrap.className = `cara-msg from-${from}`;

        if (from === 'cara') {
            wrap.innerHTML = `
                <div class="cara-msg-avatar">${iconSVG(13, '#ddd6fe')}</div>
                <div class="cara-bubble" dir="${dir}">${html}</div>`;
        } else {
            wrap.innerHTML = `<div class="cara-bubble" dir="${dir}">${html}</div>`;
        }

        messages.appendChild(wrap);
        messageLog.push({ type: 'bubble', html, from });
        saveLog();
        scroll();
    }

    function addTyping() {
        const wrap = document.createElement('div');
        wrap.className = 'cara-msg from-cara';
        wrap.id = 'caraTyping';
        wrap.innerHTML = `
            <div class="cara-msg-avatar">${iconSVG(13, '#ddd6fe')}</div>
            <div class="cara-typing">
                <span class="cara-typing-dot"></span>
                <span class="cara-typing-dot"></span>
                <span class="cara-typing-dot"></span>
            </div>`;
        messages.appendChild(wrap);
        scroll();
    }

    function removeTyping() {
        const el = document.getElementById('caraTyping');
        if (el) el.remove();
    }

    function addChips(items, onPick) {
        const wrap = document.createElement('div');
        wrap.className = 'cara-msg from-cara';
        wrap.innerHTML = `
            <div class="cara-msg-avatar">${iconSVG(13, '#ddd6fe')}</div>
            <div class="cara-bubble" style="background:transparent;border:none;padding:4px 0 0;">
                <div class="cara-chips">
                    ${items.map(item => {
                        const label = typeof item === 'object' ? item.label : item;
                        return `<button class="cara-chip-btn">${label}</button>`;
                    }).join('')}
                </div>
            </div>`;
        messages.appendChild(wrap);
        scroll();

        messageLog.push({ type: 'chips', items: items.map(i => typeof i === 'object' ? i.label : i) });
        saveLog();

        wrap.querySelectorAll('.cara-chip-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                suppressClose = true;
                const picked = items[i];
                const label  = typeof picked === 'object' ? picked.label : picked;
                wrap.remove();
                addBubble(label, 'user');
                onPick(picked, label);
            });
        });
    }

    function addQuickActions() {
        const wrap = document.createElement('div');
        wrap.className = 'cara-msg from-cara';
        wrap.innerHTML = `
            <div class="cara-msg-avatar">${iconSVG(13, '#ddd6fe')}</div>
            <div class="cara-bubble" style="background:transparent;border:none;padding:4px 0 0;">
                <div class="cara-quick-actions">
                    ${quickActions.map(a => `<button class="cara-quick-btn">${a.label}</button>`).join('')}
                </div>
            </div>`;
        messages.appendChild(wrap);
        scroll();

        messageLog.push({ type: 'quickactions' });
        saveLog();

        wrap.querySelectorAll('.cara-quick-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                suppressClose = true;
                wrap.remove();
                addBubble(quickActions[i].label, 'user');
                runFlow(quickActions[i].flow);
            });
        });
    }

    function scroll() {
        setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 30);
    }

    // ── Cara speaks with typing delay ──────────────────────────
    function speak(html, delay) {
        delay = delay || 750;
        return new Promise(resolve => {
            addTyping();
            setTimeout(() => {
                removeTyping();
                addBubble(html, 'cara');
                resolve();
            }, delay);
        });
    }

    // ── Greeting ───────────────────────────────────────────────
    async function startConversation() {
        await speak('Hello! I\'m <strong>Cara</strong> ✨ — RevXChange\'s AI assistant.<br>How can I help you today?', 950);
        addQuickActions();
    }

    // ── Flow router ────────────────────────────────────────────
    function runFlow(flow) {
        switch (flow) {
            case 'breakdown': flowBreakdown(); break;
            case 'buy':       flowBuy();       break;
            case 'sell':      flowSell();      break;
            case 'mechanic':  flowMechanic();  break;
        }
    }

    // ── Brand → Model picker ───────────────────────────────────
    function pickBrandModel(onDone) {
        addChips(Object.keys(brands), async (brand) => {
            ctx.brand = (brand === 'Other') ? 'your car' : brand;
            await speak(`Got it — a <strong>${ctx.brand}</strong>. Which model?`, 650);
            const models = brands[brand] || ['Other'];
            addChips(models, async (model) => {
                ctx.model = model;
                onDone(ctx.brand, ctx.model);
            });
        });
    }

    // ── Restart prompt ─────────────────────────────────────────
    async function askAnythingElse() {
        await speak('Is there anything else I can help with?', 500);
        addChips(['Yes, ask something else', 'No thanks'], async (choice) => {
            if (choice === 'Yes, ask something else') {
                await speak('Of course! What else can I help you with?', 550);
                addQuickActions();
            } else {
                await speak('Happy to help anytime. Have a great day! 👋', 600);
            }
        });
    }

    // ── Flow: Breakdown ────────────────────────────────────────
    async function flowBreakdown() {
        await speak('I\'m here to help. <strong>What brand is your car?</strong>', 800);
        pickBrandModel(async (brand, model) => {
            await speak(`A <strong>${brand} ${model}</strong>. What\'s the issue?`, 700);
            addChips(
                ['Engine won\'t start', 'Strange noise', 'AC / Cooling problem',
                 'Electrical issue', 'Brakes problem', 'Other issue'],
                async (issue) => {
                    await speak(
                        `Understood. Here\'s what I recommend for a <em>${issue.toLowerCase()}</em> on your <strong>${brand} ${model}</strong>:<br><br>
                        <strong>1.</strong> Don\'t drive it if the engine is involved.<br>
                        <strong>2.</strong> Visit a trusted specialist, not a random garage.<br>
                        <strong>3.</strong> Post in the <a href="${root}pages/communities.html"><strong>${brand} community</strong></a> — real owners have likely seen this.`,
                        1300
                    );
                    addChips(['Find a mechanic', 'Go to community', 'That helps, thanks'], async (choice) => {
                        if (choice === 'Find a mechanic')      flowMechanic();
                        else if (choice === 'Go to community') {
                            await speak(`Head to our <a href="${root}pages/communities.html"><strong>Car Communities</strong></a> page, select the ${brand} community, and post your issue. 🙌`, 800);
                            askAnythingElse();
                        } else { askAnythingElse(); }
                    });
                }
            );
        });
    }

    // ── Flow: Buy ──────────────────────────────────────────────
    async function flowBuy() {
        await speak('Let\'s find you the perfect car! <strong>What\'s your budget?</strong>', 800);
        addChips(
            ['Under 300K EGP', '300K – 600K EGP', '600K – 1M EGP', '1M – 2M EGP', 'Above 2M EGP'],
            async (budget) => {
                await speak('What type of car are you looking for?', 650);
                addChips(['Sedan', 'SUV', 'Pickup', 'Hatchback', 'No preference'], async (type) => {
                    await speak(
                        `For a <strong>${type}</strong> in the <strong>${budget}</strong> range, browse our listings:<br><br>
                        📋 <a href="${root}pages/used-cars.html"><strong>Browse Used Cars</strong></a><br>
                        🆕 <a href="${root}pages/buy-cars.html"><strong>Browse New Cars</strong></a><br><br>
                        Use the filters to narrow by brand, model, city, and mileage.`,
                        1100
                    );
                    askAnythingElse();
                });
            }
        );
    }

    // ── Flow: Sell ─────────────────────────────────────────────
    async function flowSell() {
        await speak('I\'ll help you list your car! <strong>What brand is it?</strong>', 800);
        pickBrandModel(async (brand, model) => {
            await speak(`What year is your <strong>${brand} ${model}</strong>?`, 700);
            addChips(['2022 or newer', '2019 – 2021', '2016 – 2018', '2012 – 2015', 'Before 2012'], async (year) => {
                await speak(
                    `For a <strong>${year} ${brand} ${model}</strong>, similar listings in Egypt are getting strong interest right now.<br><br>
                    To list yours, click <strong>+ Sell My Car</strong> in the navbar — it takes under 2 minutes. 🚗`,
                    1100
                );
                askAnythingElse();
            });
        });
    }

    // ── Flow: Mechanic ─────────────────────────────────────────
    async function flowMechanic() {
        await speak('I\'ll help you find a trusted mechanic. <strong>Which city are you in?</strong>', 800);
        addChips(['Cairo', 'Alexandria', 'Giza', 'Mansoura', 'Hurghada', 'Other city'], async (city) => {
            await speak(
                `For a trusted mechanic in <strong>${city}</strong>, the best source is our <a href="${root}pages/communities.html"><strong>Car Communities</strong></a> — local owners share verified workshops regularly.<br><br>
                Search by your car model's community and look for pinned mechanic recommendations. 🔧`,
                1050
            );
            askAnythingElse();
        });
    }

    // ── Text input handler ─────────────────────────────────────
    async function handleInput() {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        addBubble(text, 'user');

        const lower = text.toLowerCase();

        if (/broke|breakdown|broken|noise|issue|problem|won.t start|مشكلة|عطل|صوت/.test(lower)) {
            await speak('Let\'s diagnose that. 🔧', 650);
            flowBreakdown();
        } else if (/buy|find|looking|search|want|need a car|أشتري|عايز|دور|ابحث/.test(lower)) {
            await speak('Let\'s find you the perfect car! 🔍', 600);
            flowBuy();
        } else if (/sell|price|value|list|بيع|سعر|اعرض/.test(lower)) {
            await speak('Let\'s get your car listed! 🏷️', 600);
            flowSell();
        } else if (/mechanic|garage|repair|workshop|ميكانيكي|ورشة|صيانة/.test(lower)) {
            await speak('I\'ll help you find the right mechanic!', 600);
            flowMechanic();
        } else {
            await speak(
                `I heard you — but I\'m still learning to understand free text perfectly.<br>
                Let me show you what I can help with:`,
                900
            );
            addQuickActions();
        }
    }

    sendBtn.addEventListener('click', handleInput);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleInput(); });

    // ── Restore open state on page load ────────────────────────
    if (sessionStorage.getItem(SESSION_OPEN) === 'true') {
        openPanel();
    }

})();