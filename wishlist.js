// wishlist.js
import { showToast } from './ui.js';

let wishlist = [];

export function initWishlist() {
    const stored = localStorage.getItem('intellishop_wishlist');
    if (stored) wishlist = JSON.parse(stored);
    
    document.addEventListener('page:wishlist', renderWishlistPage);
}

export function toggleWishlist(product) {
    const idx = wishlist.findIndex(p => p.id === product.id);
    if (idx !== -1) {
        wishlist.splice(idx, 1);
        showToast('Removed from Wishlist', 'info');
    } else {
        wishlist.push(product);
        showToast('Added to Wishlist ❤️', 'success');
    }
    localStorage.setItem('intellishop_wishlist', JSON.stringify(wishlist));
    renderWishlistPage(); // Update UI if currently on wishlist page
}

export function isInWishlist(id) {
    return wishlist.some(p => p.id === id);
}

function renderWishlistPage() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    if (!wishlist.length) {
        grid.innerHTML = '<p>Your wishlist is empty.</p>';
        return;
    }

    grid.innerHTML = wishlist.map(p => `
        <div class="p-card" style="position:relative;">
            <button onclick="window.toggleWishlistLocal(${p.id}, event)" style="position:absolute; top:10px; right:10px; background:#fff; border-radius:50%; width:30px; height:30px; border:1px solid #ddd; z-index:10; cursor:pointer; color:red;">
                <i class="fa-solid fa-heart"></i>
            </button>
            <div class="p-img" onclick="window.location.hash='#product-detail:${p.id}'" style="cursor:pointer;"><img src="${p.image}"></div>
            <div class="p-body">
                <div class="p-title">${p.title.slice(0,30)}..</div>
                <div style="font-size:11px; color:var(--muted);">${p.brand} | ★ ${p.rating}</div>
                <div style="font-weight:bold; color:var(--green); margin-top:8px;">₹${p.discountPriceInRupees}</div>
            </div>
        </div>
    `).join('');
}
