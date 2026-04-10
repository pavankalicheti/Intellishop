// products.js
import { fetchProducts, searchProducts, categories } from './api.js?v=9';
import { showToast, navigateTo } from './ui.js';
import { addToCart } from './cart.js';
import { toggleWishlist, isInWishlist } from './wishlist.js';

export let allProducts = [];
let currentProducts = [];

export async function initProducts() {
    allProducts = await fetchProducts();
    currentProducts = [...allProducts];
    
    document.addEventListener('page:products', (e) => {
        const query = e.detail?.id;
        if (query) {
            // Check if it's a search vs category
            if (query.startsWith('search=')) {
                const term = query.split('=')[1];
                currentProducts = searchProducts(term);
            } else if (query.startsWith('brand=')) {
                const brand = decodeURIComponent(query.split('=')[1]);
                currentProducts = allProducts.filter(p => p.brand === brand);
            } else {
                currentProducts = allProducts.filter(p => p.category.includes(query) || p.title.toLowerCase().includes(query.toLowerCase()));
            }
        } else {
            currentProducts = [...allProducts];
        }
        renderProductsPage();
    });

    document.addEventListener('page:product-detail', (e) => renderProductDetail(e.detail.id));
    document.addEventListener('page:brand', (e) => renderBrandPage(e.detail.id));
    document.addEventListener('page:collections', renderCollectionsPage);
    
    // Attach Search Listener — Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                closeAutocomplete();
                window.location.hash = '#products:search=' + e.target.value.trim();
            }
        });

        // ─── AUTOCOMPLETE: live search suggestions ───
        let debounceTimer = null;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value.trim();
            if (val.length < 2) { closeAutocomplete(); return; }
            debounceTimer = setTimeout(() => showAutocomplete(val), 150);
        });

        searchInput.addEventListener('blur', () => setTimeout(closeAutocomplete, 200));
    }
}

// --- AUTOCOMPLETE DROPDOWN ---

function showAutocomplete(query) {
    const results = searchProducts(query).slice(0, 6);
    const catMatches = categories.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
    
    let dropdown = document.getElementById('searchDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchDropdown';
        dropdown.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:999;max-height:380px;overflow-y:auto;';
        const searchBox = document.querySelector('.search-box');
        searchBox.style.position = 'relative';
        searchBox.appendChild(dropdown);
    }

    let html = '';
    
    // Category suggestions
    if (catMatches.length > 0) {
        html += `<div style="padding:8px 14px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Categories</div>`;
        html += catMatches.map(c => `
            <div onclick="window.location.hash='#products:${c}'" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;border-bottom:1px solid #f3f4f6;" onmouseenter="this.style.background='#f7faf9'" onmouseleave="this.style.background='#fff'">
                <i class="fa-solid fa-tag" style="color:var(--green);font-size:11px;"></i> ${c}
            </div>
        `).join('');
    }

    // Product suggestions
    if (results.length > 0) {
        html += `<div style="padding:8px 14px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Products</div>`;
        html += results.map(p => `
            <div onclick="window.location.hash='#product-detail:${p.id}'" style="padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;font-size:13px;border-bottom:1px solid #f3f4f6;" onmouseenter="this.style.background='#f7faf9'" onmouseleave="this.style.background='#fff'">
                <img src="${p.image}" style="width:36px;height:36px;object-fit:contain;border-radius:6px;background:#f7faf9;">
                <div style="flex:1;">
                    <div style="font-weight:600;">${p.title.slice(0,35)}</div>
                    <div style="font-size:11px;color:var(--muted);">${p.brand} · ₹${p.discountPriceInRupees}</div>
                </div>
            </div>
        `).join('');
    }

    if (!html) html = `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px;">No results for "${query}"</div>`;

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

function closeAutocomplete() {
    const d = document.getElementById('searchDropdown');
    if (d) d.style.display = 'none';
}

// --- PRODUCT LISTING + ENHANCED FILTERS ---

function renderProductsPage() {
    const grid = document.getElementById('products-grid');
    const filters = document.getElementById('products-filters');
    if (!grid || !filters) return;

    // Extract unique values for filters
    const allBrands = [...new Set(allProducts.map(p => p.brand))].sort();
    const allSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const allColors = ['Red', 'Blue', 'Black', 'White', 'Green', 'Pink'];

    filters.innerHTML = `
        <select id="sortSelect" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
            <option value="default">Sort by</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rating</option>
            <option value="newest">Newest First</option>
        </select>
        <select id="catSelect" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <select id="brandSelect" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
            <option value="all">All Brands</option>
            ${allBrands.map(b => `<option value="${b}">${b}</option>`).join('')}
        </select>
        <select id="sizeSelect" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
            <option value="all">All Sizes</option>
            ${allSizes.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <select id="colorSelect" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
            <option value="all">All Colors</option>
            ${allColors.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <div style="display:flex; align-items:center; gap:6px;">
            <input id="priceMin" type="number" placeholder="Min ₹" min="0" style="width:80px; padding:8px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
            <span style="color:var(--muted);">–</span>
            <input id="priceMax" type="number" placeholder="Max ₹" min="0" style="width:80px; padding:8px; border-radius:8px; border:1px solid var(--border); font-size:12px;">
        </div>
        <button id="clearFilters" class="btn" style="font-size:11px; padding:8px 14px;">Clear All</button>
    `;

    // Attach filter listeners
    document.getElementById('sortSelect').addEventListener('change', applyAllFilters);
    document.getElementById('catSelect').addEventListener('change', applyAllFilters);
    document.getElementById('brandSelect').addEventListener('change', applyAllFilters);
    document.getElementById('sizeSelect').addEventListener('change', applyAllFilters);
    document.getElementById('colorSelect').addEventListener('change', applyAllFilters);
    document.getElementById('priceMin').addEventListener('input', applyAllFilters);
    document.getElementById('priceMax').addEventListener('input', applyAllFilters);
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('sortSelect').value = 'default';
        document.getElementById('catSelect').value = 'all';
        document.getElementById('brandSelect').value = 'all';
        document.getElementById('sizeSelect').value = 'all';
        document.getElementById('colorSelect').value = 'all';
        document.getElementById('priceMin').value = '';
        document.getElementById('priceMax').value = '';
        currentProducts = [...allProducts];
        renderGrid(currentProducts);
    });

    renderGrid(currentProducts);
}

function applyAllFilters() {
    let filtered = [...allProducts];

    const cat = document.getElementById('catSelect')?.value;
    const brand = document.getElementById('brandSelect')?.value;
    const size = document.getElementById('sizeSelect')?.value;
    const color = document.getElementById('colorSelect')?.value;
    const minP = parseInt(document.getElementById('priceMin')?.value) || 0;
    const maxP = parseInt(document.getElementById('priceMax')?.value) || Infinity;
    const sort = document.getElementById('sortSelect')?.value;

    if (cat && cat !== 'all') filtered = filtered.filter(p => p.category === cat);
    if (brand && brand !== 'all') filtered = filtered.filter(p => p.brand === brand);
    if (size && size !== 'all') filtered = filtered.filter(p => p.sizes.includes(size));
    if (color && color !== 'all') filtered = filtered.filter(p => p.colors.includes(color));
    filtered = filtered.filter(p => p.discountPriceInRupees >= minP && p.discountPriceInRupees <= maxP);

    if (sort === 'price-low') filtered.sort((a,b) => a.discountPriceInRupees - b.discountPriceInRupees);
    else if (sort === 'price-high') filtered.sort((a,b) => b.discountPriceInRupees - a.discountPriceInRupees);
    else if (sort === 'rating') filtered.sort((a,b) => b.rating - a.rating);
    else if (sort === 'newest') filtered.sort((a,b) => b.id - a.id);

    currentProducts = filtered;
    renderGrid(filtered);
}

function renderGrid(products) {
    const grid = document.getElementById('products-grid');
    if (!products.length) {
        grid.innerHTML = '<p style="padding:20px;text-align:center;color:var(--muted);">No products match your filters. Try adjusting or clearing filters.</p>';
        return;
    }
    
    grid.innerHTML = products.map(p => `
        <div class="p-card" style="position:relative;">
            <button class="wishlist-btn" onclick="window.toggleWishlistLocal(${p.id}, event)" style="position:absolute; top:10px; right:10px; background:#fff; border-radius:50%; width:30px; height:30px; border:1px solid #ddd; z-index:10; cursor:pointer; color: ${isInWishlist(p.id) ? 'red' : '#999'};">
                <i class="fa-${isInWishlist(p.id) ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            ${p._flashSale ? `<span style="position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:700;z-index:10;">⚡ FLASH</span>` : ''}
            <div class="p-img" onclick="window.location.hash='#product-detail:${p.id}'" style="cursor:pointer;"><img src="${p.image}" loading="lazy"></div>
            <div class="p-body">
                <div class="p-title">${p.title.slice(0,30)}..</div>
                <div style="font-size:11px; color:var(--muted);">${p.brand} | ★ ${p.rating}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <div>
                        <span style="font-weight:bold; color:var(--green);">₹${p.discountPriceInRupees}</span>
                        <span style="text-decoration:line-through; font-size:11px; color:#999;">₹${p.priceInRupees}</span>
                    </div>
                    <button class="mini-btn" onclick="window.addToCartLocal(${p.id}, event)">Add</button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- PRODUCT DETAIL PAGE (with Size Chart + Reviews) ---

function renderProductDetail(id) {
    const p = allProducts.find(x => x.id == id);
    if (!p) {
        navigateTo('home');
        return;
    }
    
    // Track recently viewed
    let recent = JSON.parse(localStorage.getItem('intellishop_recent') || '[]');
    recent = recent.filter(r => r.id !== p.id);
    recent.unshift(p);
    localStorage.setItem('intellishop_recent', JSON.stringify(recent.slice(0, 10)));

    // Increment view count (for social proof)
    const views = JSON.parse(localStorage.getItem('intellishop_views') || '{}');
    views[p.id] = (views[p.id] || 0) + 1;
    localStorage.setItem('intellishop_views', JSON.stringify(views));

    // Social proof: simulated viewers
    const liveViewers = ((p.id * 7 + 13) % 80) + 5; // Deterministic but varied

    const container = document.getElementById('product-detail-container');
    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
            <div>
                <img src="${p.image}" style="width:100%; border-radius:14px; border:1px solid var(--border);" id="mainProductImg">
                ${p.images && p.images.length > 1 ? `
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        ${p.images.map((img, i) => `
                            <img src="${img}" onclick="document.getElementById('mainProductImg').src='${img}'" 
                                 style="width:60px;height:60px;object-fit:contain;border-radius:8px;border:1px solid var(--border);cursor:pointer;background:#f7faf9;">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:1px; cursor:pointer;" onclick="window.location.hash='#brand:${encodeURIComponent(p.brand)}'">${p.brand} →</div>
                    <div style="background:#fff3cd; color:#856404; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; animation: pulse 2s infinite;">
                        🔥 ${liveViewers} people viewing this now
                    </div>
                </div>
                <h2 style="margin: 5px 0 15px;">${p.title}</h2>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                    <span style="background:var(--green); color:#fff; padding:2px 8px; border-radius:6px; font-weight:bold; font-size:12px;">${p.rating} ★</span>
                    <span style="color:var(--muted); font-size:12px;">${p.reviewCount} Ratings</span>
                </div>
                
                <h3 style="color:var(--green); font-size:24px; margin-bottom:5px;">₹${p.discountPriceInRupees}</h3>
                <p style="color:#999; text-decoration:line-through;">MRP ₹${p.priceInRupees}</p>
                <p style="color:red; font-size:12px; font-weight:bold; margin-bottom: 20px;">( ${p.discountPercentage || Math.round((1 - p.discountPriceInRupees/p.priceInRupees)*100)}% OFF )</p>
                
                <div style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>Select Size</strong>
                        <button onclick="window.showSizeChart()" style="background:none; border:none; color:var(--green); cursor:pointer; font-size:12px; font-weight:600;">📐 Size Chart</button>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:8px;" id="sizeSelector">
                        ${p.sizes.map((s, i) => `<div class="size-opt ${i===0?'size-active':''}" onclick="window.selectSize(this)" style="border:1px solid ${i===0?'var(--green)':'#ccc'}; padding:8px 12px; border-radius:50%; font-size:12px; font-weight:bold; cursor:pointer; background:${i===0?'var(--green-2)':'#fff'};">${s}</div>`).join('')}
                    </div>
                    <button onclick="window.showSizeRecommender()" style="background:none; border:none; color:#7c3aed; cursor:pointer; font-size:11px; margin-top:8px; font-weight:600;">🤖 Find my size →</button>
                </div>

                <div style="margin-bottom:25px;">
                    <strong>Select Color</strong>
                    <div style="display:flex; gap:10px; margin-top:8px;">
                        ${p.colors.map(c => `<div style="background:${c.toLowerCase()}; width:30px; height:30px; border-radius:50%; border:2px solid #ddd; cursor:pointer;" title="${c}"></div>`).join('')}
                    </div>
                </div>

                <div style="display:flex; gap:15px;">
                    <button class="btn primary" style="flex:1; padding:15px; font-size:16px;" onclick="window.addToCartLocal(${p.id}, event)"><i class="fa-solid fa-cart-shopping"></i> ADD TO CART</button>
                    <button class="btn" style="flex:1; padding:15px; font-size:16px;" onclick="window.toggleWishlistLocal(${p.id}, event)"><i class="fa-regular fa-heart"></i> WISHLIST</button>
                </div>

                <div style="margin-top:30px;">
                    <h4>Product Details</h4>
                    <p style="font-size:14px; color:#555; line-height:1.6; margin-top:10px;">${p.description}</p>
                </div>
            </div>
        </div>

        <!-- USER REVIEWS SECTION -->
        <div style="margin-top:30px; border-top:1px solid var(--border); padding-top:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Customer Reviews</h3>
                <button class="btn primary" onclick="window.showReviewForm(${p.id})" style="font-size:12px; padding:8px 16px;">✍️ Write a Review</button>
            </div>
            <div id="reviewFormContainer"></div>
            <div id="reviewsList" style="margin-top:15px;"></div>
        </div>
    `;

    renderReviews(p.id);
    renderReviewsChart(p.rating);
}

// --- SIZE CHART MODAL ---

window.showSizeChart = function() {
    let modal = document.getElementById('sizeChartModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sizeChartModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1200;display:flex;align-items:center;justify-content:center;';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px;max-width:520px;width:95%;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3>📐 Size Chart</h3>
                <button onclick="document.getElementById('sizeChartModal').style.display='none'" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:var(--green-2);">
                        <th style="border:1px solid var(--border);padding:10px;text-align:left;">Size</th>
                        <th style="border:1px solid var(--border);padding:10px;">Chest (in)</th>
                        <th style="border:1px solid var(--border);padding:10px;">Waist (in)</th>
                        <th style="border:1px solid var(--border);padding:10px;">Hip (in)</th>
                        <th style="border:1px solid var(--border);padding:10px;">Length (in)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border:1px solid var(--border);padding:8px;font-weight:bold;">S</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">34-36</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">28-30</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">36-38</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">26</td></tr>
                    <tr><td style="border:1px solid var(--border);padding:8px;font-weight:bold;">M</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">38-40</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">30-32</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">38-40</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">27</td></tr>
                    <tr><td style="border:1px solid var(--border);padding:8px;font-weight:bold;">L</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">40-42</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">32-34</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">40-42</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">28</td></tr>
                    <tr><td style="border:1px solid var(--border);padding:8px;font-weight:bold;">XL</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">42-44</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">34-36</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">42-44</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">29</td></tr>
                    <tr><td style="border:1px solid var(--border);padding:8px;font-weight:bold;">XXL</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">44-46</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">36-38</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">44-46</td><td style="border:1px solid var(--border);padding:8px;text-align:center;">30</td></tr>
                </tbody>
            </table>
            <p style="font-size:11px;color:var(--muted);margin-top:12px;">Tip: If between sizes, order the larger size for a relaxed fit.</p>
        </div>
    `;
    modal.style.display = 'flex';
};

// --- SIZE RECOMMENDATION HELPER ---

window.showSizeRecommender = function() {
    let modal = document.getElementById('sizeRecommendModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sizeRecommendModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1200;display:flex;align-items:center;justify-content:center;';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:95%;">
            <h3 style="margin-bottom:16px;">🤖 Find Your Perfect Size</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="font-size:12px;font-weight:bold;">Height (cm)</label>
                    <input id="srHeight" type="number" placeholder="e.g. 170" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-top:4px;">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:bold;">Weight (kg)</label>
                    <input id="srWeight" type="number" placeholder="e.g. 65" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-top:4px;">
                </div>
                <div>
                    <label style="font-size:12px;font-weight:bold;">Body Type</label>
                    <select id="srBody" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-top:4px;">
                        <option value="slim">Slim</option>
                        <option value="regular" selected>Regular</option>
                        <option value="broad">Broad / Muscular</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;font-weight:bold;">Preferred Fit</label>
                    <select id="srFit" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-top:4px;">
                        <option value="tight">Tight / Fitted</option>
                        <option value="regular" selected>Regular</option>
                        <option value="relaxed">Relaxed / Loose</option>
                    </select>
                </div>
                <button class="btn primary" onclick="window.calcSizeRec()" style="padding:12px;margin-top:8px;">Get My Size</button>
                <div id="sizeRecResult"></div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
};

window.calcSizeRec = function() {
    const h = parseInt(document.getElementById('srHeight')?.value) || 170;
    const w = parseInt(document.getElementById('srWeight')?.value) || 65;
    const body = document.getElementById('srBody')?.value || 'regular';
    const fit = document.getElementById('srFit')?.value || 'regular';

    const bmi = w / ((h/100) ** 2);
    let size = 'M';

    if (bmi < 18.5) size = 'S';
    else if (bmi < 22) size = 'M';
    else if (bmi < 26) size = 'L';
    else if (bmi < 30) size = 'XL';
    else size = 'XXL';

    // Adjust for body type
    if (body === 'broad' && size !== 'XXL') {
        const sizes = ['S','M','L','XL','XXL'];
        size = sizes[Math.min(sizes.indexOf(size) + 1, 4)];
    }
    if (body === 'slim' && size !== 'S') {
        const sizes = ['S','M','L','XL','XXL'];
        size = sizes[Math.max(sizes.indexOf(size) - 1, 0)];
    }

    // Adjust for fit preference
    if (fit === 'relaxed' && size !== 'XXL') {
        const sizes = ['S','M','L','XL','XXL'];
        size = sizes[Math.min(sizes.indexOf(size) + 1, 4)];
    }
    if (fit === 'tight' && size !== 'S') {
        const sizes = ['S','M','L','XL','XXL'];
        size = sizes[Math.max(sizes.indexOf(size) - 1, 0)];
    }

    document.getElementById('sizeRecResult').innerHTML = `
        <div style="background:var(--green-2);border:1px solid var(--green-3);border-radius:12px;padding:14px;text-align:center;margin-top:8px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">RECOMMENDED SIZE</div>
            <div style="font-size:32px;font-weight:900;color:var(--green);">${size}</div>
            <p style="font-size:11px;color:var(--muted);margin-top:6px;">Based on ${h}cm, ${w}kg, ${body} build, ${fit} fit</p>
        </div>
    `;

    // Highlight recommended size in selector
    document.querySelectorAll('#sizeSelector .size-opt').forEach(el => {
        if (el.textContent.trim() === size) {
            el.style.border = '2px solid var(--green)';
            el.style.background = 'var(--green-2)';
            el.style.boxShadow = '0 0 0 3px rgba(27,127,75,0.2)';
        }
    });
};

window.selectSize = function(el) {
    document.querySelectorAll('#sizeSelector .size-opt').forEach(s => {
        s.style.border = '1px solid #ccc';
        s.style.background = '#fff';
        s.style.boxShadow = 'none';
        s.classList.remove('size-active');
    });
    el.style.border = '1px solid var(--green)';
    el.style.background = 'var(--green-2)';
    el.classList.add('size-active');
};

// --- USER REVIEWS SYSTEM ---

window.showReviewForm = function(productId) {
    const container = document.getElementById('reviewFormContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="background:#f7faf9;border:1px solid var(--border);border-radius:14px;padding:16px;margin-top:12px;">
            <div style="margin-bottom:12px;">
                <label style="font-size:12px;font-weight:bold;">Rating</label>
                <div id="starPicker" style="display:flex;gap:4px;margin-top:4px;">
                    ${[1,2,3,4,5].map(s => `<span onclick="window.pickStar(${s})" style="font-size:24px;cursor:pointer;color:#ddd;" data-star="${s}">★</span>`).join('')}
                </div>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:12px;font-weight:bold;">Your Review</label>
                <textarea id="reviewText" rows="3" placeholder="Share your experience with this product..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-top:4px;resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:12px;font-weight:bold;">Add Photos (Optional)</label>
                <div class="photo-upload-area" onclick="document.getElementById('reviewPhotoInput').click()">
                    📷 Click to upload images
                </div>
                <input type="file" id="reviewPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.handleReviewPhoto()">
                <div id="reviewPhotoPreview" class="photo-preview"></div>
            </div>
            <div style="display:flex;gap:10px;">
                <button class="btn primary" onclick="window.submitReview(${productId})" style="font-size:12px;padding:8px 16px;">Submit Review</button>
                <button class="btn" onclick="document.getElementById('reviewFormContainer').innerHTML=''" style="font-size:12px;padding:8px 16px;">Cancel</button>
            </div>
        </div>
    `;
    window._selectedRating = 0;
    window._reviewPhotos = [];
};

window.handleReviewPhoto = function() {
    const input = document.getElementById('reviewPhotoInput');
    const preview = document.getElementById('reviewPhotoPreview');
    if (!input.files || input.files.length === 0) return;

    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            window._reviewPhotos.push(e.target.result);
            preview.innerHTML += `<img src="${e.target.result}" class="preview-thumb">`;
        };
        reader.readAsDataURL(file);
    });
    // Reset input so same file can be selected again if needed
    input.value = '';
};

window.openLightbox = function(src) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${src}" onclick="event.stopPropagation()">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
};

window.pickStar = function(n) {
    window._selectedRating = n;
    document.querySelectorAll('#starPicker span').forEach(s => {
        s.style.color = parseInt(s.dataset.star) <= n ? '#f59e0b' : '#ddd';
    });
};

window.submitReview = function(productId) {
    const text = document.getElementById('reviewText')?.value.trim();
    const rating = window._selectedRating;
    const user = JSON.parse(localStorage.getItem('intellishop_user') || 'null');

    if (!user) { showToast('Please login to write a review', 'error'); return; }
    if (!rating) { showToast('Please select a rating', 'error'); return; }
    if (!text) { showToast('Please write your review', 'error'); return; }

    const reviews = JSON.parse(localStorage.getItem('intellishop_reviews') || '{}');
    if (!reviews[productId]) reviews[productId] = [];

    reviews[productId].unshift({
        id: Date.now(),
        userName: user.name,
        rating,
        text,
        photos: window._reviewPhotos || [],
        date: new Date().toISOString()
    });

    localStorage.setItem('intellishop_reviews', JSON.stringify(reviews));
    document.getElementById('reviewFormContainer').innerHTML = '';
    renderReviews(productId);
    showToast('Review submitted! Thank you ✍️');
    window._reviewPhotos = []; // Reset after submission
};

function renderReviews(productId) {
    const container = document.getElementById('reviewsList');
    if (!container) return;

    const reviews = JSON.parse(localStorage.getItem('intellishop_reviews') || '{}');
    const productReviews = reviews[productId] || [];

    if (!productReviews.length) {
        container.innerHTML = '<p style="color:var(--muted);font-size:13px;margin-top:10px;">No reviews yet. Be the first to review this product!</p>';
        return;
    }

    container.innerHTML = productReviews.map(r => `
        <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;">${(r.userName || 'U').substring(0,2).toUpperCase()}</div>
                    <div>
                        <div style="font-weight:bold;font-size:13px;">${r.userName || 'Anonymous'}</div>
                        <div style="font-size:11px;color:var(--muted);">${new Date(r.date).toLocaleDateString()}</div>
                    </div>
                </div>
                <div style="background:var(--green);color:#fff;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:bold;">${r.rating} ★</div>
            </div>
            <p style="font-size:13px;color:#444;line-height:1.5;margin-bottom:${r.photos && r.photos.length ? '8px' : '0'};">${r.text}</p>
            ${r.photos && r.photos.length > 0 ? `
                <div class="review-photos">
                    ${r.photos.map(src => `<img src="${src}" onclick="window.openLightbox('${src}')">`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// --- BRAND PAGE ---

export function renderBrandPage(brandName) {
    const container = document.getElementById('brand-storefront-container');
    if (!container) return;
    
    const brand = decodeURIComponent(brandName);
    const brandProducts = allProducts.filter(p => p.brand === brand);
    
    if (brandProducts.length === 0) {
        container.innerHTML = `<p>Brand not found.</p>`;
        return;
    }

    const avgPrice = Math.round(brandProducts.reduce((sum, p) => sum + p.discountPriceInRupees, 0) / brandProducts.length);
    const topRated = [...brandProducts].sort((a, b) => b.rating - a.rating)[0];

    container.innerHTML = `
        <div class="brand-hero">
            <div style="position:relative; z-index:2;">
                <div style="font-size:12px; font-weight:bold; color:var(--green); margin-bottom:10px; letter-spacing:2px; text-transform:uppercase;">Official Store</div>
                <h1 style="font-size:42px; margin:0 0 10px; color:#1f2937;">${brand}</h1>
                <p style="color:var(--muted); max-width:400px; font-size:14px; line-height:1.6;">Discover the latest collections and exclusive deals directly from ${brand}. Redefining fashion with every piece.</p>
                <div class="brand-stats">
                    <div class="brand-stat">
                        <div class="stat-num">${brandProducts.length}</div>
                        <div class="stat-label">Products</div>
                    </div>
                    <div class="brand-stat">
                        <div class="stat-num">★ ${topRated ? topRated.rating : '4.5'}</div>
                        <div class="stat-label">Top Rating</div>
                    </div>
                    <div class="brand-stat">
                        <div class="stat-num">₹${avgPrice}</div>
                        <div class="stat-label">Avg Price</div>
                    </div>
                </div>
            </div>
            <div style="position:relative; z-index:2; align-self:stretch;">
                 <img src="${brandProducts[0].image}" style="max-height:220px; border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,0.1);">
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3>All ${brand} Products</h3>
            <div style="font-size:13px; color:var(--muted);">${brandProducts.length} items found</div>
        </div>
        <div class="cards" style="grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));">
            ${brandProducts.map(p => `
                <div class="p-card" onclick="window.location.hash='#product-detail:${p.id}'" style="cursor:pointer; position:relative;">
                    <button class="wishlist-btn" onclick="window.toggleWishlistLocal(${p.id}, event)" style="position:absolute; top:10px; right:10px; background:#fff; border:1px solid #eee; border-radius:50%; width:32px; height:32px; cursor:pointer; color:${isInWishlist(p.id) ? 'red' : '#999'}; z-index:10; display:flex; align-items:center; justify-content:center;">
                        <i class="fa-${isInWishlist(p.id) ? 'solid' : 'regular'} fa-heart"></i>
                    </button>
                    <div class="p-img"><img src="${p.image}" loading="lazy" style="width:100%; height:200px; object-fit:contain; background:#f7faf9;"></div>
                    <div class="p-body">
                        <div style="font-size:11px; color:var(--green); font-weight:bold; margin-bottom:4px;">${p.brand}</div>
                        <div class="p-title" style="margin-bottom:6px;">${p.title.slice(0,30)}..</div>
                        <div style="font-size:11px; color:var(--muted); margin-bottom:6px;">★ ${p.rating} | Size: ${p.sizes.slice(0,3).join(',')}</div>
                        <div style="font-weight:bold; color:#111; font-size:15px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                ₹${p.discountPriceInRupees}
                                <span style="text-decoration:line-through;color:#999;font-weight:400;font-size:11px;margin-left:6px;">₹${p.priceInRupees}</span>
                            </div>
                            <span style="font-size:10px; color:#e67e22; background:#fef3c7; padding:2px 6px; border-radius:4px;">-${p.discountPercent}%</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// --- CURATED COLLECTIONS PAGE ---

export function renderCollectionsPage() {
    const container = document.getElementById('collections-container');
    if (!container) return;

    const collections = [
        { title: 'New Arrivals', subtitle: 'Fresh styles just dropped', filter: 'sort=new', img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=600' },
        { title: 'Top Rated', subtitle: 'Loved by our community', filter: 'sort=rating', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=600' },
        { title: 'Womenswear Edit', subtitle: 'Elevate your everyday wardrobe', filter: 'gender=womens', img: 'https://images.unsplash.com/photo-1485230895905-eb56fafe117a?auto=format&fit=crop&q=80&w=600' },
        { title: 'Mens Essentials', subtitle: 'Classic staples for every man', filter: 'gender=mens', img: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=80&w=600' },
        { title: 'Flash Deals', subtitle: 'Up to 50% Off — Limited time', filter: 'sort=price_asc', img: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&q=80&w=600' },
        { title: 'Luxury Brands', subtitle: 'Premium picks from top designers', filter: 'sort=price_desc', img: 'https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&q=80&w=600' }
    ];

    container.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">
            ${collections.map(c => `
                <div class="collection-card" style="background-image:url('${c.img}')" onclick="window.location.hash='#products:${c.filter}'">
                    <div class="coll-overlay">
                        <h3>${c.title}</h3>
                        <p>${c.subtitle} &rarr;</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// --- REVIEWS CHART ---

function renderReviewsChart(avgRating) {
    const ctx = document.getElementById('reviewsChart');
    if (!ctx) return;
    
    // Destroy existing chart if any
    if(window._revChart) window._revChart.destroy();
    
    const r5 = Math.floor(Math.random() * 50) + (avgRating > 4 ? 100 : 10);
    const r4 = Math.floor(Math.random() * 40) + (avgRating > 3 ? 50 : 10);
    const r3 = Math.floor(Math.random() * 30) + 10;
    const r2 = Math.floor(Math.random() * 15) + 5;
    const r1 = Math.floor(Math.random() * 10) + 2;

    window._revChart = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['5 Star', '4 Star', '3 Star', '2 Star', '1 Star'],
            datasets: [{
                label: 'Number of Reviews',
                data: [r5, r4, r3, r2, r1],
                backgroundColor: ['#1b7f4b', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- GLOBAL WINDOW FUNCTIONS ---

window.addToCartLocal = function(id, e) {
    e.stopPropagation();
    const p = allProducts.find(x => x.id === id);
    if(p) addToCart(p);
}

window.toggleWishlistLocal = function(id, e) {
    e.stopPropagation();
    toggleWishlist(allProducts.find(x => x.id === id));
    // Re-render button state loosely
    e.target.closest('button').style.color = isInWishlist(id) ? 'red' : '#999';
    e.target.closest('button').innerHTML = `<i class="fa-${isInWishlist(id) ? 'solid' : 'regular'} fa-heart"></i>`;
}
