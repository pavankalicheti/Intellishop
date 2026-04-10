// orders.js — Enhanced with Status Timeline + Returns/Exchange
import { addToCart } from './cart.js';
import { showToast, navigateTo } from './ui.js';

export function initOrders() {
    document.addEventListener('page:orders', renderOrdersPage);
}

// Shipping status progression
const STATUS_FLOW = ['Placed', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];
const STATUS_ICONS = { 'Placed': '📦', 'Confirmed': '✅', 'Shipped': '🚚', 'Out for Delivery': '🏃', 'Delivered': '🎉', 'Cancelled': '❌', 'Under Review': '🔍', 'Return Requested': '↩️', 'Exchange Requested': '🔄' };

function getSimulatedStatus(orderDate) {
    const elapsed = (Date.now() - new Date(orderDate).getTime()) / 1000;
    if (elapsed > 300) return 'Delivered';       // 5 min → delivered
    if (elapsed > 180) return 'Out for Delivery'; // 3 min
    if (elapsed > 90) return 'Shipped';            // 1.5 min
    if (elapsed > 30) return 'Confirmed';          // 30 sec
    return 'Placed';
}

function renderOrdersPage() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');

    if (!orders.length) {
        container.innerHTML = '<p>You have no past orders. <a href="#products">Start Shopping</a></p>';
        return;
    }

    // Auto-update statuses for active orders
    orders.forEach(o => {
        if (!['Cancelled', 'Return Requested', 'Exchange Requested', 'Under Review'].includes(o.status)) {
            o.status = getSimulatedStatus(o.date);
        }
    });
    localStorage.setItem('intellishop_orders', JSON.stringify(orders));

    container.innerHTML = orders.map(o => `
        <div style="border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:20px; background:#fff;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                <div>
                    <span style="font-weight:bold; font-size:14px;">Order ID: ${o.id}</span>
                    <div style="color:var(--muted); font-size:12px; margin-top:5px;">${new Date(o.date).toLocaleDateString()} · ${new Date(o.date).toLocaleTimeString()}</div>
                </div>
                <div style="text-align:right;">
                    <span style="background:${getStatusColor(o.status)}20; color:${getStatusColor(o.status)}; padding:5px 10px; border-radius:8px; font-weight:bold; font-size:12px;">${STATUS_ICONS[o.status] || ''} ${o.status}</span>
                    <div style="font-size:14px; font-weight:bold; margin-top:5px;">Total: ₹${o.amount}</div>
                </div>
            </div>

            <!-- STATUS TIMELINE -->
            ${!['Cancelled', 'Return Requested', 'Exchange Requested'].includes(o.status) ? renderTimeline(o) : ''}
            
            <!-- Items -->
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${o.items.map(item => `
                    <div style="display:flex; gap:15px; align-items:center;">
                        <img src="${item.image}" style="width:50px; height:50px; border-radius:8px; background:#f7faf9; object-fit:contain;">
                        <div style="flex:1;">
                            <div style="font-size:13px; font-weight:bold;">${item.title}</div>
                            <div style="font-size:12px; color:var(--muted);">Qty: ${item.qty} | Price: ₹${item.discountPriceInRupees}</div>
                        </div>
                        <button onclick="window.reorderLocal(${item.id})" class="mini-btn" style="background:#fff; color:var(--text); border-color:var(--border);">Reorder</button>
                    </div>
                `).join('')}
            </div>
            
            <!-- Actions Footer -->
            <div style="margin-top:20px; border-top:1px dashed var(--border); padding-top:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="font-size:12px; color:var(--muted);">
                    Deliver to: ${o.address?.name || 'N/A'}, ${o.address?.city || ''} · ${(o.paymentMethod || '').toUpperCase()}
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    ${o.status === 'Delivered' && !o.returnRequested ? `
                        <button onclick="window.requestReturn('${o.id}')" style="background:none; border:1px solid #f59e0b; color:#f59e0b; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:11px;">↩️ Return</button>
                        <button onclick="window.requestExchange('${o.id}')" style="background:none; border:1px solid #6366f1; color:#6366f1; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:11px;">🔄 Exchange</button>
                    ` : ''}
                    ${!['Cancelled', 'Delivered', 'Return Requested', 'Exchange Requested'].includes(o.status) ? `
                        <button onclick="window.cancelOrderLocal('${o.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-weight:bold; font-size:12px;">Cancel Order</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// --- STATUS TIMELINE ---

function renderTimeline(order) {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    
    return `
        <div style="display:flex; justify-content:space-between; margin:20px 0; padding:0 10px; position:relative;">
            <!-- Progress line -->
            <div style="position:absolute; top:14px; left:30px; right:30px; height:3px; background:#e5e7eb; z-index:0;">
                <div style="height:100%; width:${currentIdx >= 0 ? (currentIdx / (STATUS_FLOW.length - 1)) * 100 : 0}%; background:var(--green); transition:width 0.5s ease; border-radius:2px;"></div>
            </div>
            ${STATUS_FLOW.map((step, i) => {
                const isComplete = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return `
                    <div style="display:flex; flex-direction:column; align-items:center; z-index:1; flex:1;">
                        <div style="width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; 
                            background:${isComplete ? 'var(--green)' : '#e5e7eb'}; color:${isComplete ? '#fff' : '#999'}; 
                            ${isCurrent ? 'box-shadow:0 0 0 4px rgba(27,127,75,0.2);' : ''}
                            transition: all 0.3s ease;">
                            ${isComplete ? '✓' : i + 1}
                        </div>
                        <div style="font-size:10px; margin-top:6px; text-align:center; color:${isComplete ? 'var(--green)' : 'var(--muted)'}; font-weight:${isCurrent ? '700' : '400'};">
                            ${step}
                        </div>
                        ${isComplete && order.date ? `
                            <div style="font-size:9px; color:var(--muted); margin-top:2px;">
                                ${new Date(new Date(order.date).getTime() + i * 30000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getStatusColor(status) {
    const colors = {
        'Placed': '#6366f1', 'Confirmed': '#0ea5e9', 'Shipped': '#f59e0b', 
        'Out for Delivery': '#f97316', 'Delivered': '#10b981', 'Cancelled': '#ef4444',
        'Under Review': '#8b5cf6', 'Return Requested': '#f59e0b', 'Exchange Requested': '#6366f1'
    };
    return colors[status] || '#6b7280';
}

// --- RETURNS & EXCHANGE ---

window.requestReturn = function(orderId) {
    const reason = prompt('Reason for return:\n1. Wrong size\n2. Defective product\n3. Not as described\n4. Changed mind\n\nEnter reason:');
    if (!reason) return;

    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = 'Return Requested';
        order.returnReason = reason;
        order.returnDate = new Date().toISOString();
        localStorage.setItem('intellishop_orders', JSON.stringify(orders));
        renderOrdersPage();
        showToast('Return request submitted! ↩️');

        // Add notification
        addNotification('Return Confirmed', `Return requested for order ${orderId}. We'll process it within 3-5 business days.`);
    }
};

window.requestExchange = function(orderId) {
    const newSize = prompt('Select new size for exchange:\n\nEnter size (S / M / L / XL / XXL):');
    if (!newSize) return;

    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = 'Exchange Requested';
        order.exchangeSize = newSize.toUpperCase();
        order.exchangeDate = new Date().toISOString();
        localStorage.setItem('intellishop_orders', JSON.stringify(orders));
        renderOrdersPage();
        showToast('Exchange request submitted! 🔄');

        addNotification('Exchange Confirmed', `Exchange to size ${newSize.toUpperCase()} for order ${orderId} is being processed.`);
    }
};

// --- EXISTING FUNCTIONS ---

window.reorderLocal = function(productId) {
    const products = JSON.parse(localStorage.getItem('intellishop_products_v9') || localStorage.getItem('intellishop_products_v7') || '[]');
    const p = products.find(x => x.id === productId);
    if(p) {
        addToCart(p);
        navigateTo('cart');
    } else {
        showToast('Product not found, browse catalogue', 'error');
        navigateTo('products');
    }
}

window.cancelOrderLocal = function(orderId) {
    if(!confirm('Are you sure you want to cancel this order?')) return;
    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    if(order) {
        order.status = 'Cancelled';
        localStorage.setItem('intellishop_orders', JSON.stringify(orders));
        renderOrdersPage();
        showToast('Order Cancelled', 'info');
        addNotification('Order Cancelled', `Order ${orderId} has been cancelled. Refund will be processed in 5-7 business days.`);
    }
}

// --- NOTIFICATION HELPER ---

function addNotification(title, message) {
    const notifs = JSON.parse(localStorage.getItem('intellishop_notifications') || '[]');
    notifs.unshift({
        id: Date.now(),
        title,
        message,
        time: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('intellishop_notifications', JSON.stringify(notifs));
    // Update badge
    if (window.updateNotifBadge) window.updateNotifBadge();
}

// Export for other modules to use
export { addNotification };
