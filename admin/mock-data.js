// admin/mock-data.js — Realistic Indian mock data for Fraud Intelligence Dashboard
// Structured so each function can be swapped with a real API call later

const INDIAN_NAMES = [
    'Aarav Sharma', 'Priya Patel', 'Rohan Gupta', 'Ananya Singh', 'Vikram Reddy',
    'Sneha Iyer', 'Arjun Mehta', 'Kavya Nair', 'Rahul Verma', 'Diya Kapoor',
    'Aditya Joshi', 'Meera Rao', 'Karthik Pillai', 'Ishita Das', 'Nikhil Bhat',
    'Pooja Menon', 'Siddharth Kulkarni', 'Shruti Mishra', 'Manish Tiwari', 'Neha Saxena',
    'Amit Kumar', 'Ritu Agarwal', 'Deepak Chauhan', 'Swati Bhatt', 'Rajesh Pandey',
    'Ankita Deshmukh', 'Varun Malhotra', 'Tanvi Srinivasan', 'Harsh Chopra', 'Simran Kaur'
];

const INDIAN_CITIES = [
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88 },
    { name: 'Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.97, lng: 77.59 },
    { name: 'Hyderabad', state: 'Telangana', lat: 17.39, lng: 78.49 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
    { name: 'Pune', state: 'Maharashtra', lat: 18.52, lng: 73.86 },
    { name: 'Ahmedabad', state: 'Gujarat', lat: 23.02, lng: 72.57 },
    { name: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79 },
    { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lng: 80.95 },
    { name: 'Chandigarh', state: 'Punjab', lat: 30.73, lng: 76.78 },
    { name: 'Kochi', state: 'Kerala', lat: 9.93, lng: 76.27 },
    { name: 'Indore', state: 'Madhya Pradesh', lat: 22.72, lng: 75.86 },
    { name: 'Nagpur', state: 'Maharashtra', lat: 21.15, lng: 79.09 },
    { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.26, lng: 77.41 },
    { name: 'Surat', state: 'Gujarat', lat: 21.17, lng: 72.83 },
    { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.69, lng: 83.22 },
    { name: 'Patna', state: 'Bihar', lat: 25.61, lng: 85.14 },
    { name: 'Guwahati', state: 'Assam', lat: 26.14, lng: 91.74 },
    { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.52, lng: 76.94 }
];

const PAYMENT_METHODS = ['UPI - GPay', 'UPI - PhonePe', 'UPI - Paytm', 'Credit Card - Visa', 'Credit Card - Mastercard', 'Debit Card - RuPay', 'Net Banking - HDFC', 'Net Banking - SBI', 'Wallet - Paytm', 'COD'];

const FRAUD_REASONS = [
    'Multiple failed payment attempts',
    'Unusual purchase amount for account age',
    'IP geolocation mismatch with billing address',
    'VPN/Proxy detected during transaction',
    'Multiple accounts linked to same device',
    'Suspicious velocity: 8 orders in 2 minutes',
    'Promo code abuse: same code used from 3 accounts',
    'Card BIN mismatch with issuing country',
    'Behavioral anomaly: rapid form fill detected',
    'Return fraud pattern: 5th return in 7 days',
    'Bot traffic signature: headless browser detected',
    'Account takeover: password changed before order',
    'Fake review pattern: same text across products',
    'Excessive coupon stacking attempt',
    'Disposable email domain detected',
    'Session hijacking: device fingerprint changed mid-session',
    'Chargebacks from this BIN exceed threshold',
    'Order value 10x above user average',
    'Shipping to freight-forwarding address',
    'Multiple cards used in single session'
];

const PRODUCT_NAMES = [
    'Premium Cotton T-Shirt', 'Slim Fit Jeans', 'Leather Wallet', 'Running Shoes Nike',
    'Formal Blazer', 'Silk Saree', 'Designer Kurti', 'Sports Watch', 'Sunglasses Ray-Ban',
    'Laptop Bag', 'Gold Plated Earrings', 'Cotton Bedsheet Set', 'Wireless Earbuds',
    'Yoga Pants', 'Denim Jacket', 'Ethnic Sherwani', 'Canvas Sneakers', 'Silver Ring',
    'Perfume Gift Set', 'Leather Belt'
];

const OS_LIST = ['Windows 11', 'macOS 14', 'Android 14', 'iOS 17', 'Linux Ubuntu', 'Windows 10', 'Android 13', 'iOS 16'];
const BROWSER_LIST = ['Chrome 120', 'Safari 17', 'Firefox 121', 'Edge 120', 'Headless Chrome', 'Bot/Scraper', 'Opera 105'];

// ═══════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function uuid() { return 'xxxxxxxx'.replace(/x/g, () => rand(0, 15).toString(16)); }
function genIP() { return `${rand(1,223)}.${rand(0,255)}.${rand(0,255)}.${rand(1,254)}`; }
function genDeviceId() { return `DEV-${uuid()}-${uuid()}`; }

function genTimestamp(daysBack = 0, hoursBack = 0) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(d.getHours() - hoursBack);
    d.setMinutes(rand(0, 59));
    d.setSeconds(rand(0, 59));
    return d;
}

// ═══════════════════════════════════════════════════
// DATA GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════

export function generateOrders(count = 200) {
    const orders = [];
    const statuses = ['Delivered', 'Shipped', 'Processing', 'Cancelled', 'Returned', 'Flagged'];
    for (let i = 0; i < count; i++) {
        const city = pick(INDIAN_CITIES);
        const amount = rand(299, 24999);
        const riskScore = rand(0, 100);
        const isFlagged = riskScore > 65;
        orders.push({
            id: `ORD-${String(10000 + i).padStart(6, '0')}`,
            customer: pick(INDIAN_NAMES),
            email: pick(INDIAN_NAMES).toLowerCase().replace(' ', '.') + '@gmail.com',
            amount,
            items: rand(1, 6),
            product: pick(PRODUCT_NAMES),
            payment: pick(PAYMENT_METHODS),
            status: isFlagged ? 'Flagged' : pick(statuses),
            city: city.name,
            state: city.state,
            riskScore,
            isFlagged,
            date: genTimestamp(rand(0, 30)),
            ip: genIP()
        });
    }
    return orders.sort((a, b) => b.date - a.date);
}

export function generateUsers(count = 80) {
    const users = [];
    for (let i = 0; i < count; i++) {
        const name = pick(INDIAN_NAMES);
        const city = pick(INDIAN_CITIES);
        const riskScore = rand(0, 100);
        users.push({
            id: `USR-${String(1000 + i).padStart(5, '0')}`,
            name,
            email: name.toLowerCase().replace(' ', '.') + rand(1, 99) + '@gmail.com',
            phone: `+91 ${rand(70000, 99999)} ${rand(10000, 99999)}`,
            city: city.name,
            state: city.state,
            orders: rand(1, 45),
            totalSpent: rand(500, 150000),
            joined: genTimestamp(rand(30, 365)),
            riskScore,
            status: riskScore > 80 ? 'Blocked' : riskScore > 60 ? 'Watchlist' : 'Active',
            lastActive: genTimestamp(rand(0, 7))
        });
    }
    return users;
}

export function generateFlaggedEvents(count = 50) {
    const events = [];
    const actions = ['Purchase', 'Login', 'Promo Applied', 'Review Posted', 'Return Requested', 'Account Created', 'Password Changed', 'Address Changed', 'Card Added'];
    for (let i = 0; i < count; i++) {
        const riskScore = rand(40, 100);
        events.push({
            id: `EVT-${uuid()}`,
            timestamp: genTimestamp(0, rand(0, 48)),
            userId: `USR-${String(rand(1000, 1079)).padStart(5, '0')}`,
            userName: pick(INDIAN_NAMES),
            action: pick(actions),
            riskScore,
            reason: pick(FRAUD_REASONS),
            severity: riskScore > 85 ? 'critical' : riskScore > 70 ? 'high' : riskScore > 55 ? 'medium' : 'low',
            amount: rand(199, 19999),
            ip: genIP(),
            city: pick(INDIAN_CITIES).name,
            status: 'pending' // pending, reviewed, blocked, whitelisted
        });
    }
    return events.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateHeatmapData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [];
    for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
            // Fraud peaks at night (1-4 AM) and during flash sale hours (12-2 PM)
            let base = rand(0, 3);
            if (h >= 1 && h <= 4) base = rand(4, 12);
            if (h >= 12 && h <= 14) base = rand(3, 8);
            if (d >= 5) base = Math.floor(base * 1.5); // weekends higher
            data.push({ day: days[d], hour: h, count: base, dayIndex: d });
        }
    }
    return data;
}

export function generateRiskDistribution() {
    // Generate histogram buckets 0-10, 10-20, ..., 90-100
    const buckets = [];
    // Normal-ish distribution skewed toward low risk
    const counts = [320, 280, 210, 150, 90, 60, 45, 30, 22, 18];
    for (let i = 0; i < 10; i++) {
        buckets.push({
            range: `${i * 10}-${i * 10 + 10}`,
            min: i * 10,
            max: i * 10 + 10,
            count: counts[i] + rand(-10, 10)
        });
    }
    return buckets;
}

export function generateFraudTypeBreakdown() {
    return [
        { type: 'Payment Fraud', count: rand(80, 150), color: '#ef4444' },
        { type: 'Account Takeover', count: rand(40, 90), color: '#f97316' },
        { type: 'Promo/Coupon Abuse', count: rand(60, 120), color: '#eab308' },
        { type: 'Fake Reviews', count: rand(30, 70), color: '#a855f7' },
        { type: 'Bot Traffic', count: rand(50, 100), color: '#06b6d4' },
        { type: 'Return Fraud', count: rand(20, 60), color: '#ec4899' }
    ];
}

export function generateGeoData() {
    return INDIAN_CITIES.map(city => ({
        ...city,
        fraudCount: rand(2, 80),
        totalOrders: rand(50, 500),
        fraudRate: 0 // computed below
    })).map(c => {
        c.fraudRate = ((c.fraudCount / c.totalOrders) * 100).toFixed(1);
        return c;
    }).sort((a, b) => b.fraudCount - a.fraudCount);
}

export function generateDeviceFingerprints(count = 30) {
    const devices = [];
    for (let i = 0; i < count; i++) {
        const isVPN = Math.random() > 0.6;
        const isMultiAccount = Math.random() > 0.5;
        const isHeadless = Math.random() > 0.85;
        const riskScore = rand(40, 100);
        devices.push({
            deviceId: genDeviceId(),
            ip: genIP(),
            os: pick(OS_LIST),
            browser: isHeadless ? 'Headless Chrome' : pick(BROWSER_LIST),
            vpn: isVPN,
            multiAccount: isMultiAccount,
            headless: isHeadless,
            accountsLinked: isMultiAccount ? rand(3, 12) : 1,
            riskScore,
            lastSeen: genTimestamp(0, rand(0, 72)),
            city: pick(INDIAN_CITIES).name,
            sessions: rand(1, 40)
        });
    }
    return devices.sort((a, b) => b.riskScore - a.riskScore);
}

export function generateBlockedUsers(count = 15) {
    const blocked = [];
    const reasons = ['Multiple fraud attempts', 'Chargeback abuse', 'Bot activity confirmed', 'Fake review ring', 'Promo code exploitation', 'Identity fraud', 'Return abuse pattern', 'Account sharing violation'];
    for (let i = 0; i < count; i++) {
        blocked.push({
            id: `USR-${String(rand(1000, 1200)).padStart(5, '0')}`,
            name: pick(INDIAN_NAMES),
            email: pick(INDIAN_NAMES).toLowerCase().replace(' ', '.') + '@gmail.com',
            reason: pick(reasons),
            blockedDate: genTimestamp(rand(1, 60)),
            riskScore: rand(75, 100),
            ordersBlocked: rand(1, 12),
            amountBlocked: rand(2000, 85000)
        });
    }
    return blocked;
}

export function generateWatchlist(count = 10) {
    const list = [];
    const reasons = ['Unusual spending pattern', 'New account high-value orders', 'Multiple address changes', 'Suspicious review activity', 'IP shared with blocked user', 'Frequent payment failures'];
    for (let i = 0; i < count; i++) {
        list.push({
            id: `USR-${String(rand(1000, 1200)).padStart(5, '0')}`,
            name: pick(INDIAN_NAMES),
            email: pick(INDIAN_NAMES).toLowerCase().replace(' ', '.') + '@gmail.com',
            reason: pick(reasons),
            addedDate: genTimestamp(rand(1, 30)),
            riskScore: rand(55, 80),
            ordersMonitored: rand(2, 15)
        });
    }
    return list;
}

export function generateTrendData(days = 30) {
    const data = [];
    const annotations = {
        5: 'Flash Sale',
        12: 'Promo Code Wave',
        18: 'Bot Attack',
        24: 'Festival Sale'
    };
    for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const total = rand(400, 800);
        let flagged = rand(15, 50);
        let blocked = rand(3, 15);
        // Spikes on annotated days
        if (annotations[i]) {
            flagged = rand(60, 120);
            blocked = rand(15, 35);
        }
        data.push({
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            fullDate: d,
            total,
            flagged,
            blocked,
            annotation: annotations[i] || null
        });
    }
    return data;
}

export function generateSparkline(length = 7, min = 0, max = 100) {
    const data = [];
    let val = rand(min + 10, max - 10);
    for (let i = 0; i < length; i++) {
        val += rand(-8, 8);
        val = Math.max(min, Math.min(max, val));
        data.push(val);
    }
    return data;
}

export function generateKPIData() {
    const ordersToday = rand(350, 650);
    const flaggedToday = rand(12, 45);
    const fraudRate = ((flaggedToday / ordersToday) * 100).toFixed(1);
    const yesterdayRate = (rand(20, 50) / rand(350, 600) * 100).toFixed(1);
    const rateChange = (fraudRate - yesterdayRate).toFixed(1);
    return {
        ordersToday,
        flaggedToday,
        fraudRate,
        rateChange,
        amountAtRisk: rand(45000, 380000),
        autoBlocked: rand(5, 20),
        falsePositiveRate: (rand(5, 18) / 100).toFixed(1),
        sparklines: {
            orders: generateSparkline(7, 300, 700),
            flagged: generateSparkline(7, 8, 50),
            fraudRate: generateSparkline(7, 2, 12),
            amountAtRisk: generateSparkline(7, 30000, 400000),
            autoBlocked: generateSparkline(7, 2, 25),
            falsePositive: generateSparkline(7, 3, 20)
        }
    };
}

// ═══════════════════════════════════════════════════
// ATTACK SIMULATION
// ═══════════════════════════════════════════════════

export function generateAttackEvent() {
    const riskScore = rand(82, 99);
    return {
        id: `EVT-ATK-${uuid()}`,
        timestamp: new Date(),
        userId: `USR-${String(rand(1000, 1079)).padStart(5, '0')}`,
        userName: pick(INDIAN_NAMES),
        action: pick(['Purchase', 'Login', 'Card Added', 'Account Created']),
        riskScore,
        reason: pick([
            'Bot traffic signature: headless browser detected',
            'Suspicious velocity: 8 orders in 2 minutes',
            'Multiple accounts linked to same device',
            'VPN/Proxy detected during transaction',
            'Session hijacking: device fingerprint changed mid-session'
        ]),
        severity: 'critical',
        amount: rand(5000, 25000),
        ip: genIP(),
        city: pick(INDIAN_CITIES).name,
        status: 'pending',
        isAttack: true
    };
}

export function getProducts() {
    // Pull from localStorage if available (same DB as customer site)
    try {
        const cached = localStorage.getItem('intellishop_products_cache');
        if (cached) return JSON.parse(cached);
    } catch (e) {}
    // Fallback mock
    return PRODUCT_NAMES.map((name, i) => ({
        id: i + 1,
        title: name,
        brand: pick(['Nike', 'Adidas', 'Puma', 'Zara', 'H&M', 'Levi\'s', 'Raymond', 'Allen Solly']),
        price: rand(499, 9999),
        stock: rand(0, 200),
        sold: rand(10, 500),
        rating: (rand(30, 50) / 10).toFixed(1),
        category: pick(['Clothing', 'Footwear', 'Accessories', 'Electronics', 'Home'])
    }));
}

export function getSalesOverview() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
        totalRevenue: rand(2500000, 8500000),
        totalOrders: rand(3000, 12000),
        avgOrderValue: rand(800, 2500),
        conversionRate: (rand(20, 45) / 10).toFixed(1),
        monthlyRevenue: months.map(m => ({ month: m, revenue: rand(200000, 900000) })),
        topProducts: PRODUCT_NAMES.slice(0, 8).map(name => ({
            name,
            sold: rand(50, 300),
            revenue: rand(25000, 150000)
        })).sort((a, b) => b.revenue - a.revenue),
        paymentSplit: PAYMENT_METHODS.slice(0, 6).map(m => ({
            method: m,
            count: rand(100, 600)
        }))
    };
}
