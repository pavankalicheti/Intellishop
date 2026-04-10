// notifications.js — Notification Center
import { showToast } from './ui.js';

export function initNotifications() {
    // Update badge on load
    updateNotifBadge();
    
    // Make global for orders.js to call
    window.updateNotifBadge = updateNotifBadge;

    // Add welcome notification for first visit
    const visited = localStorage.getItem('intellishop_visited');
    if (!visited) {
        addNotif('Welcome to Intellishop! 🎉', 'Discover trending fashion with up to 50% OFF. Use code WELCOME10 for your first order!');
        localStorage.setItem('intellishop_visited', 'true');
    }
}

function addNotif(title, message) {
    const notifs = JSON.parse(localStorage.getItem('intellishop_notifications') || '[]');
    notifs.unshift({
        id: Date.now(),
        title,
        message,
        time: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('intellishop_notifications', JSON.stringify(notifs));
    updateNotifBadge();
}

function updateNotifBadge() {
    const notifs = JSON.parse(localStorage.getItem('intellishop_notifications') || '[]');
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'block' : 'none';
    }
}

window.toggleNotifications = function() {
    let panel = document.getElementById('notifPanel');
    if (panel) {
        panel.remove();
        return;
    }

    const notifs = JSON.parse(localStorage.getItem('intellishop_notifications') || '[]');

    panel = document.createElement('div');
    panel.id = 'notifPanel';
    panel.style.cssText = 'position:fixed;top:60px;right:20px;width:340px;max-height:420px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:2000;overflow-y:auto;';

    panel.innerHTML = `
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
            <h4 style="margin:0;">🔔 Notifications</h4>
            <button onclick="window.clearAllNotifs()" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:11px;font-weight:bold;">Clear All</button>
        </div>
        ${notifs.length === 0 ? '<p style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">No notifications</p>' : 
        notifs.map(n => `
            <div onclick="window.markNotifRead(${n.id})" style="padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;background:${n.read ? '#fff' : '#f0fdf4'};">
                <div style="font-weight:${n.read ? '400' : '700'};font-size:13px;margin-bottom:4px;">${n.title}</div>
                <div style="font-size:12px;color:var(--muted);line-height:1.4;">${n.message}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:4px;">${timeAgo(new Date(n.time))}</div>
            </div>
        `).join('')}
    `;

    document.body.appendChild(panel);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeNotif(e) {
            if (!panel.contains(e.target) && e.target.id !== 'notifBell') {
                panel.remove();
                document.removeEventListener('click', closeNotif);
            }
        });
    }, 100);
};

window.markNotifRead = function(id) {
    const notifs = JSON.parse(localStorage.getItem('intellishop_notifications') || '[]');
    const n = notifs.find(x => x.id === id);
    if (n) n.read = true;
    localStorage.setItem('intellishop_notifications', JSON.stringify(notifs));
    updateNotifBadge();
    // Re-render panel
    window.toggleNotifications();
    window.toggleNotifications();
};

window.clearAllNotifs = function() {
    localStorage.setItem('intellishop_notifications', '[]');
    updateNotifBadge();
    const panel = document.getElementById('notifPanel');
    if (panel) panel.remove();
    showToast('Notifications cleared');
};

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds/60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds/3600) + 'h ago';
    return Math.floor(seconds/86400) + 'd ago';
}
