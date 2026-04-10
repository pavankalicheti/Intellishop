// app.js — Main entry point
import { initUI } from './ui.js';
import { initAuth } from './auth.js';
import { initProducts } from './products.js?v=9';
import { initCart } from './cart.js';
import { initWishlist } from './wishlist.js';
import { initCheckout } from './checkout.js';
import { initOrders } from './orders.js';
import { initProfile } from './profile.js';
import { initRecommendations } from './recommendations.js';
import { initNotifications } from './notifications.js';
import { initPersonalization, initLoyalty } from './personalization.js';

// Fraud Detection
import { initFraudDetection } from './fraud-detection.js';
import { initFraudAdmin } from './fraud-admin.js';

async function bootstrap() {
    console.log('[Intellishop] Booting...');

    // Global fallback for broken product images (DummyJSON API has some dead thumbnail URLs)
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG' && !e.target.dataset.fallback) {
            e.target.dataset.fallback = '1';
            e.target.src = 'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
                '<rect width="300" height="300" fill="%23f0fdf4"/>' +
                '<text x="150" y="140" text-anchor="middle" fill="%231b7f4b" font-family="sans-serif" font-size="40">🛍️</text>' +
                '<text x="150" y="175" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="13">Image unavailable</text>' +
                '</svg>'
            );
            e.target.style.objectFit = 'cover';
        }
    }, true); // capture phase to catch all images
    
    // Core systems
    initUI();
    initAuth();
    initCart();
    initWishlist();
    initCheckout();
    initOrders();
    initProfile();
    
    // Products (async — fetches data)
    await initProducts();
    
    // Features that depend on products data
    initRecommendations();
    initPersonalization();
    initLoyalty();
    initNotifications();
    
    // Fraud detection
    initFraudDetection();
    initFraudAdmin();

    // Handle initial route
    const hash = window.location.hash.slice(1) || 'home';
    const { navigateTo } = await import('./ui.js');
    navigateTo(hash);

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.slice(1) || 'home';
        navigateTo(page);
    });

    console.log('[Intellishop] Ready ✅');
}

bootstrap();
