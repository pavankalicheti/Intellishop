// cart.js
import { showToast } from './ui.js';

export let cart = [];
let savedForLater = [];

export function initCart() {
    const stored = localStorage.getItem('intellishop_cart');
    if (stored) cart = JSON.parse(stored);
    
    const savedStored = localStorage.getItem('intellishop_saved_later');
    if (savedStored) savedForLater = JSON.parse(savedStored);
    
    updateCartCount();
    document.addEventListener('page:cart', renderCartPage);
}

export function addToCart(product) {
    const item = cart.find(p => p.id === product.id);
    if (item) {
        item.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    // Also remove from saved if it was saved
    savedForLater = savedForLater.filter(p => p.id !== product.id);
    saveSavedForLater();
    saveCart();
    showToast('Added to Cart 🛒');
}

export function updateCartCount() {
    const countSpan = document.getElementById('cartCount');
    if (countSpan) {
        countSpan.textContent = cart.reduce((s, i) => s + i.qty, 0);
    }
}

function saveCart() {
    localStorage.setItem('intellishop_cart', JSON.stringify(cart));
    updateCartCount();
}

function saveSavedForLater() {
    localStorage.setItem('intellishop_saved_later', JSON.stringify(savedForLater));
}

window.changeCartQty = function(id, delta) {
    const item = cart.find(p => p.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(p => p.id !== id);
    }
    saveCart();
    renderCartPage();
}

window.removeFromCart = function(id) {
    cart = cart.filter(p => p.id !== id);
    saveCart();
    renderCartPage();
    showToast('Item removed');
}

// --- SAVE FOR LATER ---

window.saveForLater = function(id) {
    const item = cart.find(p => p.id === id);
    if (!item) return;
    // Move to saved list
    savedForLater.push({ ...item, qty: 1 });
    cart = cart.filter(p => p.id !== id);
    saveCart();
    saveSavedForLater();
    renderCartPage();
    showToast('Saved for later 🔖');
}

window.moveToCart = function(id) {
    const item = savedForLater.find(p => p.id === id);
    if (!item) return;
    // Move back to cart
    const existing = cart.find(p => p.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    savedForLater = savedForLater.filter(p => p.id !== id);
    saveCart();
    saveSavedForLater();
    renderCartPage();
    showToast('Moved to cart 🛒');
}

window.removeSaved = function(id) {
    savedForLater = savedForLater.filter(p => p.id !== id);
    saveSavedForLater();
    renderCartPage();
    showToast('Removed from saved items');
}

window.applyCoupon = function() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const subtotal = cart.reduce((sum, item) => sum + (item.discountPriceInRupees * item.qty), 0);
    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    
    const coupons = {
        'INTELLI30': { type: 'percent', value: 0.3, label: '30% OFF', min: 0 },
        'FLAT500': { type: 'flat', value: 500, label: '₹500 OFF', min: 2000 },
        'WELCOME10': { type: 'percent', value: 0.1, label: '10% OFF (First Order)', min: 0, firstOnly: true },
        'FREESHIP': { type: 'shipping', value: 0, label: 'FREE SHIPPING', min: 0 }
    };

    const coupon = coupons[code];
    if (!coupon) {
        localStorage.removeItem('intellishop_coupon');
        localStorage.removeItem('intellishop_coupon_name');
        showToast('Invalid Coupon Code', 'error');
        renderCartPage();
        return;
    }

    if (subtotal < coupon.min) {
        showToast(`Minimum order ₹${coupon.min} required for ${code}`, 'error');
        return;
    }

    if (coupon.firstOnly && orders.length > 0) {
        showToast('WELCOME10 is only for first-time orders', 'error');
        return;
    }

    // Store coupon data
    localStorage.setItem('intellishop_coupon', JSON.stringify(coupon));
    localStorage.setItem('intellishop_coupon_name', code);
    showToast(`Coupon ${code} applied: ${coupon.label} 🎉`);
    renderCartPage();
}

export function renderCartPage() {
    const container = document.getElementById('cart-items-container');
    const summary = document.getElementById('cart-summary');
    if (!container || !summary) return;

    if (!cart.length && !savedForLater.length) {
        container.innerHTML = '<p>Your cart is empty. <a href="#products">Continue Shopping</a></p>';
        summary.innerHTML = '';
        return;
    }

    let html = '';

    if (!cart.length) {
        html += '<p style="color:var(--muted);margin-bottom:20px;">Your cart is empty. <a href="#products">Continue Shopping</a></p>';
    } else {
        html += cart.map(item => `
            <div style="display:flex; border:1px solid var(--border); border-radius:14px; padding:15px; margin-bottom:15px; gap:15px; position:relative; background:#fff;">
                <img src="${item.image}" style="width:80px; height:80px; object-fit:contain; border-radius:8px; background:#f7faf9;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:14px;">${item.title}</div>
                    <div style="color:var(--muted); font-size:12px; margin-bottom:10px;">Size: ${item.sizes[0]} | Color: ${item.colors[0]}</div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-weight:bold; color:var(--green);">₹${item.discountPriceInRupees}</span>
                        <div style="display:flex; align-items:center; border:1px solid var(--border); border-radius:20px; overflow:hidden;">
                            <button onclick="window.changeCartQty(${item.id}, -1)" style="border:none; background:#f7faf9; padding:5px 12px; cursor:pointer;">-</button>
                            <span style="padding:0 12px; font-size:13px; font-weight:bold;">${item.qty}</span>
                            <button onclick="window.changeCartQty(${item.id}, 1)" style="border:none; background:#f7faf9; padding:5px 12px; cursor:pointer;">+</button>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-top:8px;">
                        <button onclick="window.saveForLater(${item.id})" style="background:none; border:none; color:#6366f1; cursor:pointer; font-size:12px; font-weight:600;">🔖 Save for Later</button>
                    </div>
                </div>
                <button onclick="window.removeFromCart(${item.id})" style="position:absolute; top:15px; right:15px; background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
    }

    // --- SAVED FOR LATER SECTION ---
    if (savedForLater.length > 0) {
        html += `
            <div class="saved-section">
                <h3 style="margin-bottom:15px;">🔖 Saved for Later (${savedForLater.length})</h3>
                ${savedForLater.map(item => `
                    <div class="saved-item">
                        <img src="${item.image}" style="width:60px; height:60px; object-fit:contain; border-radius:8px; background:#f7faf9;">
                        <div style="flex:1;">
                            <div style="font-weight:bold; font-size:13px;">${item.title}</div>
                            <div style="font-size:11px; color:var(--muted);">${item.brand} | ₹${item.discountPriceInRupees}</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="window.moveToCart(${item.id})" class="mini-btn" style="font-size:11px; padding:6px 12px;">Move to Cart</button>
                            <button onclick="window.removeSaved(${item.id})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:14px;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = html;

    const subtotal = cart.reduce((sum, item) => sum + (item.discountPriceInRupees * item.qty), 0);
    let shipping = subtotal > 1000 ? 0 : 50;
    
    let discount = 0;
    let couponLabel = '';
    const couponData = localStorage.getItem('intellishop_coupon');
    const couponName = localStorage.getItem('intellishop_coupon_name') || '';
    
    if (couponData) {
        try {
            const coupon = JSON.parse(couponData);
            if (coupon.type === 'percent') {
                discount = Math.round(subtotal * coupon.value);
                couponLabel = `${couponName} (${coupon.label})`;
            } else if (coupon.type === 'flat') {
                discount = coupon.value;
                couponLabel = `${couponName} (${coupon.label})`;
            } else if (coupon.type === 'shipping') {
                shipping = 0;
                couponLabel = `${couponName} (Free Shipping)`;
            }
        } catch(e) {
            // Legacy format support
            discount = Math.round(subtotal * parseFloat(couponData));
            couponLabel = 'INTELLI30 (30% OFF)';
        }
    }

    const total = subtotal + shipping - discount;

    if (cart.length > 0) {
        summary.innerHTML = `
            <div style="background:#f7faf9; border:1px solid var(--border); border-radius:14px; padding:20px;">
                <h3 style="margin-bottom:15px;">Order Summary</h3>
                <div style="display:flex; gap:10px; margin-bottom:8px;">
                    <input id="couponCode" placeholder="Enter coupon code" value="${couponName}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border);">
                    <button class="btn" onclick="window.applyCoupon()">Apply</button>
                </div>
                <div style="font-size:10px; color:var(--muted); margin-bottom:15px;">
                    Available: <span style="color:var(--green);font-weight:bold;">INTELLI30</span> · <span style="color:var(--green);font-weight:bold;">FLAT500</span> · <span style="color:var(--green);font-weight:bold;">WELCOME10</span> · <span style="color:var(--green);font-weight:bold;">FREESHIP</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#555;">
                    <span>Subtotal</span>
                    <span>₹${subtotal}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#555;">
                    <span>Shipping</span>
                    <span>${shipping === 0 ? '<span style="color:var(--green);">FREE</span>' : '₹' + shipping}</span>
                </div>
                ${discount > 0 ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:var(--green);">
                    <span>Discount ${couponLabel ? `(${couponLabel})` : ''}</span>
                    <span>- ₹${discount}</span>
                </div>` : ''}
                ${couponLabel && discount === 0 && shipping === 0 ? `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:var(--green);">
                    <span>${couponLabel}</span>
                    <span>Applied ✓</span>
                </div>` : ''}
                <div style="height:1px; background:var(--border); margin:15px 0;"></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-size:18px; font-weight:bold;">
                    <span>Total Amount</span>
                    <span>₹${total}</span>
                </div>
                <button class="btn primary" style="width:100%; padding:15px; font-size:16px;" onclick="window.location.hash='#checkout'">PROCEED TO CHECKOUT</button>
            </div>
        `;
    } else {
        summary.innerHTML = '';
    }
}

