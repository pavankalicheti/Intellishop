// fraud-admin.js — Admin Dashboard for Fraud Review
import { getFraudEvents, getFlaggedOrders, getFraudStats, updateFraudEventReview } from './fraud-detection.js';
import { showToast } from './ui.js';
import { getCurrentUser } from './auth.js';

export function initFraudAdmin() {
    document.addEventListener('page:fraud-admin', renderFraudDashboard);
}

function renderFraudDashboard() {
    const container = document.getElementById('fraud-admin-container');
    if (!container) return;

    const user = getCurrentUser();
    if (!user) {
        container.innerHTML = `<p style="text-align:center;padding:40px;color:var(--muted);">Please login to access the admin dashboard.</p>`;
        return;
    }

    const stats = getFraudStats();
    const events = getFraudEvents();
    const flagged = getFlaggedOrders();

    container.innerHTML = `
        <!-- STATS CARDS -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-bottom:30px;">
            <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5); border:1px solid #a7f3d0; border-radius:14px; padding:20px;">
                <div style="font-size:12px;color:#065f46;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Total Scanned</div>
                <div style="font-size:36px;font-weight:900;color:#047857;margin-top:4px;">${stats.total}</div>
                <div style="font-size:11px;color:#065f46;margin-top:4px;">All-time transactions</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a); border:1px solid #fcd34d; border-radius:14px; padding:20px;">
                <div style="font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Flagged</div>
                <div style="font-size:36px;font-weight:900;color:#b45309;margin-top:4px;">${stats.flaggedCount}</div>
                <div style="font-size:11px;color:#92400e;margin-top:4px;">${stats.pendingReview} pending review</div>
            </div>
            <div style="background:linear-gradient(135deg,#fee2e2,#fecaca); border:1px solid #fca5a5; border-radius:14px; padding:20px;">
                <div style="font-size:12px;color:#991b1b;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Blocked</div>
                <div style="font-size:36px;font-weight:900;color:#dc2626;margin-top:4px;">${stats.blocked}</div>
                <div style="font-size:11px;color:#991b1b;margin-top:4px;">Auto-blocked by ML</div>
            </div>
            <div style="background:linear-gradient(135deg,#ede9fe,#ddd6fe); border:1px solid #c4b5fd; border-radius:14px; padding:20px;">
                <div style="font-size:12px;color:#5b21b6;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Fraud Rate</div>
                <div style="font-size:36px;font-weight:900;color:#7c3aed;margin-top:4px;">${stats.fraudRate}%</div>
                <div style="font-size:11px;color:#5b21b6;margin-top:4px;">Avg. risk score: ${stats.avgScore}</div>
            </div>
        </div>

        <!-- CHARTS ROW -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:30px;">
            <div style="background:#fff; border:1px solid var(--border); border-radius:14px; padding:20px;">
                <h4 style="margin-bottom:15px;">Risk Score Distribution</h4>
                <canvas id="riskDistChart" style="max-height:220px;"></canvas>
            </div>
            <div style="background:#fff; border:1px solid var(--border); border-radius:14px; padding:20px;">
                <h4 style="margin-bottom:15px;">Decision Breakdown</h4>
                <canvas id="decisionPieChart" style="max-height:220px;"></canvas>
            </div>
        </div>

        <!-- MODEL PERFORMANCE -->
        <div style="background:#fff; border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:30px;">
            <h4 style="margin-bottom:15px;">ML Model Performance</h4>
            <div style="display:grid; grid-template-columns: repeat(5,1fr); gap:12px; text-align:center;">
                ${renderModelMetric('Isolation Forest', stats.total >= 10 ? 'Active' : 'Bootstrap', stats.total >= 10 ? '#10b981' : '#f59e0b')}
                ${renderModelMetric('Behavioral Biometrics', 'Collecting', '#10b981')}
                ${renderModelMetric('Device Fingerprint', 'Active', '#10b981')}
                ${renderModelMetric('Graph Analysis', Object.keys(JSON.parse(localStorage.getItem('intellishop_fraud_fingerprints') || '{}')).length + ' devices', '#6366f1')}
                ${renderModelMetric('Last Retrained', stats.total > 0 ? 'Auto' : 'Pending', '#8b5cf6')}
            </div>
        </div>

        <!-- FLAGGED TRANSACTIONS TABLE -->
        <div style="background:#fff; border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:30px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h4>Flagged & Blocked Transactions</h4>
                <span style="font-size:12px; color:var(--muted);">${flagged.length} total</span>
            </div>
            ${flagged.length === 0 ? '<p style="color:var(--muted);text-align:center;padding:30px;">No flagged transactions yet. Transactions will appear here when the ML model detects suspicious activity.</p>' : `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border); text-align:left;">
                            <th style="padding:10px 8px;">ID</th>
                            <th style="padding:10px 8px;">User</th>
                            <th style="padding:10px 8px;">Amount</th>
                            <th style="padding:10px 8px;">Risk Score</th>
                            <th style="padding:10px 8px;">Decision</th>
                            <th style="padding:10px 8px;">Breakdown</th>
                            <th style="padding:10px 8px;">Time</th>
                            <th style="padding:10px 8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${flagged.slice().reverse().map(f => `
                            <tr style="border-bottom:1px solid var(--border); ${f.adminReview === 'rejected' ? 'background:#fef2f2;' : f.adminReview === 'approved' ? 'background:#f0fdf4;' : ''}">
                                <td style="padding:10px 8px;font-weight:bold;">${f.id}</td>
                                <td style="padding:10px 8px;">
                                    <div>${f.userName}</div>
                                    <div style="font-size:11px;color:var(--muted);">${f.email}</div>
                                </td>
                                <td style="padding:10px 8px;font-weight:bold;">₹${f.amount}</td>
                                <td style="padding:10px 8px;">
                                    <span style="display:inline-block; background:${getRiskColor(f.riskScore)}; color:#fff; padding:3px 10px; border-radius:20px; font-weight:bold; font-size:12px;">
                                        ${f.riskScore}/100
                                    </span>
                                </td>
                                <td style="padding:10px 8px;">
                                    <span style="font-weight:600;">${f.decisionLabel}</span>
                                </td>
                                <td style="padding:10px 8px;">
                                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                        ${renderMiniBar('IF', f.breakdown.isolationForest)}
                                        ${renderMiniBar('WF', f.breakdown.weightedFeatures)}
                                        ${renderMiniBar('VL', f.breakdown.velocity)}
                                        ${renderMiniBar('GR', f.breakdown.graphAnalysis)}
                                    </div>
                                </td>
                                <td style="padding:10px 8px;font-size:11px;color:var(--muted);">
                                    ${new Date(f.timestamp).toLocaleString()}
                                </td>
                                <td style="padding:10px 8px;">
                                    ${f.adminReview ? `<span style="font-weight:bold;color:${f.adminReview === 'approved' ? '#10b981' : '#ef4444'};">${f.adminReview.toUpperCase()}</span>` : `
                                        <div style="display:flex; gap:6px;">
                                            <button onclick="window._fraudAdminAction('${f.id}','approved')" style="padding:4px 10px; border-radius:6px; border:1px solid #10b981; background:#ecfdf5; color:#047857; font-size:11px; font-weight:bold; cursor:pointer;">Approve</button>
                                            <button onclick="window._fraudAdminAction('${f.id}','rejected')" style="padding:4px 10px; border-radius:6px; border:1px solid #ef4444; background:#fef2f2; color:#dc2626; font-size:11px; font-weight:bold; cursor:pointer;">Reject</button>
                                        </div>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`}
        </div>

        <!-- ALL EVENTS LOG -->
        <div style="background:#fff; border:1px solid var(--border); border-radius:14px; padding:20px;">
            <h4 style="margin-bottom:15px;">Recent Transaction Log</h4>
            ${events.length === 0 ? '<p style="color:var(--muted);text-align:center;padding:20px;">No transactions recorded yet.</p>' : `
            <div style="max-height:300px; overflow-y:auto;">
                ${events.slice().reverse().slice(0, 20).map(e => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f3f4f6;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-size:18px;">${getDecisionIcon(e.decision)}</span>
                            <div>
                                <div style="font-weight:600; font-size:13px;">${e.userName} — ₹${e.amount}</div>
                                <div style="font-size:11px; color:var(--muted);">${new Date(e.timestamp).toLocaleString()} · ${e.paymentMethod}</div>
                            </div>
                        </div>
                        <span style="background:${getRiskColor(e.riskScore)}; color:#fff; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:bold;">
                            ${e.riskScore}
                        </span>
                    </div>
                `).join('')}
            </div>`}
        </div>
    `;

    // Setup admin action handlers
    window._fraudAdminAction = function(eventId, decision) {
        updateFraudEventReview(eventId, decision);
        showToast(`Transaction ${decision === 'approved' ? 'approved ✅' : 'rejected ❌'}`);
        renderFraudDashboard(); // Re-render
    };

    // Render charts
    setTimeout(() => {
        renderRiskDistributionChart(events);
        renderDecisionPieChart(stats);
    }, 100);
}


// ═══════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════

function getRiskColor(score) {
    if (score <= 30) return '#10b981';
    if (score <= 65) return '#f59e0b';
    if (score <= 85) return '#f97316';
    return '#ef4444';
}

function getDecisionIcon(decision) {
    const icons = { allow: '✅', challenge: '⚠️', flag: '🔶', block: '🛑' };
    return icons[decision] || '❓';
}

function renderModelMetric(label, value, color) {
    return `
        <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px;">
            <div style="font-size:11px; color:var(--muted); margin-bottom:4px;">${label}</div>
            <div style="font-size:14px; font-weight:700; color:${color};">${value}</div>
        </div>
    `;
}

function renderMiniBar(label, value) {
    const color = value <= 30 ? '#10b981' : value <= 65 ? '#f59e0b' : '#ef4444';
    return `
        <div style="text-align:center;" title="${label}: ${value}/100">
            <div style="font-size:9px; color:var(--muted);">${label}</div>
            <div style="width:36px; height:4px; background:#e5e7eb; border-radius:2px; margin-top:2px;">
                <div style="width:${Math.min(value, 100)}%; height:100%; background:${color}; border-radius:2px;"></div>
            </div>
        </div>
    `;
}


// ═══════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════

function renderRiskDistributionChart(events) {
    const ctx = document.getElementById('riskDistChart');
    if (!ctx || !window.Chart) return;

    // Bucket scores into ranges
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0-10, 10-20, ..., 90-100
    events.forEach(e => {
        const idx = Math.min(Math.floor(e.riskScore / 10), 9);
        buckets[idx]++;
    });

    if (window._riskDistChart) window._riskDistChart.destroy();
    window._riskDistChart = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'],
            datasets: [{
                label: 'Transactions',
                data: buckets,
                backgroundColor: [
                    '#10b981', '#10b981', '#10b981',
                    '#f59e0b', '#f59e0b', '#f59e0b',
                    '#f97316', '#f97316',
                    '#ef4444', '#ef4444'
                ],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderDecisionPieChart(stats) {
    const ctx = document.getElementById('decisionPieChart');
    if (!ctx || !window.Chart) return;

    if (window._decisionPieChart) window._decisionPieChart.destroy();
    window._decisionPieChart = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Allowed', 'Challenged', 'Flagged', 'Blocked'],
            datasets: [{
                data: [stats.allowed, stats.challenged, stats.flaggedCount, stats.blocked],
                backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 12, weight: 'bold' } }
                }
            }
        }
    });
}
