// auth.js
import { showToast, hideModal, showModal } from './ui.js';
import { recordDeviceOnAuth } from './fraud-detection.js';

export let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export function initAuth() {
    const stored = localStorage.getItem('intellishop_user');
    if (stored) {
        currentUser = JSON.parse(stored);
    }
    updateAuthUI();

    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('registerBtn')?.addEventListener('click', handleRegister);
    document.getElementById('forgotPassLink')?.addEventListener('click', showForgotPassword);
    document.getElementById('resetPassBtn')?.addEventListener('click', handleForgotPassword);
}

function updateAuthUI() {
    const loginBtn = document.querySelector('.signup');
    if (loginBtn) {
        if (currentUser) {
            loginBtn.textContent = currentUser.name.substring(0, 2).toUpperCase();
            loginBtn.title = 'Profile';
            loginBtn.onclick = () => window.location.hash = '#profile';
        } else {
            loginBtn.textContent = 'SIGN IN';
            loginBtn.title = 'Sign In';
            loginBtn.onclick = () => showModal('authModal');
        }
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value.trim();

    if (!name || !email || !pass) {
        showToast('Please fill all fields', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('intellishop_users') || '[]');
    if (users.find(u => u.email === email)) {
        showToast('Email already registered', 'error');
        return;
    }

    const newUser = { id: Date.now(), name, email, password: pass, phone: '', address: '', city: '', state: '', pincode: '' };
    users.push(newUser);
    localStorage.setItem('intellishop_users', JSON.stringify(users));
    
    // Auto login
    currentUser = newUser;
    localStorage.setItem('intellishop_user', JSON.stringify(currentUser));
    
    hideModal('registerModal');
    updateAuthUI();
    recordDeviceOnAuth(email); // Track device→user link for fraud graph
    showToast('Registration successful! Welcome ' + name);
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (!email || !pass) {
        showToast('Please fill all fields', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('intellishop_users') || '[]');
    const user = users.find(u => u.email === email && u.password === pass);

    if (!user) {
        showToast('Invalid email or password', 'error');
        return;
    }

    currentUser = user;
    localStorage.setItem('intellishop_user', JSON.stringify(currentUser));
    
    hideModal('authModal');
    updateAuthUI();
    recordDeviceOnAuth(email); // Track device→user link for fraud graph
    showToast('Login successful!');
}

export function handleLogout() {
    currentUser = null;
    localStorage.removeItem('intellishop_user');
    updateAuthUI();
    window.location.hash = '#home';
    showToast('Logged out successfully');
}

export function updateCurrentUser(updatedUser) {
    currentUser = updatedUser;
    localStorage.setItem('intellishop_user', JSON.stringify(currentUser));
    
    const users = JSON.parse(localStorage.getItem('intellishop_users') || '[]');
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        users[idx] = currentUser;
        localStorage.setItem('intellishop_users', JSON.stringify(users));
    }
    updateAuthUI();
}

// ═══════ FORGOT PASSWORD ═══════

function showForgotPassword() {
    hideModal('authModal');
    showModal('forgotPassModal');
}

function handleForgotPassword() {
    const email = document.getElementById('fpEmail').value.trim();
    const newPass = document.getElementById('fpNewPass').value.trim();
    const confirmPass = document.getElementById('fpConfirmPass').value.trim();

    if (!email) { showToast('Please enter your email', 'error'); return; }
    if (!newPass || newPass.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }
    if (newPass !== confirmPass) { showToast('Passwords do not match', 'error'); return; }

    const users = JSON.parse(localStorage.getItem('intellishop_users') || '[]');
    const user = users.find(u => u.email === email);

    if (!user) {
        showToast('No account found with this email', 'error');
        return;
    }

    user.password = newPass;
    localStorage.setItem('intellishop_users', JSON.stringify(users));
    hideModal('forgotPassModal');
    showToast('Password reset successfully! Please login.');
    showModal('authModal');
}
