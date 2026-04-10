// personalization.js — Personalized Homepage + Flash Sale + Loyalty + Style Quiz
import { allProducts } from './products.js?v=9';
import { showToast, navigateTo } from './ui.js';

// --- 1. PERSONALIZED HOMEPAGE ---

export function initPersonalization() {
    document.addEventListener('page:home', () => setTimeout(injectPersonalizedSections, 300));
    document.addEventListener('page:style-quiz', renderStyleQuiz);

    // Inject on first load if home is showing
    setTimeout(() => {
        if (document.getElementById('home-page')?.style.display !== 'none') {
            injectPersonalizedSections();
        }
    }, 500);
}

function injectPersonalizedSections() {
    const homePage = document.getElementById('home-page');
    if (!homePage) return;

    // Remove old injected sections
    homePage.querySelectorAll('.personalized-section').forEach(s => s.remove());

    const recent = JSON.parse(localStorage.getItem('intellishop_recent') || '[]');
    const wishlist = JSON.parse(localStorage.getItem('intellishop_wishlist') || '[]');
    const quizPrefs = JSON.parse(localStorage.getItem('intellishop_style_prefs') || 'null');

    // Determine preferred categories
    const catCounts = {};
    [...recent, ...wishlist].forEach(p => {
        if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    });
    const topCategories = Object.entries(catCounts).sort((a,b) => b[1]-a[1]).map(e => e[0]).slice(0, 2);

    const insertBefore = homePage.querySelector('.section:last-child') || homePage.querySelector('.section');

    // "RECOMMENDED FOR YOU" section
    if (topCategories.length > 0 || quizPrefs) {
        let recProducts;
        if (quizPrefs) {
            recProducts = allProducts.filter(p =>  
                (quizPrefs.style && p.title.toLowerCase().includes(quizPrefs.style.toLowerCase())) ||
                (quizPrefs.colors && p.colors.some(c => quizPrefs.colors.includes(c)))
            ).slice(0, 8);
        }
        if (!recProducts || recProducts.length < 4) {
            recProducts = allProducts.filter(p => topCategories.includes(p.category)).slice(0, 8);
        }
        if (recProducts.length >= 2) {
            injectSection(homePage, '✨ RECOMMENDED FOR YOU', recProducts, `Based on your browsing history`);
        }
    }

    // "BECAUSE YOU VIEWED" section
    if (recent.length >= 2) {
        const viewed = recent.slice(0, 4);
        const viewedCat = viewed[0].category;
        const moreLikeThis = allProducts.filter(p => p.category === viewedCat && !viewed.find(v => v.id === p.id)).slice(0, 4);
        if (moreLikeThis.length > 0) {
            injectSection(homePage, `🔄 BECAUSE YOU VIEWED "${viewed[0].title.slice(0,20)}"`, moreLikeThis);
        }
    }

    // "MOST WISHLISTED" section
    const wishlistCounts = {};
    allProducts.forEach(p => { wishlistCounts[p.id] = ((p.id * 3 + 7) % 50) + 5; }); // Deterministic
    const mostWishlisted = [...allProducts].sort((a,b) => wishlistCounts[b.id] - wishlistCounts[a.id]).slice(0, 4);
    injectSection(homePage, '❤️ MOST WISHLISTED', mostWishlisted, 'Top picks loved by our community');

    // "TOP RATED" section
    const topRated = [...allProducts].sort((a,b) => b.rating - a.rating).slice(0, 4);
    injectSection(homePage, '⭐ TOP RATED', topRated, 'Highest rated products on Intellishop');

    // Flash sale banner
    injectFlashSale(homePage);

    // Style quiz CTA for new users
    if (!quizPrefs && !recent.length) {
        injectQuizCTA(homePage);
    }
}

function injectSection(parent, title, products, subtitle = '') {
    const section = document.createElement('div');
    section.className = 'section personalized-section';
    section.style.marginTop = '40px';
    section.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
                <h2>${title}</h2>
                ${subtitle ? `<p style="font-size:12px;color:var(--muted);margin-top:2px;">${subtitle}</p>` : ''}
            </div>
        </div>
        <div class="cards" style="grid-template-columns:repeat(4,1fr);">
            ${products.map(p => `
                <div class="p-card" onclick="window.location.hash='#product-detail:${p.id}'" style="cursor:pointer;">
                    <div class="p-img"><img src="${p.image}" loading="lazy"></div>
                    <div class="p-body">
                        <div class="p-title">${p.title.slice(0,25)}..</div>
                        <div style="font-size:11px;color:var(--muted);">${p.brand} | ★ ${p.rating}</div>
                        <div style="font-weight:bold;color:var(--green);margin-top:5px;">₹${p.discountPriceInRupees}
                            <span style="text-decoration:line-through;color:#999;font-weight:400;font-size:11px;margin-left:4px;">₹${p.priceInRupees}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    // Insert before the last section (bottom promo grid)
    const lastSection = parent.querySelector('.section:last-of-type');
    if (lastSection) {
        lastSection.parentNode.insertBefore(section, lastSection);
    } else {
        parent.querySelector('.wrap')?.appendChild(section);
    }
}

// --- 2. FLASH SALE & COUNTDOWN TIMERS ---

function injectFlashSale(parent) {
    // Flash sale ends at midnight
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const timeLeft = endOfDay - now;

    // Pick 4 random products for flash sale
    const saleProducts = allProducts
        .filter(p => p.discountPriceInRupees > 500)
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

    saleProducts.forEach(p => p._flashSale = true);

    const section = document.createElement('div');
    section.className = 'section personalized-section';
    section.style.marginTop = '40px';
    section.innerHTML = `
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:18px;padding:20px;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                    <h2 style="color:#92400e;">⚡ FLASH SALE</h2>
                    <p style="font-size:13px;color:#b45309;">Limited time deals — extra discounts on select items!</p>
                </div>
                <div style="display:flex;gap:8px;" id="flashCountdown">
                    <div style="background:#92400e;color:#fff;padding:8px 12px;border-radius:8px;text-align:center;min-width:50px;">
                        <div style="font-size:20px;font-weight:900;" id="flashHours">00</div>
                        <div style="font-size:9px;">HOURS</div>
                    </div>
                    <div style="background:#92400e;color:#fff;padding:8px 12px;border-radius:8px;text-align:center;min-width:50px;">
                        <div style="font-size:20px;font-weight:900;" id="flashMins">00</div>
                        <div style="font-size:9px;">MINS</div>
                    </div>
                    <div style="background:#92400e;color:#fff;padding:8px 12px;border-radius:8px;text-align:center;min-width:50px;">
                        <div style="font-size:20px;font-weight:900;" id="flashSecs">00</div>
                        <div style="font-size:9px;">SECS</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="cards" style="grid-template-columns:repeat(4,1fr);">
            ${saleProducts.map(p => {
                const flashPrice = Math.round(p.discountPriceInRupees * 0.7); // Extra 30% off
                return `
                <div class="p-card" onclick="window.location.hash='#product-detail:${p.id}'" style="cursor:pointer;position:relative;">
                    <span style="position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:700;z-index:10;">⚡ FLASH DEAL</span>
                    <div class="p-img"><img src="${p.image}" loading="lazy"></div>
                    <div class="p-body">
                        <div class="p-title">${p.title.slice(0,25)}..</div>
                        <div style="font-weight:bold;color:#ef4444;margin-top:5px;">₹${flashPrice}
                            <span style="text-decoration:line-through;color:#999;font-weight:400;font-size:11px;margin-left:4px;">₹${p.priceInRupees}</span>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    const lastSection = parent.querySelector('.section:nth-of-type(2)');
    if (lastSection) {
        lastSection.parentNode.insertBefore(section, lastSection.nextSibling);
    }

    // Start countdown
    startCountdown(endOfDay);
}

function startCountdown(endTime) {
    function update() {
        const diff = endTime - Date.now();
        if (diff <= 0) return;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const hEl = document.getElementById('flashHours');
        const mEl = document.getElementById('flashMins');
        const sEl = document.getElementById('flashSecs');
        if (hEl) hEl.textContent = String(h).padStart(2, '0');
        if (mEl) mEl.textContent = String(m).padStart(2, '0');
        if (sEl) sEl.textContent = String(s).padStart(2, '0');
    }
    update();
    setInterval(update, 1000);
}

// --- 3. STYLE QUIZ ---

function injectQuizCTA(parent) {
    const cta = document.createElement('div');
    cta.className = 'section personalized-section';
    cta.style.marginTop = '40px';
    cta.innerHTML = `
        <div onclick="window.location.hash='#style-quiz'" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-radius:18px;padding:30px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h2 style="color:#5b21b6;">🎨 Discover Your Style</h2>
                <p style="font-size:14px;color:#7c3aed;margin-top:6px;">Take our quick style quiz and get personalized recommendations!</p>
            </div>
            <button class="btn" style="background:#7c3aed;color:#fff;border-color:#7c3aed;padding:12px 24px;font-size:14px;">Take Quiz →</button>
        </div>
    `;
    const insertPoint = parent.querySelector('.section:nth-of-type(3)');
    if (insertPoint) {
        insertPoint.parentNode.insertBefore(cta, insertPoint.nextSibling);
    }
}

let quizStep = 0;
const quizAnswers = {};

function renderStyleQuiz() {
    const container = document.getElementById('style-quiz-container');
    if (!container) return;

    const steps = [
        {
            question: "What's your go-to style?",
            options: ['Casual', 'Bohemian', 'Elegant', 'Minimalist', 'Streetwear', 'Vintage'],
            key: 'style'
        },
        {
            question: 'Which colors do you wear most?',
            options: ['Black', 'White', 'Blue', 'Red', 'Green', 'Pink'],
            key: 'colors',
            multi: true
        },
        {
            question: 'What occasion do you shop for most?',
            options: ['Everyday Casual', 'Office / Formal', 'Party / Night Out', 'Weekend Brunch', 'Travel', 'Workout'],
            key: 'occasion'
        },
        {
            question: "What's your typical budget per item?",
            options: ['Under ₹1,000', '₹1,000 - ₹3,000', '₹3,000 - ₹5,000', 'Above ₹5,000'],
            key: 'budget'
        }
    ];

    if (quizStep >= steps.length) {
        // Quiz complete — save preferences
        localStorage.setItem('intellishop_style_prefs', JSON.stringify(quizAnswers));
        container.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="font-size:64px;margin-bottom:16px;">🎉</div>
                <h2 style="margin-bottom:12px;">Your Style Profile is Ready!</h2>
                <p style="color:var(--muted);margin-bottom:20px;">We'll now personalize your homepage with picks matching your taste.</p>
                <div style="background:var(--green-2);border-radius:14px;padding:20px;display:inline-block;text-align:left;margin-bottom:20px;">
                    <p><strong>Style:</strong> ${quizAnswers.style}</p>
                    <p><strong>Colors:</strong> ${quizAnswers.colors?.join(', ')}</p>
                    <p><strong>Occasion:</strong> ${quizAnswers.occasion}</p>
                    <p><strong>Budget:</strong> ${quizAnswers.budget}</p>
                </div>
                <br>
                <button class="btn primary" onclick="window.location.hash='#home'" style="padding:12px 30px;font-size:14px;">Explore Your Picks →</button>
            </div>
        `;
        quizStep = 0;
        return;
    }

    const step = steps[quizStep];
    container.innerHTML = `
        <div style="max-width:500px;margin:0 auto;">
            <div style="display:flex;gap:6px;margin-bottom:20px;">
                ${steps.map((_, i) => `<div style="flex:1;height:4px;border-radius:2px;background:${i <= quizStep ? 'var(--green)' : '#e5e7eb'};"></div>`).join('')}
            </div>
            <p style="font-size:12px;color:var(--muted);margin-bottom:8px;">Step ${quizStep + 1} of ${steps.length}</p>
            <h2 style="margin-bottom:20px;">${step.question}</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${step.options.map(opt => `
                    <button onclick="window.quizAnswer('${step.key}', '${opt}', ${!!step.multi})" 
                        class="btn" style="padding:14px;font-size:13px;text-align:center;border-radius:12px;
                        ${quizAnswers[step.key] === opt || (Array.isArray(quizAnswers[step.key]) && quizAnswers[step.key]?.includes(opt)) ? 'background:var(--green);color:#fff;border-color:var(--green);' : ''}">
                        ${opt}
                    </button>
                `).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:24px;">
                ${quizStep > 0 ? `<button class="btn" onclick="window.quizBack()">← Back</button>` : '<div></div>'}
                <button class="btn primary" onclick="window.quizNext()" ${!quizAnswers[step.key] ? 'disabled style="opacity:0.5;cursor:not-allowed;padding:10px 20px;"' : 'style="padding:10px 20px;"'}>Next →</button>
            </div>
        </div>
    `;
}

window.quizAnswer = function(key, value, multi) {
    if (multi) {
        if (!quizAnswers[key]) quizAnswers[key] = [];
        const idx = quizAnswers[key].indexOf(value);
        if (idx !== -1) quizAnswers[key].splice(idx, 1);
        else quizAnswers[key].push(value);
    } else {
        quizAnswers[key] = value;
    }
    renderStyleQuiz(); // Re-render to highlight selection
};

window.quizNext = function() {
    quizStep++;
    renderStyleQuiz();
};

window.quizBack = function() {
    quizStep = Math.max(0, quizStep - 1);
    renderStyleQuiz();
};

// --- 4. LOYALTY PROGRAM ---

export function initLoyalty() {
    // Calculate points from order history on load
    updatePointsBalance();
}

function updatePointsBalance() {
    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    const reviews = Object.values(JSON.parse(localStorage.getItem('intellishop_reviews') || '{}')).flat();
    
    // 1 point per ₹10 spent
    const orderPoints = orders
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + Math.floor((o.amount || 0) / 10), 0);
    
    // 20 points per review
    const reviewPoints = reviews.length * 20;

    const redeemed = parseInt(localStorage.getItem('intellishop_points_redeemed') || '0');
    const totalEarned = orderPoints + reviewPoints;
    const available = Math.max(totalEarned - redeemed, 0);

    // Tier system
    let tier = 'Bronze';
    let tierColor = '#cd7f32';
    if (totalEarned >= 5000) { tier = 'Platinum'; tierColor = '#94a3b8'; }
    else if (totalEarned >= 2000) { tier = 'Gold'; tierColor = '#f59e0b'; }
    else if (totalEarned >= 500) { tier = 'Silver'; tierColor = '#9ca3af'; }

    localStorage.setItem('intellishop_points_data', JSON.stringify({
        earned: totalEarned,
        available,
        redeemed,
        tier,
        tierColor,
        orderPoints,
        reviewPoints
    }));
}

export function getLoyaltyData() {
    updatePointsBalance();
    return JSON.parse(localStorage.getItem('intellishop_points_data') || '{}');
}

export function redeemPoints(amount) {
    // 100 points = ₹50
    const pointsNeeded = Math.ceil(amount / 50) * 100;
    const data = getLoyaltyData();
    
    if (data.available < pointsNeeded) return false;

    const redeemed = parseInt(localStorage.getItem('intellishop_points_redeemed') || '0');
    localStorage.setItem('intellishop_points_redeemed', String(redeemed + pointsNeeded));
    updatePointsBalance();
    return true;
}
