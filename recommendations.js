// recommendations.js — Related Products + Complete the Look
import { allProducts } from './products.js?v=9';

export function initRecommendations() {
    document.addEventListener('page:product-detail', (e) => {
        setTimeout(() => injectRecommendations(e.detail.id), 100);
    });
}

// Category pairing map for "Complete the Look"
const OUTFIT_PAIRS = {
    'womens-dresses': ['womens-shoes', 'womens-bags', 'womens-jewellery', 'womens-watches'],
    'womens-shoes': ['womens-dresses', 'womens-bags', 'womens-jewellery'],
    'womens-bags': ['womens-dresses', 'womens-shoes', 'womens-jewellery'],
    'womens-jewellery': ['womens-dresses', 'womens-shoes', 'womens-bags'],
    'womens-watches': ['womens-dresses', 'womens-bags', 'womens-jewellery'],
    'mens-shirts': ['mens-shoes', 'mens-watches'],
    'mens-shoes': ['mens-shirts', 'mens-watches'],
    'mens-watches': ['mens-shirts', 'mens-shoes'],
    'tops': ['womens-shoes', 'womens-bags', 'womens-jewellery'],
};

function injectRecommendations(currentId) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    const currentProduct = allProducts.find(p => p.id == currentId);
    if (!currentProduct) return;

    const related = allProducts
        .filter(p => p.category === currentProduct.category && p.id != currentId)
        .slice(0, 4);

    const recent = JSON.parse(localStorage.getItem('intellishop_recent') || '[]')
        .filter(p => p.id != currentId)
        .slice(0, 4);

    // "Complete the Look" — cross-category suggestions
    const pairCategories = OUTFIT_PAIRS[currentProduct.category] || [];
    const outfitPicks = [];
    pairCategories.forEach(cat => {
        const match = allProducts.find(p => p.category === cat && !outfitPicks.find(x => x.category === cat));
        if (match) outfitPicks.push(match);
    });

    const recHTML = document.createElement('div');
    recHTML.style.marginTop = '40px';
    
    let html = '';

    // Complete the Look
    if (outfitPicks.length > 0) {
        html += `
            <div style="margin-bottom:30px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3>👗 Complete the Look</h3>
                    <span style="font-size:11px;color:var(--muted);">Pair with your selection</span>
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:15px;">
                    ${outfitPicks.map(p => renderMiniCard(p)).join('')}
                </div>
            </div>
        `;
    }

    // Related Products
    if (related.length > 0) {
        html += `
            <h3>Related Products</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px; margin-top:15px; margin-bottom: 30px;">
                ${related.map(p => renderMiniCard(p)).join('')}
            </div>
        `;
    }

    // Recently Viewed
    if (recent.length > 0) {
        html += `
            <h3>Recently Viewed</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px; margin-top:15px;">
                ${recent.map(p => renderMiniCard(p)).join('')}
            </div>
        `;
    }

    recHTML.innerHTML = html;
    container.appendChild(recHTML);
}

function renderMiniCard(p) {
    return `
        <div class="p-card" onclick="window.location.hash='#product-detail:${p.id}'" style="cursor:pointer; position:relative;">
            <div class="p-img"><img src="${p.image}" loading="lazy" style="height:150px; width:100%; object-fit:contain;"></div>
            <div class="p-body">
                <div class="p-title">${p.title.slice(0,25)}..</div>
                <div style="font-size:10px;color:var(--muted);">${p.brand} · ${p.category}</div>
                <div style="font-weight:bold; color:var(--green); margin-top:5px;">₹${p.discountPriceInRupees}</div>
            </div>
        </div>
    `;
}
