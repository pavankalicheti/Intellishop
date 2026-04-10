// admin/admin-app.js — Main entry point, routing, auth
import { renderOrdersPage, renderUsersPage, renderProductsPage, renderSalesPage, renderSettingsPage } from './admin-pages.js';
import { renderFraudDashboard } from './fraud-dashboard.js';

// ═══════════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════════
const ADMIN_CREDS = {
    email: 'admin@intellishop.com',
    password: 'admin123'
};

function isAdminLoggedIn() {
    return localStorage.getItem('intellishop_admin_session') === 'authenticated';
}

function adminLogin(email, password) {
    if (email === ADMIN_CREDS.email && password === ADMIN_CREDS.password) {
        localStorage.setItem('intellishop_admin_session', 'authenticated');
        localStorage.setItem('intellishop_admin_email', email);
        return true;
    }
    return false;
}

function adminLogout() {
    localStorage.removeItem('intellishop_admin_session');
    localStorage.removeItem('intellishop_admin_email');
    showLoginPage();
}

// ═══════════════════════════════════════════════════
// PAGE DEFINITIONS
// ═══════════════════════════════════════════════════
const PAGES = {
    'fraud': { label: '🛡️ Fraud Intelligence', icon: '🛡️', render: renderFraudDashboard },
    'orders': { label: '📦 Orders', icon: '📦', render: renderOrdersPage },
    'users': { label: '👥 Users', icon: '👥', render: renderUsersPage },
    'products': { label: '🛍️ Products', icon: '🛍️', render: renderProductsPage },
    'sales': { label: '📊 Sales Overview', icon: '📊', render: renderSalesPage },
    'settings': { label: '⚙️ Settings', icon: '⚙️', render: renderSettingsPage }
};

let currentPage = 'fraud';

// ═══════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════
function showLoginPage() {
    document.getElementById('admin-app').innerHTML = `
        <div class="admin-login-page">
            <div class="admin-login-card">
                <div class="login-logo">
                    <div class="login-icon">🛡️</div>
                    <h1>IntelliShop Admin</h1>
                    <p>Fraud Intelligence & Management Console</p>
                </div>
                <form id="adminLoginForm">
                    <div class="login-field">
                        <label>Email</label>
                        <input type="email" id="adminEmail" placeholder="admin@intellishop.com" value="admin@intellishop.com" required>
                    </div>
                    <div class="login-field">
                        <label>Password</label>
                        <input type="password" id="adminPassword" placeholder="Enter password" value="admin123" required>
                    </div>
                    <button type="submit" class="login-submit">Access Admin Panel</button>
                    <div id="loginError" class="login-error" style="display:none;">Invalid credentials</div>
                </form>
                <div class="login-footer">
                    <p>🔒 Secure admin access only</p>
                    <p class="login-hint">Demo: admin@intellishop.com / admin123</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        if (adminLogin(email, password)) {
            showAdminDashboard();
        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    });
}

function showAdminDashboard() {
    const app = document.getElementById('admin-app');
    app.innerHTML = `
        <div class="admin-layout">
            <!-- SIDEBAR -->
            <aside class="admin-sidebar" id="adminSidebar">
                <div class="sidebar-brand">
                    <span class="sidebar-logo">🛡️</span>
                    <span class="sidebar-title">IntelliShop</span>
                    <span class="sidebar-sub">Admin Console</span>
                </div>
                <nav class="sidebar-nav" id="sidebarNav">
                    ${Object.entries(PAGES).map(([key, page]) => `
                        <a href="#" class="nav-item ${key === currentPage ? 'active' : ''}" data-page="${key}">
                            <span class="nav-icon">${page.icon}</span>
                            <span class="nav-label">${page.label}</span>
                            ${key === 'fraud' ? '<span class="nav-badge">LIVE</span>' : ''}
                        </a>
                    `).join('')}
                </nav>
                <div class="sidebar-footer">
                    <div class="admin-user">
                        <div class="admin-avatar">A</div>
                        <div>
                            <div class="admin-name">Admin</div>
                            <div class="admin-email">${localStorage.getItem('intellishop_admin_email') || 'admin'}</div>
                        </div>
                    </div>
                    <button class="logout-btn" id="adminLogoutBtn">Sign Out</button>
                    <a href="index.html" class="back-to-store">← Back to Store</a>
                </div>
            </aside>

            <!-- MAIN CONTENT -->
            <main class="admin-main">
                <header class="admin-topbar">
                    <button class="sidebar-toggle" id="sidebarToggle">☰</button>
                    <div class="topbar-title" id="topbarTitle">${PAGES[currentPage].label}</div>
                    <div class="topbar-right">
                        <span class="topbar-time" id="topbarTime"></span>
                        <span class="topbar-status"><span class="pulse-dot"></span> Live</span>
                    </div>
                </header>
                <div class="admin-content" id="adminContent">
                    <!-- Page content rendered here -->
                </div>
            </main>
        </div>
    `;

    // Bind navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(item.dataset.page);
        });
    });

    // Bind logout
    document.getElementById('adminLogoutBtn')?.addEventListener('click', adminLogout);

    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('adminSidebar')?.classList.toggle('collapsed');
    });

    // Update clock
    function updateClock() {
        const el = document.getElementById('topbarTime');
        if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Render initial page
    renderPage(currentPage);
}

function navigateToPage(pageKey) {
    if (!PAGES[pageKey]) return;
    currentPage = pageKey;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageKey);
    });

    // Update title
    const title = document.getElementById('topbarTitle');
    if (title) title.textContent = PAGES[pageKey].label;

    renderPage(pageKey);
}

function renderPage(pageKey) {
    const content = document.getElementById('adminContent');
    if (!content) return;
    content.innerHTML = '<div class="page-loading"><div class="loader"></div></div>';

    // Small delay for loading animation
    setTimeout(() => {
        PAGES[pageKey].render(content);
    }, 150);
}

// ═══════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════
function init() {
    if (isAdminLoggedIn()) {
        showAdminDashboard();
    } else {
        showLoginPage();
    }
}

init();
