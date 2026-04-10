// ui.js

export function initUI() {
    // Setup modal close events
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if(e.target === el) {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            }
        });
    });
    
    // Logo click goes home
    document.querySelector('.brand').addEventListener('click', () => {
        window.location.hash = '#home';
    });
}

export function navigateTo(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(p => p.style.display = 'none');
    
    // Handle parameterized routes like product-detail:123
    const [page, id] = pageId.split(':');
    
    const targetPage = document.getElementById(`${page}-page`);
    if(targetPage) {
        targetPage.style.display = 'block';
        window.scrollTo(0, 0);
        
        // Dispatch custom event to notify modules
        document.dispatchEvent(new CustomEvent(`page:${page}`, { detail: { id } }));
    } else {
        // Fallback to home
        document.getElementById('home-page').style.display = 'block';
    }

    // Update admin nav link visibility
    const adminLink = document.getElementById('adminNavLink');
    if (adminLink) {
        const user = JSON.parse(localStorage.getItem('intellishop_user') || 'null');
        adminLink.style.display = user ? 'inline' : 'none';
    }
}

export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'flex';
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.style.display = 'none';
}
