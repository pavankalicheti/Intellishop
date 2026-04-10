// checkout.js
import { cart, updateCartCount } from './cart.js';
import { getCurrentUser } from './auth.js';
import { showToast, navigateTo } from './ui.js';
import { scoreFraudRisk } from './fraud-detection.js';
import { getLoyaltyData, redeemPoints } from './personalization.js';
import { getDefaultAddress, getAllAddresses } from './profile.js';

export function initCheckout() {
    document.addEventListener('page:checkout', renderCheckoutPage);
}

function renderCheckoutPage() {
    const container = document.getElementById('checkout-container');
    if (!container) return;

    if (!cart.length) {
        container.innerHTML = '<p>Your cart is empty. Please add items before checking out.</p>';
        return;
    }

    const user = getCurrentUser();
    const subtotal = cart.reduce((sum, item) => sum + (item.discountPriceInRupees * item.qty), 0);
    let shipping = subtotal > 1000 ? 0 : 50;
    
    let discount = 0;
    const couponData = localStorage.getItem('intellishop_coupon');
    if (couponData) {
        try {
            const coupon = JSON.parse(couponData);
            if (coupon.type === 'percent') discount = Math.round(subtotal * coupon.value);
            else if (coupon.type === 'flat') discount = coupon.value;
            else if (coupon.type === 'shipping') shipping = 0;
        } catch(e) {
            discount = Math.round(subtotal * parseFloat(couponData));
        }
    }

    const walletBalance = parseInt(localStorage.getItem('intellishop_wallet') || '0');
    const loyalty = getLoyaltyData();
    const total = subtotal + shipping - discount;

    // Get saved addresses
    const savedAddresses = getAllAddresses();
    const defaultAddr = getDefaultAddress();
    const prefillAddr = defaultAddr || (user ? { name: user.name, phone: user.phone, address: user.address, city: user.city, state: user.state, pincode: user.pincode } : {});

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:30px;">
            <div>
                <h3>Delivery Address</h3>
                ${savedAddresses.length > 0 ? `
                <div style="margin:12px 0;">
                    <label style="font-size:12px;font-weight:bold;margin-bottom:6px;display:block;">Select Saved Address</label>
                    <select id="savedAddrSelect" onchange="window._fillFromSavedAddr()" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);font-size:13px;">
                        <option value="">— Choose a saved address —</option>
                        ${savedAddresses.map((a, i) => `<option value="${i}" ${a.isDefault ? 'selected' : ''}>${a.name} — ${a.address}, ${a.city} ${a.isDefault ? '(Default)' : ''}</option>`).join('')}
                        <option value="new">+ Enter new address</option>
                    </select>
                </div>
                ` : ''}
                <form id="checkoutForm" style="display:flex; flex-direction:column; gap:15px; margin-top:15px;">
                    <input id="coName" placeholder="Full Name" required value="${prefillAddr.name || ''}" style="padding:10px; border-radius:8px; border:1px solid var(--border);">
                    <input id="coPhone" placeholder="Phone Number" required value="${prefillAddr.phone || ''}" style="padding:10px; border-radius:8px; border:1px solid var(--border);">
                    <input id="coAddress" placeholder="Address" required value="${prefillAddr.address || ''}" style="padding:10px; border-radius:8px; border:1px solid var(--border);">
                    <div style="display:flex; gap:10px;">
                        <input id="coCity" placeholder="City" required value="${prefillAddr.city || ''}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border);">
                        <input id="coState" placeholder="State" required value="${prefillAddr.state || ''}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border);">
                        <input id="coPin" placeholder="Pincode" required value="${prefillAddr.pincode || ''}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border);">
                    </div>

                    <h3 style="margin-top:20px;">Payment Method</h3>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <label style="border:1px solid var(--border); padding:15px; border-radius:10px; display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="radio" name="payment" value="card" checked> Credit/Debit Card
                        </label>
                        <label style="border:1px solid var(--border); padding:15px; border-radius:10px; display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="radio" name="payment" value="upi"> UPI
                        </label>
                        <label style="border:1px solid var(--border); padding:15px; border-radius:10px; display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="radio" name="payment" value="wallet"> Intellishop Wallet (₹${walletBalance} available)
                        </label>
                        <label style="border:1px solid var(--border); padding:15px; border-radius:10px; display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="radio" name="payment" value="cod"> Cash on Delivery
                        </label>
                    </div>

                    <!-- Loyalty Points -->
                    ${loyalty.available > 0 ? `
                    <div style="margin-top:15px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:12px;font-weight:bold;">✨ Use Loyalty Points</div>
                            <div style="font-size:11px;color:var(--muted);">${loyalty.available} points available = ₹${Math.floor(loyalty.available/100)*50} OFF</div>
                        </div>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" id="useLoyalty"> Apply
                        </label>
                    </div>` : ''}

                    <!-- Fraud Scanning Area -->
                    <div id="fraudScanResult" style="margin-top:10px;"></div>

                    <button type="submit" class="btn primary" style="padding:15px; font-size:16px; margin-top:20px;">PLACE ORDER - ₹${total}</button>
                </form>
            </div>
            
            <div>
                <div style="background:#f7faf9; border:1px solid var(--border); border-radius:14px; padding:20px;">
                    <h3 style="margin-bottom:15px;">Order Summary</h3>
                    ${cart.map(item => `
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px;">
                            <span>${item.qty}x ${item.title.substring(0, 20)}...</span>
                            <span>₹${item.discountPriceInRupees * item.qty}</span>
                        </div>
                    `).join('')}
                    <div style="height:1px; background:var(--border); margin:15px 0;"></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; font-size:16px;">
                        <span>Total</span>
                        <span style="color:var(--green);">₹${total}</span>
                    </div>
                </div>

                <!-- Fraud Detection Info Panel -->
                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:14px; padding:16px; margin-top:16px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <span style="font-size:16px;">🛡️</span>
                        <span style="font-weight:700; font-size:13px; color:#0369a1;">ML Fraud Protection Active</span>
                    </div>
                    <p style="font-size:11px; color:#64748b; line-height:1.5;">Every transaction is analyzed by our Isolation Forest ML model, behavioral biometrics engine, and graph-based fraud detection system in real-time.</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('checkoutForm').addEventListener('submit', (e) => handleCheckout(e, total));

    // Fill from saved address handler
    window._fillFromSavedAddr = function() {
        const select = document.getElementById('savedAddrSelect');
        if (!select) return;
        const val = select.value;
        if (val === '' || val === 'new') {
            ['coName','coPhone','coAddress','coCity','coState','coPin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            return;
        }
        const addresses = getAllAddresses();
        const a = addresses[parseInt(val)];
        if (!a) return;
        document.getElementById('coName').value = a.name || '';
        document.getElementById('coPhone').value = a.phone || '';
        document.getElementById('coAddress').value = a.address || '';
        document.getElementById('coCity').value = a.city || '';
        document.getElementById('coState').value = a.state || '';
        document.getElementById('coPin').value = a.pincode || '';
    };
}

function handleCheckout(e, amount) {
    e.preventDefault();

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const scanArea = document.getElementById('fraudScanResult');

    // Show scanning animation
    scanArea.innerHTML = `
        <div class="fraud-scanning">
            <svg width="20" height="20" viewBox="0 0 20 20" style="animation: spin 1s linear infinite;">
                <circle cx="10" cy="10" r="8" stroke="#0369a1" stroke-width="2" fill="none" stroke-dasharray="50" stroke-dashoffset="20"/>
            </svg>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            <span>Scanning transaction with ML fraud detection...</span>
        </div>
    `;

    // Slight delay for UX (simulate ML inference)
    setTimeout(() => {
        // Build transaction data for scoring
        const transactionData = {
            amount,
            itemCount: cart.reduce((s, i) => s + i.qty, 0),
            paymentMethod,
            address: {
                name: document.getElementById('coName').value,
                city: document.getElementById('coCity').value,
                state: document.getElementById('coState').value
            }
        };

        // Run ML fraud scoring
        const fraudResult = scoreFraudRisk(transactionData);

        // Display risk badge
        scanArea.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:12px; border:1px solid ${fraudResult.decision.color}22; background:${fraudResult.decision.color}08;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:20px;">${fraudResult.decision.icon}</span>
                    <div>
                        <div style="font-weight:700; font-size:13px; color:${fraudResult.decision.color};">${fraudResult.decision.label}</div>
                        <div style="font-size:11px; color:var(--muted);">Score: ${fraudResult.score}/100 · Device: ${fraudResult.deviceHash.substring(0,10)}…</div>
                    </div>
                </div>
                <div class="fraud-risk-badge" style="background:${fraudResult.decision.color}; color:#fff;">
                    ${fraudResult.score}
                </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:8px;">
                ${renderBreakdownPill('Isolation Forest', fraudResult.breakdown.isolationForest)}
                ${renderBreakdownPill('Behavior', fraudResult.breakdown.weightedFeatures)}
                ${renderBreakdownPill('Velocity', fraudResult.breakdown.velocity)}
                ${renderBreakdownPill('Graph', fraudResult.breakdown.graphAnalysis)}
            </div>
        `;

        // Handle decision
        switch (fraudResult.decision.action) {
            case 'allow':
                // Proceed with order
                processOrder(amount, paymentMethod);
                break;

            case 'challenge':
                // Show CAPTCHA modal
                showFraudChallenge(fraudResult, amount, paymentMethod);
                break;

            case 'flag':
                // Order goes through but flagged for admin review
                showToast('⚠️ Order placed but flagged for security review', 'warning');
                processOrder(amount, paymentMethod, 'Under Review');
                break;

            case 'block':
                // Block the transaction
                showToast('🛑 Transaction declined — flagged as suspicious', 'error');
                break;
        }
    }, 800);
}

function renderBreakdownPill(label, value) {
    const color = value <= 30 ? '#10b981' : value <= 65 ? '#f59e0b' : '#ef4444';
    return `<span style="font-size:10px; padding:3px 8px; border-radius:12px; background:${color}15; color:${color}; font-weight:600; border:1px solid ${color}30;">${label}: ${value}</span>`;
}

function showFraudChallenge(fraudResult, amount, paymentMethod) {
    const modal = document.getElementById('fraudChallengeModal');
    const captchaText = document.getElementById('captchaText');
    const captchaInput = document.getElementById('captchaInput');
    const scoreDisplay = document.getElementById('challengeRiskScore');

    // Generate random CAPTCHA code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

    captchaText.textContent = code;
    captchaInput.value = '';
    scoreDisplay.textContent = fraudResult.score;
    modal.style.display = 'flex';

    // Handle verification
    const handler = function() {
        const input = captchaInput.value.trim().toUpperCase();
        if (input === code) {
            modal.style.display = 'none';
            showToast('✅ Verification passed');
            processOrder(amount, paymentMethod);
        } else {
            showToast('❌ Incorrect code, please try again', 'error');
            captchaInput.value = '';
            captchaInput.focus();
        }
    };

    const btn = document.getElementById('verifyCaptchaBtn');
    // Remove old listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', handler);

    // Also allow Enter key
    captchaInput.onkeypress = function(e) {
        if (e.key === 'Enter') handler();
    };
}

function processOrder(amount, paymentMethod, status = 'Processing') {
    // Handle wallet payment
    if (paymentMethod === 'wallet') {
        const walletBalance = parseInt(localStorage.getItem('intellishop_wallet') || '0');
        if (walletBalance < amount) {
            showToast('Insufficient wallet balance! Add ₹' + (amount - walletBalance) + ' more.', 'error');
            return;
        }
        localStorage.setItem('intellishop_wallet', String(walletBalance - amount));
    }

    // Handle loyalty points
    const useLoyalty = document.getElementById('useLoyalty')?.checked;
    let loyaltyDiscount = 0;
    if (useLoyalty) {
        const loyalty = getLoyaltyData();
        loyaltyDiscount = Math.floor(loyalty.available / 100) * 50;
        redeemPoints(loyaltyDiscount);
    }

    const newOrder = {
        id: 'ORD' + Date.now().toString().slice(-6),
        date: new Date().toISOString(),
        items: [...cart],
        amount: amount - loyaltyDiscount,
        paymentMethod: paymentMethod,
        status: status,
        address: {
            name: document.getElementById('coName').value,
            city: document.getElementById('coCity').value,
            state: document.getElementById('coState').value
        }
    };

    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    orders.unshift(newOrder);
    localStorage.setItem('intellishop_orders', JSON.stringify(orders));

    // Clear Cart
    cart.length = 0;
    localStorage.removeItem('intellishop_cart');
    localStorage.removeItem('intellishop_coupon');
    localStorage.removeItem('intellishop_coupon_name');
    updateCartCount();

    // Add notification
    const notifs = JSON.parse(localStorage.getItem('intellishop_notifications') || '[]');
    notifs.unshift({
        id: Date.now(),
        title: 'Order Placed! 📦',
        message: `Your order ${newOrder.id} for ₹${newOrder.amount} is confirmed. Track it in My Orders.`,
        time: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('intellishop_notifications', JSON.stringify(notifs));
    if (window.updateNotifBadge) window.updateNotifBadge();

    showToast('Order Placed Successfully! ✅');
    navigateTo('orders');
}
