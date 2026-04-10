// admin/fraud-dashboard.js — Enterprise SOC-style Fraud Intelligence Dashboard
// All 10 components + fully functional actions: Review, Block, Whitelist, Escalate, Unblock, View
import {
    generateKPIData, generateFlaggedEvents, generateHeatmapData,
    generateRiskDistribution, generateFraudTypeBreakdown, generateGeoData,
    generateDeviceFingerprints, generateBlockedUsers, generateWatchlist,
    generateTrendData, generateAttackEvent, generateSparkline
} from './mock-data.js';

// ═══════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════
let threatLevel = 35;
let isAttackMode = false;
let activityFeedData = [];
let attackInterval = null;
let blockedUsersState = [];
let watchlistState = [];
let whitelistedState = [];
let currentBlockedTab = 'blocked';

// ═══════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM (Global)
// ═══════════════════════════════════════════════════
function showAdminToast(message, type = 'success') {
    // Remove old container if missing
    let container = document.getElementById('admin-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin-toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#86efac', icon: '✅' },
        error:   { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5', icon: '❌' },
        warning: { bg: 'rgba(249,115,22,0.15)', border: '#f97316', text: '#fdba74', icon: '⚠️' },
        info:    { bg: 'rgba(6,182,212,0.15)', border: '#06b6d4', text: '#67e8f9', icon: 'ℹ️' },
        block:   { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5', icon: '🚫' },
        escalate:{ bg: 'rgba(249,115,22,0.15)', border: '#f97316', text: '#fdba74', icon: '🔺' }
    };

    const c = colors[type] || colors.success;
    const toast = document.createElement('div');
    toast.style.cssText = `
        pointer-events:auto; background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
        padding:14px 20px; border-radius:12px; font-size:13px; font-weight:600;
        backdrop-filter:blur(16px); box-shadow:0 8px 32px rgba(0,0,0,0.4);
        display:flex; align-items:center; gap:10px; min-width:300px; max-width:450px;
        animation: toastSlideIn 0.35s ease;
    `;
    toast.innerHTML = `<span style="font-size:16px;">${c.icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Inject toast keyframes once
function injectToastStyles() {
    if (document.getElementById('admin-toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-toast-styles';
    style.textContent = `
        @keyframes toastSlideIn { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
        @keyframes toastSlideOut { to { opacity:0; transform:translateX(60px); } }

        /* ═══ MODAL & DRAWER SYSTEM ═══ */
        .fraud-overlay {
            position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px);
            z-index:5000; display:flex; align-items:center; justify-content:center;
            animation: overlayFadeIn 0.25s ease;
        }
        @keyframes overlayFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes overlayFadeOut { to { opacity:0; } }

        /* Confirmation Dialog */
        .fraud-confirm-dialog {
            background:var(--bg-card); border:1px solid var(--border); border-radius:16px;
            padding:28px 32px; max-width:420px; width:90%;
            box-shadow:0 25px 60px rgba(0,0,0,0.5);
            animation: dialogScaleIn 0.25s ease;
        }
        @keyframes dialogScaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        .fraud-confirm-dialog h3 { font-size:16px; margin-bottom:8px; }
        .fraud-confirm-dialog p { font-size:13px; color:var(--text-muted); margin-bottom:24px; line-height:1.6; }
        .fraud-confirm-actions { display:flex; gap:10px; justify-content:flex-end; }
        .fraud-confirm-actions button {
            padding:10px 20px; border-radius:10px; font-size:12px; font-weight:700;
            cursor:pointer; transition:all 0.2s; border:none;
        }
        .fraud-btn-cancel { background:var(--bg-dark); color:var(--text-muted); border:1px solid var(--border) !important; }
        .fraud-btn-cancel:hover { border-color:var(--text-muted) !important; color:var(--text); }
        .fraud-btn-danger { background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; }
        .fraud-btn-danger:hover { box-shadow:0 4px 16px rgba(239,68,68,0.35); }
        .fraud-btn-success { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }
        .fraud-btn-success:hover { box-shadow:0 4px 16px rgba(34,197,94,0.35); }
        .fraud-btn-warning { background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; }
        .fraud-btn-warning:hover { box-shadow:0 4px 16px rgba(249,115,22,0.35); }
        .fraud-btn-primary { background:linear-gradient(135deg,#06b6d4,#0891b2); color:#fff; }
        .fraud-btn-primary:hover { box-shadow:0 4px 16px rgba(6,182,212,0.35); }

        /* Review Drawer */
        .fraud-drawer {
            position:fixed; top:0; right:0; bottom:0; width:520px; max-width:95vw;
            background:var(--bg-dark); border-left:1px solid var(--border);
            z-index:5001; overflow-y:auto; box-shadow:-20px 0 60px rgba(0,0,0,0.5);
            animation: drawerSlideIn 0.35s ease;
        }
        @keyframes drawerSlideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes drawerSlideOut { to { transform:translateX(100%); } }
        .drawer-header {
            position:sticky; top:0; z-index:10; background:var(--bg-dark);
            border-bottom:1px solid var(--border); padding:20px 24px;
            display:flex; justify-content:space-between; align-items:center;
        }
        .drawer-header h3 { font-size:16px; font-weight:800; }
        .drawer-close {
            background:none; border:1px solid var(--border); color:var(--text-muted);
            width:32px; height:32px; border-radius:8px; cursor:pointer;
            display:flex; align-items:center; justify-content:center; font-size:16px;
            transition:all 0.2s;
        }
        .drawer-close:hover { border-color:var(--accent-red); color:var(--accent-red); }
        .drawer-body { padding:24px; }
        .drawer-section { margin-bottom:24px; }
        .drawer-section-title {
            font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px;
            color:var(--text-muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border);
        }
        .drawer-field { display:flex; justify-content:space-between; padding:6px 0; font-size:12px; }
        .drawer-field .label { color:var(--text-muted); }
        .drawer-field .value { font-weight:600; color:var(--text); }
        .drawer-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .drawer-tag {
            font-size:10px; padding:4px 10px; border-radius:6px; font-weight:600;
            background:rgba(239,68,68,0.12); color:#fca5a5;
        }
        .risk-progress-bar {
            width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:4px;
            overflow:hidden; margin-top:6px;
        }
        .risk-progress-fill {
            height:100%; border-radius:4px; transition:width 0.6s ease;
        }
        .timeline-list { }
        .timeline-item {
            display:flex; gap:12px; padding:10px 0; border-bottom:1px solid rgba(51,65,85,0.3);
            font-size:11px;
        }
        .timeline-item:last-child { border-bottom:none; }
        .timeline-time { color:var(--text-dim); font-family:'JetBrains Mono',monospace; font-size:10px; min-width:55px; }
        .timeline-desc { color:var(--text); }
        .timeline-dot {
            width:8px; height:8px; border-radius:50%; margin-top:4px; flex-shrink:0;
        }
        .drawer-actions {
            padding:20px 24px; border-top:1px solid var(--border);
            display:flex; gap:10px; position:sticky; bottom:0; background:var(--bg-dark);
        }
        .drawer-actions button { flex:1; padding:12px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all 0.2s; }

        /* Escalate Modal */
        .escalate-modal {
            background:var(--bg-card); border:1px solid var(--border); border-radius:16px;
            padding:28px 32px; max-width:480px; width:90%;
            box-shadow:0 25px 60px rgba(0,0,0,0.5);
            animation: dialogScaleIn 0.25s ease;
        }
        .escalate-modal h3 { font-size:16px; margin-bottom:16px; }
        .escalate-levels { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
        .escalate-level {
            padding:12px 16px; border:1px solid var(--border); border-radius:10px;
            cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:12px; font-size:12px;
        }
        .escalate-level:hover { border-color:var(--accent-orange); background:rgba(249,115,22,0.05); }
        .escalate-level.selected { border-color:var(--accent-orange); background:rgba(249,115,22,0.1); }
        .escalate-level .level-num {
            width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center;
            font-weight:800; font-size:12px;
        }
        .escalate-level .level-desc { font-size:11px; color:var(--text-muted); margin-top:2px; }
        .escalate-notes {
            width:100%; min-height:80px; padding:12px; background:var(--bg-input); border:1px solid var(--border);
            border-radius:10px; color:var(--text); font-size:12px; resize:vertical; outline:none; font-family:'Inter',sans-serif;
            margin-bottom:16px;
        }
        .escalate-notes:focus { border-color:var(--accent-orange); }

        /* Status badges in feed */
        .feed-status-badge {
            font-size:9px; font-weight:700; padding:2px 8px; border-radius:4px; margin-left:auto;
        }
        .feed-status-blocked { background:rgba(239,68,68,0.15); color:#fca5a5; }
        .feed-status-whitelisted { background:rgba(34,197,94,0.15); color:#86efac; }
        .feed-status-escalated { background:rgba(249,115,22,0.15); color:#fdba74; }
        .feed-status-reviewed { background:rgba(6,182,212,0.15); color:#67e8f9; }
    `;
    document.head.appendChild(style);
}

// Make toast globally available for other admin sections
window.showAdminToast = showAdminToast;

// ═══════════════════════════════════════════════════
// HELPER: Generate enriched event details for the drawer
// ═══════════════════════════════════════════════════
function generateEventDetails(event) {
    const paymentMethods = ['UPI - GPay', 'UPI - PhonePe', 'Credit Card - Visa', 'Debit Card - RuPay', 'Net Banking - HDFC', 'Wallet - Paytm'];
    const browsers = ['Chrome 120', 'Safari 17', 'Firefox 121', 'Edge 120', 'Headless Chrome'];
    const osOptions = ['Windows 11', 'macOS 14', 'Android 14', 'iOS 17', 'Linux Ubuntu'];
    const flagReasons = [
        'VPN Detected', 'Multiple Accounts', 'Rapid Orders', 'IP Mismatch',
        'Bot Signature', 'Disposable Email', 'Card BIN Mismatch', 'Velocity Anomaly'
    ];

    // Pick 2-4 random flag reasons
    const flags = [];
    const numFlags = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...flagReasons].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numFlags; i++) flags.push(shuffled[i]);

    const orderId = `ORD-${String(10000 + Math.floor(Math.random() * 90000)).padStart(6, '0')}`;
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const os = osOptions[Math.floor(Math.random() * osOptions.length)];

    // Generate timeline
    const now = event.timestamp || new Date();
    const timeline = [
        { time: formatTimeOnly(new Date(now - 300000)), action: 'Session started from ' + event.ip, type: 'info' },
        { time: formatTimeOnly(new Date(now - 240000)), action: 'Browsed 12 products in 45 seconds', type: 'warning' },
        { time: formatTimeOnly(new Date(now - 180000)), action: 'Added 3 items to cart (₹' + (event.amount * 0.6).toFixed(0) + ')', type: 'info' },
        { time: formatTimeOnly(new Date(now - 120000)), action: 'Changed shipping address twice', type: 'warning' },
        { time: formatTimeOnly(new Date(now - 60000)),  action: 'Payment attempt with ' + paymentMethod, type: 'info' },
        { time: formatTimeOnly(now), action: event.action + ' — flagged by ML model (Risk: ' + event.riskScore + ')', type: 'critical' }
    ];

    return {
        ...event,
        email: (event.userName || 'user').toLowerCase().replace(/\s/g, '.') + Math.floor(Math.random()*99) + '@gmail.com',
        orderId,
        paymentMethod,
        browser,
        os,
        flags,
        timeline,
        blockHistory: event.status === 'blocked' ? [
            { date: formatDateShort(new Date(now - 86400000 * 5)), reason: 'Auto-blocked by ML', admin: 'System' },
            { date: formatDateShort(now), reason: event.reason || 'Manual review', admin: 'Admin' }
        ] : []
    };
}

function formatTimeOnly(d) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatDateShort(d) {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ═══════════════════════════════════════════════════
// OVERLAY / MODAL SYSTEM
// ═══════════════════════════════════════════════════
function closeAllOverlays() {
    document.querySelectorAll('.fraud-overlay, .fraud-drawer-overlay').forEach(el => {
        el.style.animation = 'overlayFadeOut 0.25s ease forwards';
        const drawer = el.querySelector('.fraud-drawer');
        if (drawer) drawer.style.animation = 'drawerSlideOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    });
}

function onEscKey(e) {
    if (e.key === 'Escape') closeAllOverlays();
}

// ═══════════════════════════════════════════════════
// ACTION: REVIEW — Opens right-side drawer with full details
// ═══════════════════════════════════════════════════
function handleReview(eventId) {
    const event = activityFeedData.find(e => e.id === eventId);
    if (!event) return;

    const details = generateEventDetails(event);
    const riskColor = event.riskScore > 85 ? '#ef4444' : event.riskScore > 70 ? '#f97316' : event.riskScore > 55 ? '#eab308' : '#06b6d4';
    const isReadOnly = false;

    openReviewDrawer(event, details, riskColor, isReadOnly);
}

function openReviewDrawer(event, details, riskColor, isReadOnly) {
    closeAllOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'fraud-overlay fraud-drawer-overlay';
    overlay.style.cssText = 'background:rgba(0,0,0,0.4);backdrop-filter:blur(2px);';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllOverlays(); });

    const statusLabel = event.status === 'blocked' ? '<span class="feed-status-badge feed-status-blocked">🔴 BLOCKED</span>' :
                        event.status === 'whitelisted' ? '<span class="feed-status-badge feed-status-whitelisted">✅ SAFE</span>' :
                        event.status === 'escalated' ? '<span class="feed-status-badge feed-status-escalated">🔺 ESCALATED</span>' :
                        '<span class="feed-status-badge" style="background:rgba(234,179,8,0.15);color:#fde047;">⏳ PENDING</span>';

    overlay.innerHTML = `
        <div class="fraud-drawer">
            <div class="drawer-header">
                <h3>🔍 ${isReadOnly ? 'User Details' : 'Transaction Review'} ${statusLabel}</h3>
                <button class="drawer-close" onclick="window._fraudCloseOverlay()">✕</button>
            </div>
            <div class="drawer-body">
                <!-- User Info -->
                <div class="drawer-section">
                    <div class="drawer-section-title">User Information</div>
                    <div class="drawer-field"><span class="label">User ID</span><span class="value" style="color:var(--accent-cyan);font-family:'JetBrains Mono',monospace;">${event.userId}</span></div>
                    <div class="drawer-field"><span class="label">Name</span><span class="value">${event.userName || 'Unknown'}</span></div>
                    <div class="drawer-field"><span class="label">Email</span><span class="value" style="font-size:11px;">${details.email}</span></div>
                    <div class="drawer-field"><span class="label">City</span><span class="value">${event.city || details.city || 'N/A'}</span></div>
                </div>

                <!-- Order / Transaction Info -->
                <div class="drawer-section">
                    <div class="drawer-section-title">Transaction Details</div>
                    <div class="drawer-field"><span class="label">Order ID</span><span class="value" style="font-family:'JetBrains Mono',monospace;">${details.orderId}</span></div>
                    <div class="drawer-field"><span class="label">Amount</span><span class="value" style="color:var(--accent-cyan);font-weight:800;">₹${(event.amount || 0).toLocaleString('en-IN')}</span></div>
                    <div class="drawer-field"><span class="label">Payment</span><span class="value">${details.paymentMethod}</span></div>
                    <div class="drawer-field"><span class="label">Action</span><span class="value">${event.action}</span></div>
                </div>

                <!-- Risk Score -->
                <div class="drawer-section">
                    <div class="drawer-section-title">Risk Assessment</div>
                    <div class="drawer-field">
                        <span class="label">ML Risk Score</span>
                        <span class="value" style="color:${riskColor};font-weight:900;font-size:18px;font-family:'JetBrains Mono',monospace;">${event.riskScore}</span>
                    </div>
                    <div class="risk-progress-bar">
                        <div class="risk-progress-fill" style="width:${event.riskScore}%;background:${riskColor};"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:4px;">
                        <span>0 — Safe</span><span>50 — Moderate</span><span>100 — Critical</span>
                    </div>
                </div>

                <!-- Flag Reasons -->
                <div class="drawer-section">
                    <div class="drawer-section-title">Flag Reasons</div>
                    <div class="drawer-tags">
                        ${details.flags.map(f => `<span class="drawer-tag">${f}</span>`).join('')}
                    </div>
                    <div style="margin-top:10px;font-size:11px;color:var(--text-muted);line-height:1.6;">
                        ${event.reason}
                    </div>
                </div>

                <!-- Device Info -->
                <div class="drawer-section">
                    <div class="drawer-section-title">Device & Network</div>
                    <div class="drawer-field"><span class="label">IP Address</span><span class="value" style="font-family:'JetBrains Mono',monospace;">${event.ip}</span></div>
                    <div class="drawer-field"><span class="label">Browser</span><span class="value">${details.browser}</span></div>
                    <div class="drawer-field"><span class="label">OS</span><span class="value">${details.os}</span></div>
                </div>

                <!-- Session Timeline -->
                <div class="drawer-section">
                    <div class="drawer-section-title">Session Activity Timeline</div>
                    <div class="timeline-list">
                        ${details.timeline.map(t => {
                            const dotColor = t.type === 'critical' ? '#ef4444' : t.type === 'warning' ? '#f97316' : '#06b6d4';
                            return `
                                <div class="timeline-item">
                                    <div class="timeline-dot" style="background:${dotColor};"></div>
                                    <div class="timeline-time">${t.time}</div>
                                    <div class="timeline-desc">${t.action}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                ${event.blockHistory && event.blockHistory.length > 0 ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Block History</div>
                    ${event.blockHistory.map(b => `
                        <div style="padding:8px 12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:8px;margin-bottom:6px;font-size:11px;">
                            <div style="display:flex;justify-content:space-between;">
                                <span style="color:var(--accent-red);font-weight:600;">${b.reason}</span>
                                <span style="color:var(--text-dim);">${b.date}</span>
                            </div>
                            <div style="color:var(--text-muted);margin-top:2px;">By: ${b.admin}</div>
                        </div>
                    `).join('')}
                </div>` : ''}
            </div>

            <div class="drawer-actions">
                ${isReadOnly ? `
                    <button class="fraud-btn-danger" onclick="window._fraudUnblockFromDrawer('${event.userId}')">🔓 Unblock User</button>
                    <button class="fraud-btn-cancel" onclick="window._fraudCloseOverlay()">Close</button>
                ` : `
                    <button class="fraud-btn-danger" onclick="window._fraudCloseOverlay(); window._fraudBlockUser('${event.id}', '${event.userId}')">🚫 Confirm Block</button>
                    <button class="fraud-btn-success" onclick="window._fraudCloseOverlay(); window._fraudWhitelist('${event.id}', '${event.userId}')">✅ Mark as Safe</button>
                `}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onEscKey);

    // Mark as reviewed in feed
    if (!isReadOnly && event.status === 'pending') {
        event.status = 'reviewed';
        refreshFeedRow(event);
    }
}

// ═══════════════════════════════════════════════════
// ACTION: BLOCK USER — Confirmation + State Update
// ═══════════════════════════════════════════════════
function handleBlockUser(eventId, userId) {
    closeAllOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'fraud-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllOverlays(); });

    overlay.innerHTML = `
        <div class="fraud-confirm-dialog">
            <h3>🚫 Block User</h3>
            <p>Are you sure you want to block <strong style="color:var(--accent-red);font-family:'JetBrains Mono',monospace;">${userId}</strong>?<br>
            This will prevent all future transactions from this account.</p>
            <div class="fraud-confirm-actions">
                <button class="fraud-btn-cancel" onclick="window._fraudCloseOverlay()">Cancel</button>
                <button class="fraud-btn-danger" onclick="window._fraudConfirmBlock('${eventId}', '${userId}')">Block User</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onEscKey);
}

function confirmBlock(eventId, userId) {
    closeAllOverlays();

    // Update event in feed
    const event = activityFeedData.find(e => e.id === eventId);
    if (event) {
        event.status = 'blocked';
        refreshFeedRow(event);
    }

    // Add to blocked users state
    const name = event?.userName || 'Unknown User';
    const email = (name).toLowerCase().replace(/\s/g, '.') + Math.floor(Math.random()*99) + '@gmail.com';
    const alreadyBlocked = blockedUsersState.some(b => b.id === userId);
    if (!alreadyBlocked) {
        blockedUsersState.push({
            id: userId,
            name: name,
            email: email,
            reason: event?.reason || 'Manual block from activity feed',
            blockedDate: new Date(),
            riskScore: event?.riskScore || 85,
            ordersBlocked: Math.floor(Math.random() * 5) + 1,
            amountBlocked: event?.amount || Math.floor(Math.random() * 50000) + 5000
        });
    }

    // Refresh blocked list if currently viewing it
    renderBlockedUsers();

    showAdminToast(`User ${userId} has been blocked`, 'block');
}

// ═══════════════════════════════════════════════════
// ACTION: WHITELIST — Confirmation + State Update
// ═══════════════════════════════════════════════════
function handleWhitelist(eventId, userId) {
    closeAllOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'fraud-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllOverlays(); });

    overlay.innerHTML = `
        <div class="fraud-confirm-dialog">
            <h3>✅ Whitelist User</h3>
            <p>Mark this transaction as safe and whitelist <strong style="color:var(--accent-green);font-family:'JetBrains Mono',monospace;">${userId}</strong>?<br>
            Future transactions from this user will not trigger alerts.</p>
            <div class="fraud-confirm-actions">
                <button class="fraud-btn-cancel" onclick="window._fraudCloseOverlay()">Cancel</button>
                <button class="fraud-btn-success" onclick="window._fraudConfirmWhitelist('${eventId}', '${userId}')">Whitelist User</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onEscKey);
}

function confirmWhitelist(eventId, userId) {
    closeAllOverlays();

    // Update event status
    const event = activityFeedData.find(e => e.id === eventId);
    if (event) {
        event.status = 'whitelisted';
        refreshFeedRow(event);
    }

    // Add to whitelisted state
    const name = event?.userName || 'Unknown User';
    const alreadyWhitelisted = whitelistedState.some(w => w.id === userId);
    if (!alreadyWhitelisted) {
        whitelistedState.push({
            id: userId,
            name: name,
            email: name.toLowerCase().replace(/\s/g, '.') + Math.floor(Math.random()*99) + '@gmail.com',
            reason: 'Cleared by admin review',
            whitelistedDate: new Date(),
            riskScore: event?.riskScore || 30
        });
    }

    // Also remove from blocked if there
    blockedUsersState = blockedUsersState.filter(b => b.id !== userId);

    renderBlockedUsers();
    showAdminToast(`User ${userId} whitelisted successfully`, 'success');
}

// ═══════════════════════════════════════════════════
// ACTION: ESCALATE — Level selection modal
// ═══════════════════════════════════════════════════
function handleEscalate(eventId, userId) {
    closeAllOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'fraud-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllOverlays(); });

    overlay.innerHTML = `
        <div class="escalate-modal">
            <h3>⚠️ Escalate Transaction</h3>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Select escalation level for <strong style="color:var(--accent-orange);">${userId}</strong></p>

            <div class="escalate-levels">
                <div class="escalate-level" data-level="1" onclick="window._fraudSelectEscLevel(this, 1)">
                    <div class="level-num" style="background:rgba(234,179,8,0.15);color:#eab308;">1</div>
                    <div>
                        <div style="font-weight:700;">Flag for Manual Review</div>
                        <div class="level-desc">Add to review queue for senior analyst</div>
                    </div>
                </div>
                <div class="escalate-level" data-level="2" onclick="window._fraudSelectEscLevel(this, 2)">
                    <div class="level-num" style="background:rgba(249,115,22,0.15);color:#f97316;">2</div>
                    <div>
                        <div style="font-weight:700;">Notify Senior Admin</div>
                        <div class="level-desc">Send alert to risk management team</div>
                    </div>
                </div>
                <div class="escalate-level" data-level="3" onclick="window._fraudSelectEscLevel(this, 3)">
                    <div class="level-num" style="background:rgba(239,68,68,0.15);color:#ef4444;">3</div>
                    <div>
                        <div style="font-weight:700;">Freeze Account Immediately</div>
                        <div class="level-desc">Block user + freeze pending transactions</div>
                    </div>
                </div>
            </div>

            <textarea class="escalate-notes" id="escalateNotes" placeholder="Add notes for the reviewer (optional)..."></textarea>

            <div class="fraud-confirm-actions">
                <button class="fraud-btn-cancel" onclick="window._fraudCloseOverlay()">Cancel</button>
                <button class="fraud-btn-warning" id="escalateSubmitBtn" onclick="window._fraudConfirmEscalate('${eventId}', '${userId}')" disabled style="opacity:0.5;">Submit Escalation</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onEscKey);
}

let selectedEscalationLevel = 0;

window._fraudSelectEscLevel = function(el, level) {
    selectedEscalationLevel = level;
    document.querySelectorAll('.escalate-level').forEach(l => l.classList.remove('selected'));
    el.classList.add('selected');
    const btn = document.getElementById('escalateSubmitBtn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
};

function confirmEscalate(eventId, userId) {
    const level = selectedEscalationLevel;
    const notes = document.getElementById('escalateNotes')?.value || '';
    closeAllOverlays();

    const event = activityFeedData.find(e => e.id === eventId);
    if (event) {
        event.status = 'escalated';
        event.escalationLevel = level;
        refreshFeedRow(event);
    }

    // If level 3, also auto-block
    if (level === 3) {
        if (event) event.status = 'blocked';
        const name = event?.userName || 'Unknown';
        const alreadyBlocked = blockedUsersState.some(b => b.id === userId);
        if (!alreadyBlocked) {
            blockedUsersState.push({
                id: userId,
                name: name,
                email: name.toLowerCase().replace(/\s/g, '.') + Math.floor(Math.random()*99) + '@gmail.com',
                reason: `Level 3 escalation — account frozen${notes ? ': ' + notes : ''}`,
                blockedDate: new Date(),
                riskScore: event?.riskScore || 90,
                ordersBlocked: Math.floor(Math.random() * 5) + 1,
                amountBlocked: event?.amount || Math.floor(Math.random() * 50000) + 5000
            });
        }
        renderBlockedUsers();
        refreshFeedRow(event);
    }

    selectedEscalationLevel = 0;
    showAdminToast(`Transaction escalated to Level ${level}`, 'escalate');
}

// ═══════════════════════════════════════════════════
// ACTION: UNBLOCK — Confirmation + State Update
// ═══════════════════════════════════════════════════
function handleUnblock(userId) {
    closeAllOverlays();

    const overlay = document.createElement('div');
    overlay.className = 'fraud-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllOverlays(); });

    overlay.innerHTML = `
        <div class="fraud-confirm-dialog">
            <h3>🔓 Unblock User</h3>
            <p>Are you sure you want to unblock <strong style="color:var(--accent-cyan);font-family:'JetBrains Mono',monospace;">${userId}</strong>?<br>
            The user will be moved to the Watchlist with a "Recently Unblocked" tag.</p>
            <div class="fraud-confirm-actions">
                <button class="fraud-btn-cancel" onclick="window._fraudCloseOverlay()">Cancel</button>
                <button class="fraud-btn-primary" onclick="window._fraudConfirmUnblock('${userId}')">Unblock User</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onEscKey);
}

function confirmUnblock(userId) {
    closeAllOverlays();

    // Find user in blocked list
    const blocked = blockedUsersState.find(b => b.id === userId);
    if (blocked) {
        // Move to watchlist
        watchlistState.push({
            id: blocked.id,
            name: blocked.name,
            email: blocked.email,
            reason: '🔄 Recently Unblocked — ' + blocked.reason,
            addedDate: new Date(),
            riskScore: blocked.riskScore - 10,
            ordersMonitored: 0
        });
    }

    // Remove from blocked
    blockedUsersState = blockedUsersState.filter(b => b.id !== userId);

    // Also update any matching feed events
    activityFeedData.forEach(e => {
        if (e.userId === userId && e.status === 'blocked') {
            e.status = 'pending';
            refreshFeedRow(e);
        }
    });

    renderBlockedUsers();
    showAdminToast(`User ${userId} has been unblocked`, 'success');
}

// ═══════════════════════════════════════════════════
// ACTION: VIEW — Read-only drawer for blocked user
// ═══════════════════════════════════════════════════
function handleViewBlockedUser(userId) {
    const blocked = blockedUsersState.find(b => b.id === userId);
    if (!blocked) return;

    // Create a synthetic event for the drawer
    const syntheticEvent = {
        id: 'view-' + userId,
        userId: blocked.id,
        userName: blocked.name,
        city: 'N/A',
        ip: Math.floor(Math.random()*223+1) + '.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*254+1),
        amount: blocked.amountBlocked,
        action: 'Account Blocked',
        riskScore: blocked.riskScore,
        reason: blocked.reason,
        severity: blocked.riskScore > 85 ? 'critical' : 'high',
        status: 'blocked',
        timestamp: blocked.blockedDate,
        blockHistory: [
            { date: formatDateShort(blocked.blockedDate), reason: blocked.reason, admin: 'Admin' }
        ]
    };

    const details = generateEventDetails(syntheticEvent);
    details.blockHistory = syntheticEvent.blockHistory; // Preserve the real block history
    const riskColor = blocked.riskScore > 85 ? '#ef4444' : blocked.riskScore > 70 ? '#f97316' : '#eab308';

    openReviewDrawer(syntheticEvent, details, riskColor, true);
}

// ═══════════════════════════════════════════════════
// FEED ROW UPDATER — Refreshes a single row in the feed
// ═══════════════════════════════════════════════════
function refreshFeedRow(event) {
    // Re-render the entire feed to avoid complex DOM manipulation
    renderActivityFeed();
}

// ═══════════════════════════════════════════════════
// REGISTER GLOBAL ACTION HANDLERS
// ═══════════════════════════════════════════════════
window._fraudReview = (eventId) => handleReview(eventId);
window._fraudBlockUser = (eventId, userId) => handleBlockUser(eventId, userId);
window._fraudWhitelist = (eventId, userId) => handleWhitelist(eventId, userId);
window._fraudEscalate = (eventId, userId) => handleEscalate(eventId, userId);
window._fraudUnblock = (userId) => handleUnblock(userId);
window._fraudViewBlocked = (userId) => handleViewBlockedUser(userId);
window._fraudCloseOverlay = () => closeAllOverlays();
window._fraudConfirmBlock = (eventId, userId) => confirmBlock(eventId, userId);
window._fraudConfirmWhitelist = (eventId, userId) => confirmWhitelist(eventId, userId);
window._fraudConfirmEscalate = (eventId, userId) => confirmEscalate(eventId, userId);
window._fraudConfirmUnblock = (userId) => confirmUnblock(userId);
window._fraudUnblockFromDrawer = (userId) => { closeAllOverlays(); handleUnblock(userId); };

// ═══════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════
export function renderFraudDashboard(container) {
    injectToastStyles();
    activityFeedData = generateFlaggedEvents(40);
    blockedUsersState = generateBlockedUsers(15);
    watchlistState = generateWatchlist(10);
    whitelistedState = [];

    container.innerHTML = `
        <div class="fraud-dash">
            <!-- HEADER -->
            <div class="fraud-header">
                <div>
                    <h2>🛡️ Fraud Detection & Risk Intelligence</h2>
                    <p class="page-subtitle">Enterprise Security Operations Center · Real-time ML-powered monitoring</p>
                </div>
                <div class="fraud-header-actions">
                    <span class="system-status"><span class="pulse-dot"></span> System Active</span>
                    <button class="attack-btn" id="simulateAttackBtn">🔴 Simulate Attack</button>
                </div>
            </div>

            <!-- 1. THREAT METER -->
            <div class="threat-section" id="threatMeterSection"></div>

            <!-- 2. KPI CARDS -->
            <div class="kpi-section" id="kpiSection"></div>

            <!-- 3. ACTIVITY FEED + 4. HEATMAP -->
            <div class="fraud-row-2">
                <div class="fraud-panel panel-feed" id="activityFeedSection">
                    <h3 class="panel-title">⚡ Real-Time Suspicious Activity</h3>
                    <div id="activityFeedList" class="feed-list"></div>
                </div>
                <div class="fraud-panel panel-heatmap" id="heatmapSection">
                    <h3 class="panel-title">🗓️ Fraud Heatmap — Hour × Day</h3>
                    <div id="heatmapGrid"></div>
                </div>
            </div>

            <!-- 5. RISK DISTRIBUTION + 6. FRAUD TYPE -->
            <div class="fraud-row-2">
                <div class="fraud-panel" id="riskDistSection">
                    <h3 class="panel-title">📊 ML Risk Score Distribution</h3>
                    <div id="riskDistContent"></div>
                </div>
                <div class="fraud-panel" id="fraudTypeSection">
                    <h3 class="panel-title">🧩 Fraud Type Breakdown</h3>
                    <canvas id="fraudTypeChart" height="260"></canvas>
                </div>
            </div>

            <!-- 7. GEO MAP + 8. DEVICE PANEL -->
            <div class="fraud-row-2">
                <div class="fraud-panel panel-geo" id="geoSection">
                    <h3 class="panel-title">🗺️ Geo-Intelligence Map</h3>
                    <div id="geoMapContent"></div>
                </div>
                <div class="fraud-panel panel-device" id="deviceSection">
                    <h3 class="panel-title">🖥️ Device & Behavior Fingerprints</h3>
                    <div id="devicePanelContent"></div>
                </div>
            </div>

            <!-- 9. BLOCKED USERS -->
            <div class="fraud-panel" id="blockedSection">
                <div class="blocked-tabs">
                    <button class="tab-btn active" data-tab="blocked" onclick="window._switchBlockedTab('blocked')">🚫 Blocked Users</button>
                    <button class="tab-btn" data-tab="watchlist" onclick="window._switchBlockedTab('watchlist')">👁️ Watchlist</button>
                    <button class="tab-btn" data-tab="whitelisted" onclick="window._switchBlockedTab('whitelisted')">✅ Whitelisted</button>
                </div>
                <div id="blockedContent"></div>
            </div>

            <!-- 10. TREND CHART -->
            <div class="fraud-panel" id="trendSection">
                <h3 class="panel-title">📈 30-Day Fraud Trend</h3>
                <canvas id="trendChart" height="120"></canvas>
            </div>
        </div>
    `;

    // Render all components
    renderThreatMeter();
    renderKPICards();
    renderActivityFeed();
    renderHeatmap();
    renderRiskDistribution();
    renderFraudTypeChart();
    renderGeoMap();
    renderDevicePanel();
    renderBlockedUsers();
    renderTrendChart();

    // Bind simulate attack
    document.getElementById('simulateAttackBtn')?.addEventListener('click', toggleAttackSimulation);
}

// ═══════════════════════════════════════════════════
// 1. THREAT METER — Animated SVG Gauge
// ═══════════════════════════════════════════════════
function renderThreatMeter() {
    const section = document.getElementById('threatMeterSection');
    if (!section) return;

    section.innerHTML = `
        <div class="threat-meter-card">
            <div class="gauge-container">
                <svg viewBox="0 0 200 120" class="gauge-svg">
                    <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#22c55e"/>
                            <stop offset="33%" style="stop-color:#eab308"/>
                            <stop offset="66%" style="stop-color:#f97316"/>
                            <stop offset="100%" style="stop-color:#ef4444"/>
                        </linearGradient>
                    </defs>
                    <!-- Background arc -->
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" stroke-linecap="round"/>
                    <!-- Active arc -->
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" stroke-width="12" stroke-linecap="round"
                        stroke-dasharray="251.2" stroke-dashoffset="${251.2 - (threatLevel / 100) * 251.2}" id="gaugeArc" class="gauge-arc"/>
                    <!-- Needle -->
                    <line x1="100" y1="100" x2="100" y2="30" stroke="#fff" stroke-width="2" stroke-linecap="round"
                        transform="rotate(${-90 + (threatLevel / 100) * 180}, 100, 100)" id="gaugeNeedle" class="gauge-needle"/>
                    <circle cx="100" cy="100" r="5" fill="#fff"/>
                </svg>
                <div class="gauge-labels">
                    <span class="g-low">LOW</span>
                    <span class="g-elev">ELEVATED</span>
                    <span class="g-high">HIGH</span>
                    <span class="g-crit">CRITICAL</span>
                </div>
            </div>
            <div class="threat-info">
                <div class="threat-score" id="threatScore">${threatLevel}</div>
                <div class="threat-label" id="threatLabel">${getThreatLabel(threatLevel)}</div>
                <div class="threat-sub">Composite ML Risk Score</div>
            </div>
        </div>
    `;
}

function getThreatLabel(level) {
    if (level < 25) return '🟢 LOW RISK';
    if (level < 50) return '🟡 ELEVATED';
    if (level < 75) return '🟠 HIGH RISK';
    return '🔴 CRITICAL';
}

function getThreatColor(level) {
    if (level < 25) return '#22c55e';
    if (level < 50) return '#eab308';
    if (level < 75) return '#f97316';
    return '#ef4444';
}

function updateThreatMeter(level) {
    threatLevel = Math.min(100, Math.max(0, level));
    const arc = document.getElementById('gaugeArc');
    const needle = document.getElementById('gaugeNeedle');
    const score = document.getElementById('threatScore');
    const label = document.getElementById('threatLabel');

    if (arc) arc.style.strokeDashoffset = 251.2 - (threatLevel / 100) * 251.2;
    if (needle) needle.setAttribute('transform', `rotate(${-90 + (threatLevel / 100) * 180}, 100, 100)`);
    if (score) { score.textContent = threatLevel; score.style.color = getThreatColor(threatLevel); }
    if (label) { label.textContent = getThreatLabel(threatLevel); }

    // Pulse effect on critical
    const card = document.querySelector('.threat-meter-card');
    if (card) {
        card.classList.toggle('threat-pulse', threatLevel >= 75);
        card.style.borderColor = getThreatColor(threatLevel) + '44';
        card.style.boxShadow = `0 0 30px ${getThreatColor(threatLevel)}22`;
    }
}

// ═══════════════════════════════════════════════════
// 2. KPI CARDS with Sparklines
// ═══════════════════════════════════════════════════
function renderKPICards() {
    const section = document.getElementById('kpiSection');
    if (!section) return;

    const kpi = generateKPIData();

    const cards = [
        { label: 'Orders Today', value: kpi.ordersToday, prefix: '', suffix: '', sub: `${kpi.flaggedToday} flagged`, sparkline: kpi.sparklines.orders, color: '#06b6d4' },
        { label: 'Fraud Rate', value: kpi.fraudRate, prefix: '', suffix: '%', sub: `${kpi.rateChange > 0 ? '↑' : '↓'} ${Math.abs(kpi.rateChange)}% vs yesterday`, sparkline: kpi.sparklines.fraudRate, color: parseFloat(kpi.rateChange) > 0 ? '#ef4444' : '#22c55e', subColor: parseFloat(kpi.rateChange) > 0 ? '#ef4444' : '#22c55e' },
        { label: 'Amount at Risk', value: '₹' + (kpi.amountAtRisk / 1000).toFixed(0) + 'K', prefix: '', suffix: '', sub: 'Flagged order value', sparkline: kpi.sparklines.amountAtRisk, color: '#f97316' },
        { label: 'Auto-Blocked', value: kpi.autoBlocked, prefix: '', suffix: '', sub: 'Transactions blocked', sparkline: kpi.sparklines.autoBlocked, color: '#ef4444' },
        { label: 'False Positive Rate', value: (kpi.falsePositiveRate * 100).toFixed(0), prefix: '', suffix: '%', sub: 'Manual review accuracy', sparkline: kpi.sparklines.falsePositive, color: '#a855f7' }
    ];

    section.innerHTML = `
        <div class="kpi-grid">
            ${cards.map((c, i) => `
                <div class="kpi-card">
                    <div class="kpi-top">
                        <span class="kpi-label">${c.label}</span>
                        <canvas class="sparkline-canvas" id="spark${i}" width="80" height="30"></canvas>
                    </div>
                    <div class="kpi-value" style="color:${c.color}">${c.prefix}${c.value}${c.suffix}</div>
                    <div class="kpi-sub" ${c.subColor ? `style="color:${c.subColor}"` : ''}>${c.sub}</div>
                </div>
            `).join('')}
        </div>
    `;

    // Draw sparklines
    cards.forEach((c, i) => {
        const canvas = document.getElementById(`spark${i}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const data = c.sparkline;
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const w = canvas.width;
        const h = canvas.height;
        const step = w / (data.length - 1);

        ctx.beginPath();
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        data.forEach((v, j) => {
            const x = j * step;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill area
        ctx.lineTo((data.length - 1) * step, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = c.color + '15';
        ctx.fill();
    });
}

// ═══════════════════════════════════════════════════
// 3. REAL-TIME ACTIVITY FEED — Now with functional buttons
// ═══════════════════════════════════════════════════
function renderActivityFeed() {
    const list = document.getElementById('activityFeedList');
    if (!list) return;

    list.innerHTML = activityFeedData.slice(0, 25).map(e => createFeedRow(e)).join('');
}

function createFeedRow(e) {
    const sevColors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#06b6d4' };
    const color = sevColors[e.severity] || '#94a3b8';

    // Status badge
    let statusBadge = '';
    if (e.status === 'blocked') statusBadge = '<span class="feed-status-badge feed-status-blocked">🔴 BLOCKED</span>';
    else if (e.status === 'whitelisted') statusBadge = '<span class="feed-status-badge feed-status-whitelisted">✅ SAFE</span>';
    else if (e.status === 'escalated') statusBadge = '<span class="feed-status-badge feed-status-escalated">🔺 ESCALATED</span>';
    else if (e.status === 'reviewed') statusBadge = '<span class="feed-status-badge feed-status-reviewed">👁️ REVIEWED</span>';

    // Dynamic buttons based on status
    let actionButtons = '';
    if (e.status === 'blocked') {
        actionButtons = `
            <button class="feed-btn review" onclick="window._fraudReview('${e.id}')">Review</button>
            <button class="feed-btn" onclick="window._fraudUnblock('${e.userId}')" style="color:#6b7280;border-color:#374151;">Unblock</button>
        `;
    } else if (e.status === 'whitelisted') {
        actionButtons = `
            <button class="feed-btn review" onclick="window._fraudReview('${e.id}')">Review</button>
        `;
    } else {
        actionButtons = `
            <button class="feed-btn review" onclick="window._fraudReview('${e.id}')">Review</button>
            <button class="feed-btn block" onclick="window._fraudBlockUser('${e.id}', '${e.userId}')">Block User</button>
            <button class="feed-btn whitelist" onclick="window._fraudWhitelist('${e.id}', '${e.userId}')">Whitelist</button>
            <button class="feed-btn escalate" onclick="window._fraudEscalate('${e.id}', '${e.userId}')">Escalate</button>
        `;
    }

    return `
        <div class="feed-row ${e.isAttack ? 'feed-attack' : ''} ${e.status === 'blocked' ? 'row-flagged' : ''} ${e.status === 'whitelisted' ? '' : ''}" style="border-left-color:${color}" data-event-id="${e.id}">
            <div class="feed-top">
                <span class="feed-time">${e.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span class="feed-user">${e.userId}</span>
                <span class="feed-action">${e.action}</span>
                <span class="feed-risk" style="background:${color}22;color:${color}">${e.riskScore}</span>
                <span class="feed-severity sev-${e.severity}">${e.severity.toUpperCase()}</span>
                ${statusBadge}
            </div>
            <div class="feed-reason">${e.reason}</div>
            <div class="feed-meta">${e.city} · ₹${e.amount.toLocaleString('en-IN')} · ${e.ip}</div>
            <div class="feed-actions">
                ${actionButtons}
            </div>
        </div>
    `;
}

function addEventToFeed(event) {
    activityFeedData.unshift(event);
    const list = document.getElementById('activityFeedList');
    if (!list) return;
    const temp = document.createElement('div');
    temp.innerHTML = createFeedRow(event);
    const row = temp.firstElementChild;
    row.style.animation = 'feedSlideIn 0.4s ease';
    list.insertBefore(row, list.firstChild);
    // Keep only 25 rows
    while (list.children.length > 25) list.removeChild(list.lastChild);
}

// ═══════════════════════════════════════════════════
// 4. FRAUD HEATMAP — Hour × Day grid
// ═══════════════════════════════════════════════════
function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;

    const data = generateHeatmapData();
    const maxCount = Math.max(...data.map(d => d.count));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    let html = '<div class="heatmap-container">';
    // Hour labels
    html += '<div class="heatmap-row heatmap-header"><div class="heatmap-day-label"></div>';
    for (let h = 0; h < 24; h++) {
        html += `<div class="heatmap-hour-label">${h % 3 === 0 ? h + ':00' : ''}</div>`;
    }
    html += '</div>';

    // Data rows
    days.forEach((day, di) => {
        html += `<div class="heatmap-row"><div class="heatmap-day-label">${day}</div>`;
        for (let h = 0; h < 24; h++) {
            const cell = data.find(d => d.dayIndex === di && d.hour === h);
            const intensity = cell ? cell.count / maxCount : 0;
            const bg = intensity === 0 ? 'rgba(255,255,255,0.03)' :
                       intensity < 0.25 ? 'rgba(6,182,212,0.2)' :
                       intensity < 0.5 ? 'rgba(234,179,8,0.35)' :
                       intensity < 0.75 ? 'rgba(249,115,22,0.5)' :
                       'rgba(239,68,68,0.7)';
            html += `<div class="heatmap-cell" style="background:${bg}" title="${day} ${h}:00 — ${cell?.count || 0} fraud attempts"></div>`;
        }
        html += '</div>';
    });
    html += '</div>';
    grid.innerHTML = html;
}

// ═══════════════════════════════════════════════════
// 5. RISK SCORE DISTRIBUTION with Threshold Slider
// ═══════════════════════════════════════════════════
function renderRiskDistribution() {
    const content = document.getElementById('riskDistContent');
    if (!content) return;

    const buckets = generateRiskDistribution();
    const maxCount = Math.max(...buckets.map(b => b.count));
    let threshold = 65;

    function getAffectedCount(thresh) {
        return buckets.filter(b => b.min >= thresh).reduce((s, b) => s + b.count, 0);
    }

    content.innerHTML = `
        <div class="risk-dist-chart">
            ${buckets.map(b => {
                const height = (b.count / maxCount) * 150;
                const isAbove = b.min >= threshold;
                return `
                    <div class="risk-bar-col" title="${b.range}: ${b.count} orders">
                        <div class="risk-bar" style="height:${height}px; background:${isAbove ? '#ef4444' : '#06b6d4'}" data-min="${b.min}"></div>
                        <div class="risk-bar-label">${b.range}</div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="threshold-control">
            <label>Auto-flag Threshold: <strong id="threshVal">${threshold}</strong></label>
            <input type="range" min="10" max="95" value="${threshold}" id="thresholdSlider" class="threshold-slider">
            <div class="threshold-info">
                <span>🚩 <strong id="affectedCount">${getAffectedCount(threshold)}</strong> orders affected</span>
                <span class="text-muted">Orders with risk ≥ threshold will be auto-flagged</span>
            </div>
        </div>
    `;

    document.getElementById('thresholdSlider')?.addEventListener('input', (e) => {
        threshold = parseInt(e.target.value);
        document.getElementById('threshVal').textContent = threshold;
        document.getElementById('affectedCount').textContent = getAffectedCount(threshold);
        // Update bar colors
        document.querySelectorAll('.risk-bar').forEach(bar => {
            const min = parseInt(bar.dataset.min);
            bar.style.background = min >= threshold ? '#ef4444' : '#06b6d4';
        });
    });
}

// ═══════════════════════════════════════════════════
// 6. FRAUD TYPE BREAKDOWN — Doughnut Chart
// ═══════════════════════════════════════════════════
function renderFraudTypeChart() {
    const ctx = document.getElementById('fraudTypeChart');
    if (!ctx || !window.Chart) return;

    const data = generateFraudTypeBreakdown();

    new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.type),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => d.color),
                borderColor: '#0f172a',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', boxWidth: 12, padding: 12, font: { size: 11 } }
                }
            },
            animation: { animateRotate: true, duration: 1200 }
        }
    });
}

// ═══════════════════════════════════════════════════
// 7. GEO-INTELLIGENCE MAP
// ═══════════════════════════════════════════════════
function renderGeoMap() {
    const content = document.getElementById('geoMapContent');
    if (!content) return;

    const geoData = generateGeoData();
    const maxFraud = Math.max(...geoData.map(g => g.fraudCount));

    content.innerHTML = `
        <div class="geo-layout">
            <div class="geo-visual">
                <div class="india-map-placeholder">
                    ${geoData.slice(0, 12).map(city => {
                        const x = ((city.lng - 68) / (97 - 68)) * 280 + 10;
                        const y = ((35 - city.lat) / (35 - 8)) * 320 + 15;
                        const size = Math.max(12, (city.fraudCount / maxFraud) * 45);
                        const color = city.fraudCount > maxFraud * 0.7 ? '#ef4444' :
                                     city.fraudCount > maxFraud * 0.4 ? '#f97316' : '#06b6d4';
                        return `<div class="geo-bubble" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color}44;border:2px solid ${color}" title="${city.name}: ${city.fraudCount} fraud attempts">
                            <span class="geo-label">${city.name.substring(0, 3)}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            <div class="geo-table-wrap">
                <table class="geo-table">
                    <thead><tr><th>City</th><th>State</th><th>Fraud</th><th>Total</th><th>Rate</th></tr></thead>
                    <tbody>
                        ${geoData.map(g => `
                            <tr>
                                <td>${g.name}</td>
                                <td class="text-muted">${g.state}</td>
                                <td><span class="risk-badge risk-${g.fraudCount > maxFraud * 0.7 ? 'critical' : g.fraudCount > maxFraud * 0.4 ? 'high' : 'low'}">${g.fraudCount}</span></td>
                                <td>${g.totalOrders}</td>
                                <td>${g.fraudRate}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════
// 8. DEVICE & BEHAVIOR FINGERPRINT PANEL
// ═══════════════════════════════════════════════════
function renderDevicePanel() {
    const content = document.getElementById('devicePanelContent');
    if (!content) return;

    const devices = generateDeviceFingerprints(20);

    content.innerHTML = `
        <div class="device-table-wrap">
            <table class="admin-table device-table">
                <thead>
                    <tr>
                        <th>Device ID</th>
                        <th>IP</th>
                        <th>OS / Browser</th>
                        <th>City</th>
                        <th>Risk</th>
                        <th>Flags</th>
                        <th>Sessions</th>
                    </tr>
                </thead>
                <tbody>
                    ${devices.map(d => `
                        <tr>
                            <td class="mono" style="font-size:10px;">${d.deviceId.substring(0, 16)}…</td>
                            <td class="mono">${d.ip}</td>
                            <td>${d.os}<br><span class="text-muted" style="font-size:10px;">${d.browser}</span></td>
                            <td>${d.city}</td>
                            <td><span class="risk-badge risk-${d.riskScore > 80 ? 'critical' : d.riskScore > 60 ? 'high' : d.riskScore > 40 ? 'medium' : 'low'}">${d.riskScore}</span></td>
                            <td class="device-flags">
                                ${d.vpn ? '<span class="dev-flag flag-vpn">🔴 VPN</span>' : ''}
                                ${d.multiAccount ? `<span class="dev-flag flag-multi">🟠 ${d.accountsLinked} Accts</span>` : ''}
                                ${d.headless ? '<span class="dev-flag flag-headless">🟡 Headless</span>' : ''}
                            </td>
                            <td>${d.sessions}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ═══════════════════════════════════════════════════
// 9. BLOCKED USERS, WATCHLIST & WHITELISTED — with actions
// ═══════════════════════════════════════════════════
function renderBlockedUsers() {
    const content = document.getElementById('blockedContent');
    if (!content) return;

    if (currentBlockedTab === 'blocked') {
        if (blockedUsersState.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">No blocked users</div>';
            return;
        }
        content.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Reason</th><th>Risk</th><th>Blocked $</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${blockedUsersState.map(b => `
                        <tr>
                            <td class="mono">${b.id}</td>
                            <td>${b.name}</td>
                            <td class="mono text-muted" style="font-size:11px;">${b.email}</td>
                            <td style="max-width:180px;font-size:11px;">${b.reason}</td>
                            <td><span class="risk-badge risk-critical">${b.riskScore}</span></td>
                            <td class="amount">₹${b.amountBlocked.toLocaleString('en-IN')}</td>
                            <td class="date-cell">${b.blockedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td>
                                <button class="action-btn-sm" onclick="window._fraudViewBlocked('${b.id}')" style="margin-right:4px;">View</button>
                                <button class="action-btn-sm" onclick="window._fraudUnblock('${b.id}')">Unblock</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (currentBlockedTab === 'watchlist') {
        if (watchlistState.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">No users on watchlist</div>';
            return;
        }
        content.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Reason</th><th>Risk</th><th>Monitored Orders</th><th>Added</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${watchlistState.map(w => `
                        <tr>
                            <td class="mono">${w.id}</td>
                            <td>${w.name}</td>
                            <td class="mono text-muted" style="font-size:11px;">${w.email}</td>
                            <td style="max-width:180px;font-size:11px;">${w.reason}</td>
                            <td><span class="risk-badge risk-high">${w.riskScore}</span></td>
                            <td>${w.ordersMonitored}</td>
                            <td class="date-cell">${w.addedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td>
                                <button class="action-btn-sm danger" onclick="window._fraudBlockWatchlistUser('${w.id}')">Block</button>
                                <button class="action-btn-sm" onclick="window._fraudRemoveWatchlist('${w.id}')">Remove</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (currentBlockedTab === 'whitelisted') {
        if (whitelistedState.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">No whitelisted users yet. Whitelist users from the activity feed.</div>';
            return;
        }
        content.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Reason</th><th>Risk (Original)</th><th>Whitelisted On</th><th>Action</th></tr>
                </thead>
                <tbody>
                    ${whitelistedState.map(w => `
                        <tr>
                            <td class="mono">${w.id}</td>
                            <td>${w.name}</td>
                            <td class="mono text-muted" style="font-size:11px;">${w.email}</td>
                            <td style="font-size:11px;">${w.reason}</td>
                            <td><span class="risk-badge risk-low">${w.riskScore}</span></td>
                            <td class="date-cell">${w.whitelistedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td>
                                <button class="action-btn-sm danger" onclick="window._fraudRevokeWhitelist('${w.id}')">Revoke</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

window._switchBlockedTab = function(tab) {
    currentBlockedTab = tab;
    document.querySelectorAll('.blocked-tabs .tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    renderBlockedUsers();
};

// Watchlist actions
window._fraudBlockWatchlistUser = function(userId) {
    const user = watchlistState.find(w => w.id === userId);
    if (!user) return;

    blockedUsersState.push({
        id: user.id,
        name: user.name,
        email: user.email,
        reason: 'Moved from watchlist: ' + user.reason,
        blockedDate: new Date(),
        riskScore: user.riskScore + 15,
        ordersBlocked: user.ordersMonitored,
        amountBlocked: Math.floor(Math.random() * 50000) + 5000
    });

    watchlistState = watchlistState.filter(w => w.id !== userId);
    renderBlockedUsers();
    showAdminToast(`User ${userId} blocked from watchlist`, 'block');
};

window._fraudRemoveWatchlist = function(userId) {
    watchlistState = watchlistState.filter(w => w.id !== userId);
    renderBlockedUsers();
    showAdminToast(`User ${userId} removed from watchlist`, 'success');
};

window._fraudRevokeWhitelist = function(userId) {
    whitelistedState = whitelistedState.filter(w => w.id !== userId);
    renderBlockedUsers();
    showAdminToast(`Whitelist revoked for ${userId}`, 'warning');
};

// ═══════════════════════════════════════════════════
// 10. FRAUD TREND LINE CHART — 30 days
// ═══════════════════════════════════════════════════
function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx || !window.Chart) return;

    const trendData = generateTrendData(30);

    new window.Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(d => d.date),
            datasets: [
                {
                    label: 'Total Transactions',
                    data: trendData.map(d => d.total),
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6,182,212,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1,
                    borderWidth: 2
                },
                {
                    label: 'Flagged',
                    data: trendData.map(d => d.flagged),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249,115,22,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1,
                    borderWidth: 2
                },
                {
                    label: 'Blocked',
                    data: trendData.map(d => d.blocked),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#94a3b8', boxWidth: 12, padding: 16, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        afterBody: function(items) {
                            const idx = items[0]?.dataIndex;
                            const ann = trendData[idx]?.annotation;
                            return ann ? `📌 ${ann}` : '';
                        }
                    }
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 15 } }
            },
            animation: { duration: 1500 }
        }
    });
}

// ═══════════════════════════════════════════════════
// SIMULATE ATTACK
// ═══════════════════════════════════════════════════
function toggleAttackSimulation() {
    const btn = document.getElementById('simulateAttackBtn');
    if (!btn) return;

    if (isAttackMode) {
        // Stop attack
        isAttackMode = false;
        clearInterval(attackInterval);
        attackInterval = null;
        btn.textContent = '🔴 Simulate Attack';
        btn.classList.remove('attack-active');
        // Gradually lower threat
        const cooldown = setInterval(() => {
            if (threatLevel <= 35) { clearInterval(cooldown); return; }
            updateThreatMeter(threatLevel - 2);
        }, 200);
    } else {
        // Start attack
        isAttackMode = true;
        btn.textContent = '⏹️ Stop Simulation';
        btn.classList.add('attack-active');

        // Ramp up threat meter
        const rampUp = setInterval(() => {
            if (threatLevel >= 92) { clearInterval(rampUp); return; }
            updateThreatMeter(threatLevel + 3);
        }, 150);

        // Inject attack events
        attackInterval = setInterval(() => {
            if (!isAttackMode) return;
            const event = generateAttackEvent();
            addEventToFeed(event);
        }, 1200);
    }
}
