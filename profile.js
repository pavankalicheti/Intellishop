// profile.js — Enhanced with Wallet + Loyalty Points + Address Book
import { getCurrentUser, updateCurrentUser, handleLogout } from './auth.js';
import { showToast, navigateTo } from './ui.js';
import { getLoyaltyData } from './personalization.js';

export function initProfile() {
    document.addEventListener('page:profile', renderProfilePage);
    document.addEventListener('page:addresses', renderAddressesPage);
}

function renderProfilePage() {
    const container = document.getElementById('profile-container');
    if (!container) return;

    const user = getCurrentUser();

    if (!user) {
        container.innerHTML = `<p>Please <a href="javascript:void(0)" onclick="document.getElementById('authModal').style.display='flex'">login</a> to view your profile.</p>`;
        return;
    }

    const walletBalance = parseInt(localStorage.getItem('intellishop_wallet') || '0');
    const loyalty = getLoyaltyData();

    container.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <!-- TOP: Name + Logout -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:48px;height:48px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;">${(user.name||'U').substring(0,2).toUpperCase()}</div>
                    <div>
                        <h3 style="margin:0;">${user.name}</h3>
                        <div style="font-size:12px;color:var(--muted);">${user.email}</div>
                    </div>
                </div>
                <button id="logoutBtn" class="btn" style="border-color: red; color: red;">Logout</button>
            </div>

            <!-- LOYALTY + WALLET ROW -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                <!-- Loyalty Card -->
                <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #a7f3d0;border-radius:14px;padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Loyalty Points</span>
                        <span style="background:${loyalty.tierColor || '#cd7f32'};color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">${loyalty.tier || 'Bronze'}</span>
                    </div>
                    <div style="font-size:28px;font-weight:900;color:var(--green);">${loyalty.available || 0}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:4px;">points available · ${loyalty.earned || 0} total earned</div>
                    <div style="margin-top:10px;font-size:10px;color:#555;">
                        📦 ${loyalty.orderPoints || 0} from orders · ✍️ ${loyalty.reviewPoints || 0} from reviews
                    </div>
                    <div style="margin-top:8px;font-size:10px;color:var(--green);font-weight:600;">
                        100 points = ₹50 OFF at checkout
                    </div>
                </div>

                <!-- Wallet Card -->
                <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:14px;padding:16px;">
                    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Wallet Balance</div>
                    <div style="font-size:28px;font-weight:900;color:#2563eb;">₹${walletBalance}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:4px;">Use at checkout for instant payment</div>
                    <div style="display:flex;gap:8px;margin-top:10px;">
                        <input id="walletAddAmount" type="number" placeholder="₹ Amount" min="100" style="flex:1;padding:8px;border-radius:8px;border:1px solid #93c5fd;font-size:12px;">
                        <button onclick="window.addToWallet()" class="mini-btn" style="background:#2563eb;border-color:#2563eb;font-size:11px;padding:6px 12px;">Add</button>
                    </div>
                </div>
            </div>

            <!-- Quick Links -->
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px;">
                <div onclick="window.location.hash='#orders'" style="background:#f7faf9; border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center; cursor:pointer;">
                    <div style="font-size:20px;">📦</div>
                    <div style="font-size:11px;font-weight:bold;margin-top:4px;">My Orders</div>
                </div>
                <div onclick="window.location.hash='#wishlist'" style="background:#f7faf9; border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center; cursor:pointer;">
                    <div style="font-size:20px;">❤️</div>
                    <div style="font-size:11px;font-weight:bold;margin-top:4px;">Wishlist</div>
                </div>
                <div onclick="window.location.hash='#addresses'" style="background:#f7faf9; border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center; cursor:pointer;">
                    <div style="font-size:20px;">📍</div>
                    <div style="font-size:11px;font-weight:bold;margin-top:4px;">Addresses</div>
                </div>
                <div onclick="window.location.hash='#style-quiz'" style="background:#f7faf9; border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center; cursor:pointer;">
                    <div style="font-size:20px;">🎨</div>
                    <div style="font-size:11px;font-weight:bold;margin-top:4px;">Style Quiz</div>
                </div>
            </div>

            <!-- Personal Info Form -->
            <div style="background: #f7faf9; padding: 20px; border-radius: 14px; border: 1px solid var(--border);">
                <h3 style="margin-bottom:15px;">Personal Details</h3>
                <form id="profileForm" style="display:flex; flex-direction:column; gap:15px;">
                    <div>
                        <label style="font-size:12px; font-weight:bold;">Name</label>
                        <input id="profName" value="${user.name || ''}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:bold;">Email (Read Only)</label>
                        <input value="${user.email}" readonly style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px; background:#eee;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:bold;">Phone</label>
                        <input id="profPhone" value="${user.phone || ''}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:bold;">Address</label>
                        <input id="profAddress" value="${user.address || ''}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px;">
                    </div>
                    <div style="display:flex; gap:15px;">
                        <div style="flex:1;">
                            <label style="font-size:12px; font-weight:bold;">City</label>
                            <input id="profCity" value="${user.city || ''}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:12px; font-weight:bold;">State</label>
                            <input id="profState" value="${user.state || ''}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:12px; font-weight:bold;">Pincode</label>
                            <input id="profPin" value="${user.pincode || ''}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); margin-top:5px;">
                        </div>
                    </div>
                    <button type="submit" class="btn primary" style="margin-top:10px;">Save Changes</button>
                </form>
            </div>
        </div>
    `;

    // Bind logout directly after rendering the button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
}

window.addToWallet = function() {
    const amount = parseInt(document.getElementById('walletAddAmount')?.value) || 0;
    if (amount < 100) { showToast('Minimum ₹100 to add', 'error'); return; }
    
    const balance = parseInt(localStorage.getItem('intellishop_wallet') || '0');
    localStorage.setItem('intellishop_wallet', String(balance + amount));
    showToast(`₹${amount} added to wallet! 💳`);
    renderProfilePage();
};

function handleProfileSave(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const updatedUser = {
        ...user,
        name: document.getElementById('profName').value.trim(),
        phone: document.getElementById('profPhone').value.trim(),
        address: document.getElementById('profAddress').value.trim(),
        city: document.getElementById('profCity').value.trim(),
        state: document.getElementById('profState').value.trim(),
        pincode: document.getElementById('profPin').value.trim()
    };

    updateCurrentUser(updatedUser);
    showToast('Profile updated securely!');
}

// ═══════════════════════════════════════════════════
// ADDRESS BOOK MANAGEMENT
// ═══════════════════════════════════════════════════

function getAddresses() {
    return JSON.parse(localStorage.getItem('intellishop_addresses') || '[]');
}

function saveAddresses(addresses) {
    localStorage.setItem('intellishop_addresses', JSON.stringify(addresses));
}

export function getDefaultAddress() {
    const addresses = getAddresses();
    return addresses.find(a => a.isDefault) || addresses[0] || null;
}

export function getAllAddresses() {
    return getAddresses();
}

function renderAddressesPage() {
    const list = document.getElementById('addresses-list');
    if (!list) return;

    const addresses = getAddresses();

    if (!addresses.length) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--muted);">
                <div style="font-size:48px; margin-bottom:10px;">📍</div>
                <p>No saved addresses yet.</p>
                <p style="font-size:12px;">Add your first address to speed up checkout.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            ${addresses.map((a, i) => `
                <div class="addr-card ${a.isDefault ? 'addr-default' : ''}">
                    ${a.isDefault ? '<span class="addr-badge">DEFAULT</span>' : ''}
                    <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${a.name}</div>
                    <div style="font-size:12px; color:var(--muted); margin-bottom:2px;">${a.phone}</div>
                    <div style="font-size:13px; color:#555; line-height:1.5;">
                        ${a.address}<br>
                        ${a.city}, ${a.state} - ${a.pincode}
                    </div>
                    <div class="addr-actions">
                        <button onclick="window.editAddress(${i})">✏️ Edit</button>
                        ${!a.isDefault ? `<button onclick="window.setDefaultAddress(${i})">⭐ Set Default</button>` : ''}
                        <button onclick="window.deleteAddress(${i})" style="color:#e74c3c;">🗑 Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

window.showAddressForm = function(editIndex = -1) {
    const formArea = document.getElementById('address-form-area');
    if (!formArea) return;

    const addresses = getAddresses();
    const addr = editIndex >= 0 ? addresses[editIndex] : {};

    formArea.innerHTML = `
        <div style="background:#f7faf9; border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:20px;">
            <h3 style="margin-bottom:15px;">${editIndex >= 0 ? 'Edit' : 'Add New'} Address</h3>
            <div class="addr-form-row">
                <input id="addrName" placeholder="Full Name *" value="${addr.name || ''}">
                <input id="addrPhone" placeholder="Phone Number *" value="${addr.phone || ''}">
            </div>
            <div class="addr-form-row">
                <input id="addrAddress" placeholder="Address Line *" value="${addr.address || ''}" style="flex:2;">
            </div>
            <div class="addr-form-row">
                <input id="addrCity" placeholder="City *" value="${addr.city || ''}">
                <input id="addrState" placeholder="State *" value="${addr.state || ''}">
                <input id="addrPincode" placeholder="Pincode *" value="${addr.pincode || ''}">
            </div>
            <div class="addr-form-row">
                <select id="addrType">
                    <option value="Home" ${addr.type === 'Home' ? 'selected' : ''}>🏠 Home</option>
                    <option value="Work" ${addr.type === 'Work' ? 'selected' : ''}>🏢 Work</option>
                    <option value="Other" ${addr.type === 'Other' ? 'selected' : ''}>📍 Other</option>
                </select>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                    <input type="checkbox" id="addrDefault" ${addr.isDefault ? 'checked' : ''}> Set as default
                </label>
            </div>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn primary" onclick="window.saveAddress(${editIndex})" style="padding:10px 20px;">Save Address</button>
                <button class="btn" onclick="document.getElementById('address-form-area').innerHTML=''">Cancel</button>
            </div>
        </div>
    `;
};

window.saveAddress = function(editIndex) {
    const name = document.getElementById('addrName').value.trim();
    const phone = document.getElementById('addrPhone').value.trim();
    const address = document.getElementById('addrAddress').value.trim();
    const city = document.getElementById('addrCity').value.trim();
    const state = document.getElementById('addrState').value.trim();
    const pincode = document.getElementById('addrPincode').value.trim();
    const type = document.getElementById('addrType').value;
    const isDefault = document.getElementById('addrDefault').checked;

    if (!name || !phone || !address || !city || !state || !pincode) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const addresses = getAddresses();
    const newAddr = { name, phone, address, city, state, pincode, type, isDefault };

    // If setting as default, unset others
    if (isDefault) {
        addresses.forEach(a => a.isDefault = false);
    }

    if (editIndex >= 0) {
        addresses[editIndex] = newAddr;
    } else {
        // First address is auto-default
        if (addresses.length === 0) newAddr.isDefault = true;
        addresses.push(newAddr);
    }

    saveAddresses(addresses);
    document.getElementById('address-form-area').innerHTML = '';
    renderAddressesPage();
    showToast(editIndex >= 0 ? 'Address updated! 📍' : 'Address added! 📍');
};

window.editAddress = function(index) {
    window.showAddressForm(index);
};

window.setDefaultAddress = function(index) {
    const addresses = getAddresses();
    addresses.forEach(a => a.isDefault = false);
    addresses[index].isDefault = true;
    saveAddresses(addresses);
    renderAddressesPage();
    showToast('Default address updated ⭐');
};

window.deleteAddress = function(index) {
    if (!confirm('Delete this address?')) return;
    const addresses = getAddresses();
    const wasDefault = addresses[index].isDefault;
    addresses.splice(index, 1);
    // If deleted was default, make first one default
    if (wasDefault && addresses.length > 0) addresses[0].isDefault = true;
    saveAddresses(addresses);
    renderAddressesPage();
    showToast('Address deleted');
};
