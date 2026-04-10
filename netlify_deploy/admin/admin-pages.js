// admin/admin-pages.js — Orders, Users, Products, Sales, Settings
import { generateOrders, generateUsers, getProducts, getSalesOverview } from './mock-data.js';

// ═══════════════════════════════════════════════════
// ORDERS MANAGEMENT
// ═══════════════════════════════════════════════════
export function renderOrdersPage(container) {
    const orders = generateOrders(120);
    const flagged = orders.filter(o => o.isFlagged).length;
    const totalRev = orders.reduce((s, o) => s + o.amount, 0);

    container.innerHTML = `
        <div class="admin-page-header">
            <div>
                <h2>📦 Orders Management</h2>
                <p class="page-subtitle">${orders.length} total orders · ${flagged} flagged · ₹${totalRev.toLocaleString('en-IN')} revenue</p>
            </div>
            <div class="header-actions">
                <input type="text" id="orderSearch" placeholder="Search orders..." class="admin-search">
                <select id="orderFilter" class="admin-select">
                    <option value="all">All Status</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Processing">Processing</option>
                    <option value="Flagged">Flagged</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Returned">Returned</option>
                </select>
            </div>
        </div>
        <div class="admin-table-wrap">
            <table class="admin-table" id="ordersTable">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>City</th>
                        <th>Risk</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                        <tr class="${o.isFlagged ? 'row-flagged' : ''}">
                            <td class="mono">${o.id}</td>
                            <td>${o.customer}</td>
                            <td class="amount">₹${o.amount.toLocaleString('en-IN')}</td>
                            <td><span class="payment-tag">${o.payment.split(' - ')[0]}</span></td>
                            <td>${o.city}</td>
                            <td><span class="risk-badge risk-${o.riskScore > 80 ? 'critical' : o.riskScore > 60 ? 'high' : o.riskScore > 40 ? 'medium' : 'low'}">${o.riskScore}</span></td>
                            <td><span class="status-tag status-${o.status.toLowerCase()}">${o.status}</span></td>
                            <td class="date-cell">${o.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td><button class="action-btn-sm" onclick="window._viewOrder('${o.id}')">View</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Search/filter
    document.getElementById('orderSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#ordersTable tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });
    document.getElementById('orderFilter')?.addEventListener('change', (e) => {
        const val = e.target.value;
        document.querySelectorAll('#ordersTable tbody tr').forEach(row => {
            if (val === 'all') { row.style.display = ''; return; }
            const status = row.querySelector('.status-tag')?.textContent;
            row.style.display = status === val ? '' : 'none';
        });
    });
}

window._viewOrder = function(id) {
    alert(`Order Detail: ${id}\n(Full order detail modal coming soon)`);
};

// ═══════════════════════════════════════════════════
// USERS MANAGEMENT
// ═══════════════════════════════════════════════════
export function renderUsersPage(container) {
    const users = generateUsers(60);
    const active = users.filter(u => u.status === 'Active').length;
    const blocked = users.filter(u => u.status === 'Blocked').length;

    container.innerHTML = `
        <div class="admin-page-header">
            <div>
                <h2>👥 Users Management</h2>
                <p class="page-subtitle">${users.length} users · ${active} active · ${blocked} blocked</p>
            </div>
            <div class="header-actions">
                <input type="text" id="userSearch" placeholder="Search users..." class="admin-search">
                <select id="userFilter" class="admin-select">
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Watchlist">Watchlist</option>
                    <option value="Blocked">Blocked</option>
                </select>
            </div>
        </div>
        <div class="admin-table-wrap">
            <table class="admin-table" id="usersTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>City</th>
                        <th>Orders</th>
                        <th>Spent</th>
                        <th>Risk</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr class="${u.status === 'Blocked' ? 'row-flagged' : u.status === 'Watchlist' ? 'row-watch' : ''}">
                            <td class="mono">${u.id}</td>
                            <td>${u.name}</td>
                            <td class="mono text-muted">${u.email}</td>
                            <td>${u.city}</td>
                            <td>${u.orders}</td>
                            <td class="amount">₹${u.totalSpent.toLocaleString('en-IN')}</td>
                            <td><span class="risk-badge risk-${u.riskScore > 80 ? 'critical' : u.riskScore > 60 ? 'high' : u.riskScore > 40 ? 'medium' : 'low'}">${u.riskScore}</span></td>
                            <td><span class="status-tag status-${u.status.toLowerCase()}">${u.status}</span></td>
                            <td>
                                ${u.status !== 'Blocked' ? `<button class="action-btn-sm danger" onclick="alert('User ${u.id} blocked')">Block</button>` : `<button class="action-btn-sm" onclick="alert('User ${u.id} unblocked')">Unblock</button>`}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#usersTable tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });
    document.getElementById('userFilter')?.addEventListener('change', (e) => {
        const val = e.target.value;
        document.querySelectorAll('#usersTable tbody tr').forEach(row => {
            if (val === 'all') { row.style.display = ''; return; }
            const status = row.querySelector('.status-tag')?.textContent;
            row.style.display = status === val ? '' : 'none';
        });
    });
}

// ═══════════════════════════════════════════════════
// PRODUCTS MANAGEMENT
// ═══════════════════════════════════════════════════
export function renderProductsPage(container) {
    const products = getProducts();
    const totalStock = products.reduce((s, p) => s + p.stock, 0);
    const lowStock = products.filter(p => p.stock < 20).length;

    container.innerHTML = `
        <div class="admin-page-header">
            <div>
                <h2>🛍️ Products Management</h2>
                <p class="page-subtitle">${products.length} products · ${totalStock} total stock · ${lowStock} low stock alerts</p>
            </div>
            <div class="header-actions">
                <input type="text" id="productSearch" placeholder="Search products..." class="admin-search">
            </div>
        </div>
        <div class="admin-table-wrap">
            <table class="admin-table" id="productsTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Sold</th>
                        <th>Rating</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr class="${p.stock < 20 ? 'row-warning' : ''}">
                            <td class="mono">#${p.id}</td>
                            <td>${p.title}</td>
                            <td>${p.brand}</td>
                            <td><span class="category-tag">${p.category}</span></td>
                            <td class="amount">₹${p.price.toLocaleString('en-IN')}</td>
                            <td><span class="${p.stock < 20 ? 'text-danger' : ''}">${p.stock} ${p.stock < 20 ? '⚠️' : ''}</span></td>
                            <td>${p.sold}</td>
                            <td>⭐ ${p.rating}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('productSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#productsTable tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    });
}

// ═══════════════════════════════════════════════════
// SALES OVERVIEW
// ═══════════════════════════════════════════════════
export function renderSalesPage(container) {
    const sales = getSalesOverview();

    container.innerHTML = `
        <div class="admin-page-header">
            <h2>📊 Sales Overview</h2>
        </div>
        <div class="kpi-grid-sales">
            <div class="sales-kpi">
                <div class="sales-kpi-label">Total Revenue</div>
                <div class="sales-kpi-value">₹${(sales.totalRevenue / 100000).toFixed(1)}L</div>
            </div>
            <div class="sales-kpi">
                <div class="sales-kpi-label">Total Orders</div>
                <div class="sales-kpi-value">${sales.totalOrders.toLocaleString('en-IN')}</div>
            </div>
            <div class="sales-kpi">
                <div class="sales-kpi-label">Avg Order Value</div>
                <div class="sales-kpi-value">₹${sales.avgOrderValue.toLocaleString('en-IN')}</div>
            </div>
            <div class="sales-kpi">
                <div class="sales-kpi-label">Conversion Rate</div>
                <div class="sales-kpi-value">${sales.conversionRate}%</div>
            </div>
        </div>

        <div class="sales-charts-grid">
            <div class="chart-card">
                <h3>Monthly Revenue</h3>
                <div>
                    <canvas id="monthlyRevenueChart" width="550" height="280"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h3>Payment Methods</h3>
                <div>
                    <canvas id="paymentMethodChart" width="400" height="280"></canvas>
                </div>
            </div>
        </div>

        <div class="chart-card" style="margin-top:20px;">
            <h3>Top Products by Revenue</h3>
            <div class="top-products-list">
                ${sales.topProducts.map((p, i) => `
                    <div class="top-product-row">
                        <span class="top-rank">#${i + 1}</span>
                        <span class="top-name">${p.name}</span>
                        <div class="top-bar-wrap">
                            <div class="top-bar" style="width:${(p.revenue / sales.topProducts[0].revenue * 100)}%"></div>
                        </div>
                        <span class="top-revenue">₹${(p.revenue / 1000).toFixed(0)}K</span>
                        <span class="top-sold text-muted">${p.sold} sold</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Render charts
    setTimeout(() => {
        // Monthly Revenue Bar Chart
        const revCtx = document.getElementById('monthlyRevenueChart');
        if (revCtx && window.Chart) {
            new window.Chart(revCtx, {
                type: 'bar',
                data: {
                    labels: sales.monthlyRevenue.map(m => m.month),
                    datasets: [{
                        label: 'Revenue (₹)',
                        data: sales.monthlyRevenue.map(m => m.revenue),
                        backgroundColor: 'rgba(6, 182, 212, 0.5)',
                        borderColor: '#06b6d4',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => '₹' + (v/1000) + 'K' } },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    },
                    animation: false
                }
            });
        }

        // Payment Methods Doughnut
        const payCtx = document.getElementById('paymentMethodChart');
        if (payCtx && window.Chart) {
            new window.Chart(payCtx, {
                type: 'doughnut',
                data: {
                    labels: sales.paymentSplit.map(p => p.method),
                    datasets: [{
                        data: sales.paymentSplit.map(p => p.count),
                        backgroundColor: ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#ec4899'],
                        borderColor: '#0f172a',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 12, padding: 10, font: { size: 11 } } }
                    },
                    animation: false
                }
            });
        }
    }, 100);
}

// ═══════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════
export function renderSettingsPage(container) {
    container.innerHTML = `
        <div class="admin-page-header">
            <h2>⚙️ Settings</h2>
        </div>
        <div class="settings-grid">
            <div class="settings-card">
                <h3>🔐 Admin Credentials</h3>
                <div class="settings-field">
                    <label>Admin Email</label>
                    <input type="text" value="admin@intellishop.com" readonly class="admin-input">
                </div>
                <div class="settings-field">
                    <label>Change Password</label>
                    <input type="password" placeholder="New password" class="admin-input">
                </div>
                <button class="admin-btn">Update Password</button>
            </div>

            <div class="settings-card">
                <h3>🛡️ Fraud Detection Settings</h3>
                <div class="settings-field">
                    <label>Auto-flag Threshold</label>
                    <input type="range" min="30" max="90" value="65" class="admin-range" id="settingsThreshold">
                    <span id="settingsThresholdVal">65</span>
                </div>
                <div class="settings-field">
                    <label>Auto-block Threshold</label>
                    <input type="range" min="70" max="100" value="90" class="admin-range" id="settingsBlock">
                    <span id="settingsBlockVal">90</span>
                </div>
                <div class="settings-field">
                    <label class="toggle-label">
                        <input type="checkbox" checked> Enable ML Fraud Scoring
                    </label>
                </div>
                <div class="settings-field">
                    <label class="toggle-label">
                        <input type="checkbox" checked> Enable VPN Detection
                    </label>
                </div>
                <div class="settings-field">
                    <label class="toggle-label">
                        <input type="checkbox" checked> Enable Device Fingerprinting
                    </label>
                </div>
                <button class="admin-btn">Save Settings</button>
            </div>

            <div class="settings-card">
                <h3>📧 Notification Settings</h3>
                <div class="settings-field">
                    <label class="toggle-label">
                        <input type="checkbox" checked> Email alerts for critical fraud
                    </label>
                </div>
                <div class="settings-field">
                    <label class="toggle-label">
                        <input type="checkbox"> Daily fraud summary report
                    </label>
                </div>
                <div class="settings-field">
                    <label class="toggle-label">
                        <input type="checkbox" checked> Real-time push notifications
                    </label>
                </div>
                <button class="admin-btn">Save Preferences</button>
            </div>

            <div class="settings-card">
                <h3>🗄️ Data Management</h3>
                <div class="settings-field">
                    <button class="admin-btn" onclick="alert('Mock data regenerated!')">Regenerate Mock Data</button>
                </div>
                <div class="settings-field">
                    <button class="admin-btn danger" onclick="if(confirm('Clear all localStorage data?')){localStorage.clear();alert('Cleared!')}">Clear All Data</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('settingsThreshold')?.addEventListener('input', (e) => {
        document.getElementById('settingsThresholdVal').textContent = e.target.value;
    });
    document.getElementById('settingsBlock')?.addEventListener('input', (e) => {
        document.getElementById('settingsBlockVal').textContent = e.target.value;
    });
}
