// fraud-detection.js — ML-Powered Fraud Detection & Prevention Engine
// Implements: Device Fingerprinting, Behavioral Biometrics, Isolation Forest,
//             Graph Analysis, Velocity Engine, and Risk Decision Engine

// --- 1. DEVICE FINGERPRINTING ENGINE ---

function generateDeviceFingerprint() {
    const components = [];

    // Screen properties
    components.push(screen.width, screen.height, screen.colorDepth, window.devicePixelRatio || 1);

    // Timezone & Language
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    components.push(navigator.language);
    components.push(navigator.languages?.join(',') || '');

    // Platform & Hardware
    components.push(navigator.platform || '');
    components.push(navigator.hardwareConcurrency || 0);
    components.push(navigator.deviceMemory || 0);

    // Touch support
    components.push('ontouchstart' in window ? 1 : 0);
    components.push(navigator.maxTouchPoints || 0);

    // Canvas fingerprint
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 50;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(50, 0, 80, 30);
        ctx.fillStyle = '#069';
        ctx.fillText('Intellishop FP', 2, 15);
        ctx.fillStyle = 'rgba(102,204,0,0.7)';
        ctx.fillText('🛒secure', 4, 35);
        components.push(canvas.toDataURL().slice(-50));
    } catch (e) {
        components.push('canvas-blocked');
    }

    // WebGL fingerprint
    try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            components.push(gl.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL || 0) || '');
            components.push(gl.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL || 0) || '');
        }
    } catch (e) {
        components.push('webgl-blocked');
    }

    // Audio fingerprint (simplified)
    try {
        const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
        components.push(audioCtx.sampleRate);
    } catch (e) {
        components.push('audio-blocked');
    }

    return hashString(components.join('||'));
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32-bit integer
    }
    return 'fp_' + Math.abs(hash).toString(36);
}


// --- 2. BEHAVIORAL BIOMETRICS COLLECTOR ---

const biometrics = {
    mousePositions: [],      // {x, y, t}
    mouseClicks: [],         // {x, y, t}
    keyEvents: [],           // {key, type, t}
    scrollEvents: [],        // {y, t}
    startTime: Date.now(),
    pagesVisited: new Set(),
    isCollecting: false
};

function startBiometricCollection() {
    if (biometrics.isCollecting) return;
    biometrics.isCollecting = true;
    biometrics.startTime = Date.now();

    // Mouse movement (throttled to every 50ms)
    let lastMouseTime = 0;
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMouseTime < 50) return;
        lastMouseTime = now;
        biometrics.mousePositions.push({ x: e.clientX, y: e.clientY, t: now });
        // Keep last 500 positions to avoid memory bloat
        if (biometrics.mousePositions.length > 500) biometrics.mousePositions.shift();
    });

    // Mouse clicks
    document.addEventListener('click', (e) => {
        biometrics.mouseClicks.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        biometrics.keyEvents.push({ key: e.key, type: 'down', t: Date.now() });
        if (biometrics.keyEvents.length > 300) biometrics.keyEvents.shift();
    });
    document.addEventListener('keyup', (e) => {
        biometrics.keyEvents.push({ key: e.key, type: 'up', t: Date.now() });
        if (biometrics.keyEvents.length > 300) biometrics.keyEvents.shift();
    });

    // Scroll events (throttled)
    let lastScrollTime = 0;
    document.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScrollTime < 100) return;
        lastScrollTime = now;
        biometrics.scrollEvents.push({ y: window.scrollY, t: now });
        if (biometrics.scrollEvents.length > 200) biometrics.scrollEvents.shift();
    });

    // Track page visits via hash changes
    window.addEventListener('hashchange', () => {
        biometrics.pagesVisited.add(window.location.hash);
    });
    biometrics.pagesVisited.add(window.location.hash || '#home');
}

function extractMouseFeatures() {
    const positions = biometrics.mousePositions;
    if (positions.length < 10) {
        return { avgSpeed: 0, speedStd: 0, straightnessRatio: 0.5 };
    }

    const speeds = [];
    let totalPathLength = 0;

    for (let i = 1; i < positions.length; i++) {
        const dx = positions[i].x - positions[i - 1].x;
        const dy = positions[i].y - positions[i - 1].y;
        const dt = (positions[i].t - positions[i - 1].t) || 1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        totalPathLength += dist;
        speeds.push(dist / dt * 1000); // pixels per second
    }

    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const speedStd = Math.sqrt(speeds.reduce((sum, s) => sum + (s - avgSpeed) ** 2, 0) / speeds.length);

    // Straightness: ratio of direct distance to path length
    const first = positions[0];
    const last = positions[positions.length - 1];
    const directDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    const straightnessRatio = totalPathLength > 0 ? Math.min(directDist / totalPathLength, 1) : 0.5;

    return { avgSpeed, speedStd, straightnessRatio };
}

function extractTypingFeatures() {
    const keys = biometrics.keyEvents.filter(k => k.type === 'down');
    if (keys.length < 5) {
        return { avgDelay: 200, typingWPM: 40, errorRate: 0 };
    }

    const delays = [];
    for (let i = 1; i < keys.length; i++) {
        delays.push(keys[i].t - keys[i - 1].t);
    }

    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;

    // Estimate WPM: average word = 5 chars, delay is between chars
    const charsPerMin = avgDelay > 0 ? (60000 / avgDelay) : 0;
    const typingWPM = charsPerMin / 5;

    // Error rate: count backspace/delete keys
    const errorKeys = keys.filter(k => k.key === 'Backspace' || k.key === 'Delete').length;
    const errorRate = keys.length > 0 ? errorKeys / keys.length : 0;

    return { avgDelay, typingWPM, errorRate };
}

function extractSessionFeatures() {
    const sessionDuration = (Date.now() - biometrics.startTime) / 1000; // seconds
    const pagesVisited = biometrics.pagesVisited.size;
    return { sessionDuration, pagesVisited };
}


// --- 3. FEATURE ENGINEERING PIPELINE ---

function buildFeatureVector(transactionData) {
    const deviceHash = generateDeviceFingerprint();
    const mouse = extractMouseFeatures();
    const typing = extractTypingFeatures();
    const session = extractSessionFeatures();

    // Device history
    const fingerprints = JSON.parse(localStorage.getItem('intellishop_fraud_fingerprints') || '{}');
    const deviceSeenBefore = fingerprints[deviceHash] ? 1 : 0;
    const deviceAgeDays = fingerprints[deviceHash]
        ? (Date.now() - fingerprints[deviceHash].firstSeen) / 86400000
        : 0;
    const accountsOnDevice = fingerprints[deviceHash]?.accounts?.length || 0;

    // Transaction features
    const orders = JSON.parse(localStorage.getItem('intellishop_orders') || '[]');
    const now = Date.now();
    const ordersLastHour = orders.filter(o => (now - new Date(o.date).getTime()) < 3600000).length;
    const ordersLast24h = orders.filter(o => (now - new Date(o.date).getTime()) < 86400000).length;
    const totalSpend24h = orders
        .filter(o => (now - new Date(o.date).getTime()) < 86400000)
        .reduce((sum, o) => sum + (o.amount || 0), 0);

    const avgOrderAmount = orders.length > 0
        ? orders.reduce((sum, o) => sum + (o.amount || 0), 0) / orders.length
        : transactionData.amount;
    const amountVsAvg = avgOrderAmount > 0 ? transactionData.amount / avgOrderAmount : 1;

    // Auth features
    const currentUser = JSON.parse(localStorage.getItem('intellishop_user') || 'null');
    const isNewUser = currentUser ? (Date.now() - currentUser.id < 3600000 ? 1 : 0) : 1;
    const accountAgeHours = currentUser ? (Date.now() - currentUser.id) / 3600000 : 0;

    // Graph features
    const graphScore = computeGraphRisk(deviceHash, currentUser?.email);

    // Payment risk
    const paymentRisk = { card: 0.3, upi: 0.2, cod: 0.5 };
    const paymentMethodRisk = paymentRisk[transactionData.paymentMethod] || 0.3;

    // Time of day (normalized 0-1, with late-night hours scoring higher)
    const hour = new Date().getHours();
    const hourRisk = (hour >= 1 && hour <= 5) ? 0.8 : (hour >= 22 || hour === 0) ? 0.5 : 0.2;

    // High risk category check
    const highRiskAmount = transactionData.amount > 50000 ? 1 : 0;

    // Shipping mismatch (simplified — check if address fields are very short/empty)
    const shippingMismatch = transactionData.address &&
        (!transactionData.address.name || transactionData.address.name.length < 2) ? 1 : 0;

    const features = [
        deviceSeenBefore,           // 0
        deviceAgeDays,              // 1
        accountsOnDevice,           // 2
        mouse.avgSpeed,             // 3
        mouse.speedStd,             // 4
        mouse.straightnessRatio,    // 5
        typing.avgDelay,            // 6
        typing.typingWPM,           // 7
        typing.errorRate,           // 8
        session.sessionDuration,    // 9
        session.pagesVisited,       // 10
        session.sessionDuration,    // 11 (time to checkout ≈ session duration)
        transactionData.amount,     // 12
        amountVsAvg,                // 13
        transactionData.itemCount || 1, // 14
        ordersLastHour,             // 15
        ordersLast24h,              // 16
        totalSpend24h,              // 17
        isNewUser,                  // 18
        accountAgeHours,            // 19
        shippingMismatch,           // 20
        highRiskAmount,             // 21
        paymentMethodRisk,          // 22
        hourRisk,                   // 23
        graphScore                  // 24
    ];

    return { features, deviceHash, metadata: { mouse, typing, session } };
}


// --- 4. ISOLATION FOREST ---

class IsolationTree {
    constructor(data, maxDepth, currentDepth = 0) {
        this.left = null;
        this.right = null;
        this.splitFeature = null;
        this.splitValue = null;
        this.size = data.length;

        if (currentDepth >= maxDepth || data.length <= 1) {
            return; // Leaf node
        }

        // Random feature selection
        const numFeatures = data[0].length;
        this.splitFeature = Math.floor(Math.random() * numFeatures);

        // Get min/max of the selected feature
        const values = data.map(row => row[this.splitFeature]).filter(v => isFinite(v));
        if (values.length === 0) return;
        const min = Math.min(...values);
        const max = Math.max(...values);
        if (min === max) return;

        // Random split value between min and max
        this.splitValue = min + Math.random() * (max - min);

        // Partition data
        const leftData = data.filter(row => row[this.splitFeature] < this.splitValue);
        const rightData = data.filter(row => row[this.splitFeature] >= this.splitValue);

        if (leftData.length === 0 || rightData.length === 0) return;

        this.left = new IsolationTree(leftData, maxDepth, currentDepth + 1);
        this.right = new IsolationTree(rightData, maxDepth, currentDepth + 1);
    }

    pathLength(point, currentDepth = 0) {
        if (this.left === null || this.right === null) {
            return currentDepth + avgPathLength(this.size);
        }

        const val = point[this.splitFeature];
        if (!isFinite(val)) return currentDepth + avgPathLength(this.size);

        if (val < this.splitValue) {
            return this.left.pathLength(point, currentDepth + 1);
        }
        return this.right.pathLength(point, currentDepth + 1);
    }
}

// Average path length of unsuccessful search in BST (used for normalization)
function avgPathLength(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

class IsolationForest {
    constructor(numTrees = 50, subsampleSize = 64) {
        this.numTrees = numTrees;
        this.subsampleSize = subsampleSize;
        this.trees = [];
        this.trained = false;
    }

    fit(data) {
        if (data.length < 10) {
            this.trained = false;
            return;
        }

        this.trees = [];
        const maxDepth = Math.ceil(Math.log2(this.subsampleSize));

        for (let i = 0; i < this.numTrees; i++) {
            // Subsample
            const sample = [];
            const sampleSize = Math.min(this.subsampleSize, data.length);
            for (let j = 0; j < sampleSize; j++) {
                sample.push(data[Math.floor(Math.random() * data.length)]);
            }
            this.trees.push(new IsolationTree(sample, maxDepth));
        }
        this.trained = true;
    }

    score(point) {
        if (!this.trained || this.trees.length === 0) return 0.5;

        const avgPath = this.trees.reduce((sum, tree) => sum + tree.pathLength(point), 0) / this.trees.length;
        const c = avgPathLength(this.subsampleSize);
        // Anomaly score: closer to 1 = more anomalous
        return Math.pow(2, -(avgPath / c));
    }

    serialize() {
        return { numTrees: this.numTrees, subsampleSize: this.subsampleSize, trained: this.trained };
    }
}

// Global forest instance
const forest = new IsolationForest(50, 64);

function trainForest() {
    const events = JSON.parse(localStorage.getItem('intellishop_fraud_events') || '[]');
    const featureVectors = events.map(e => e.features);
    if (featureVectors.length >= 10) {
        forest.fit(featureVectors);
        console.log(`[FraudML] Isolation Forest trained on ${featureVectors.length} transactions`);
    }
}


// --- 5. WEIGHTED FEATURE SCORER ---

function weightedFeatureScore(features) {
    let score = 0;

    // New device (never seen before)
    if (features[0] === 0) score += 15; // device_not_seen_before

    // Multiple accounts on same device
    if (features[2] >= 3) score += 20;
    else if (features[2] >= 2) score += 10;

    // Bot-like mouse: too straight (> 0.9) or no mouse data (speed = 0)
    if (features[3] === 0) score += 15; // No mouse movement at all (bot)
    if (features[5] > 0.9) score += 12; // Perfectly straight paths

    // Suspicious typing: too fast (> 200 WPM) or instant (0 delay)
    if (features[6] < 30 && features[7] > 0) score += 15; // Ultra-fast typing
    if (features[7] > 200) score += 10; // Superhuman WPM

    // Session too short (< 10 seconds to checkout)
    if (features[9] < 10) score += 20;
    else if (features[9] < 30) score += 10;

    // Only visited 1 page before checkout
    if (features[10] <= 1) score += 10;

    // High order amount relative to average
    if (features[13] > 5) score += 15;  // 5x the average
    else if (features[13] > 3) score += 8;

    // Velocity: too many orders
    if (features[15] >= 3) score += 25;  // 3+ orders in last hour
    else if (features[15] >= 2) score += 12;

    if (features[16] >= 5) score += 15;  // 5+ orders in 24h

    // New user
    if (features[18] === 1) score += 8;

    // Very new account (< 1 hour)
    if (features[19] < 1) score += 5;

    // Shipping mismatch
    if (features[20] === 1) score += 10;

    // High risk amount
    if (features[21] === 1) score += 10;

    // Late night hours
    score += features[23] * 10;

    // Connected to flagged accounts
    score += Math.min(features[24] * 15, 30);

    // Normalize to 0-100
    return Math.min(Math.round(score), 100);
}


// --- 6. VELOCITY ENGINE ---

function velocityScore(features) {
    let score = 0;
    const ordersLastHour = features[15];
    const ordersLast24h = features[16];
    const totalSpend24h = features[17];

    // Order velocity
    if (ordersLastHour >= 5) score += 40;
    else if (ordersLastHour >= 3) score += 25;
    else if (ordersLastHour >= 2) score += 10;

    // Daily velocity
    if (ordersLast24h >= 10) score += 30;
    else if (ordersLast24h >= 5) score += 15;

    // Spend velocity
    if (totalSpend24h > 200000) score += 30;
    else if (totalSpend24h > 100000) score += 15;

    return Math.min(score, 100);
}


// --- 7. GRAPH-BASED FRAUD DETECTION ---

function recordDeviceUserLink(deviceHash, email) {
    if (!deviceHash || !email) return;

    const fingerprints = JSON.parse(localStorage.getItem('intellishop_fraud_fingerprints') || '{}');

    if (!fingerprints[deviceHash]) {
        fingerprints[deviceHash] = {
            firstSeen: Date.now(),
            accounts: [],
            flaggedCount: 0
        };
    }

    if (!fingerprints[deviceHash].accounts.includes(email)) {
        fingerprints[deviceHash].accounts.push(email);
    }

    localStorage.setItem('intellishop_fraud_fingerprints', JSON.stringify(fingerprints));
}

function computeGraphRisk(deviceHash, email) {
    const fingerprints = JSON.parse(localStorage.getItem('intellishop_fraud_fingerprints') || '{}');
    const flagged = JSON.parse(localStorage.getItem('intellishop_fraud_flagged') || '[]');

    let risk = 0;

    // Check if any account on this device was previously flagged
    const deviceInfo = fingerprints[deviceHash];
    if (deviceInfo) {
        const flaggedEmails = new Set(flagged.map(f => f.email));
        const connectedFlaggedCount = deviceInfo.accounts.filter(a => flaggedEmails.has(a)).length;
        risk += connectedFlaggedCount;

        // Multiple accounts on same device is suspicious
        if (deviceInfo.accounts.length >= 3) risk += 1;
    }

    // Check other devices that share this email
    if (email) {
        for (const [hash, info] of Object.entries(fingerprints)) {
            if (hash !== deviceHash && info.accounts.includes(email)) {
                risk += 0.5; // Same account on multiple devices is mildly suspicious
            }
        }
    }

    return Math.min(risk, 5); // Cap at 5
}


// --- 8. RISK DECISION ENGINE ---

const RISK_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 65,
    HIGH: 85
};

const RISK_ACTIONS = {
    ALLOW: 'allow',
    CHALLENGE: 'challenge',
    FLAG: 'flag',
    BLOCK: 'block'
};

function computeFinalRiskScore(features) {
    const isoScore = forest.score(features) * 100;    // 0-100
    const wScore = weightedFeatureScore(features);      // 0-100
    const vScore = velocityScore(features);             // 0-100
    const gScore = Math.min(features[24] * 20, 100);    // 0-100

    const finalScore = Math.round(
        0.40 * isoScore +
        0.30 * wScore +
        0.15 * vScore +
        0.15 * gScore
    );

    return {
        finalScore: Math.min(finalScore, 100),
        breakdown: {
            isolationForest: Math.round(isoScore),
            weightedFeatures: wScore,
            velocity: vScore,
            graphAnalysis: Math.round(gScore)
        }
    };
}

function getRiskDecision(score) {
    if (score <= RISK_THRESHOLDS.LOW) {
        return { action: RISK_ACTIONS.ALLOW, label: 'Low Risk', color: '#10b981', icon: '✅' };
    } else if (score <= RISK_THRESHOLDS.MEDIUM) {
        return { action: RISK_ACTIONS.CHALLENGE, label: 'Medium Risk', color: '#f59e0b', icon: '⚠️' };
    } else if (score <= RISK_THRESHOLDS.HIGH) {
        return { action: RISK_ACTIONS.FLAG, label: 'High Risk', color: '#f97316', icon: '🔶' };
    } else {
        return { action: RISK_ACTIONS.BLOCK, label: 'Critical Risk', color: '#ef4444', icon: '🛑' };
    }
}


// --- 9. FRAUD EVENT LOGGING ---

function logFraudEvent(transactionData, featureVector, riskResult, decision) {
    const events = JSON.parse(localStorage.getItem('intellishop_fraud_events') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('intellishop_user') || 'null');

    const event = {
        id: 'FRD' + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        email: currentUser?.email || 'guest',
        userName: currentUser?.name || 'Guest',
        deviceHash: featureVector.deviceHash,
        amount: transactionData.amount,
        itemCount: transactionData.itemCount,
        paymentMethod: transactionData.paymentMethod,
        features: featureVector.features,
        riskScore: riskResult.finalScore,
        breakdown: riskResult.breakdown,
        decision: decision.action,
        decisionLabel: decision.label,
        metadata: featureVector.metadata,
        adminReview: null // null = pending, 'approved', 'rejected'
    };

    events.push(event);
    // Keep last 500 events
    if (events.length > 500) events.splice(0, events.length - 500);
    localStorage.setItem('intellishop_fraud_events', JSON.stringify(events));

    // If flagged or blocked, add to flagged list
    if (decision.action === RISK_ACTIONS.FLAG || decision.action === RISK_ACTIONS.BLOCK) {
        const flagged = JSON.parse(localStorage.getItem('intellishop_fraud_flagged') || '[]');
        flagged.push({
            ...event,
            address: transactionData.address
        });
        localStorage.setItem('intellishop_fraud_flagged', JSON.stringify(flagged));

        // Update device flagged count
        const fingerprints = JSON.parse(localStorage.getItem('intellishop_fraud_fingerprints') || '{}');
        if (fingerprints[featureVector.deviceHash]) {
            fingerprints[featureVector.deviceHash].flaggedCount =
                (fingerprints[featureVector.deviceHash].flaggedCount || 0) + 1;
            localStorage.setItem('intellishop_fraud_fingerprints', JSON.stringify(fingerprints));
        }
    }

    // Auto-retrain if enough new data
    if (events.length % 50 === 0) {
        trainForest();
    }

    return event;
}


// --- 10. FRAUD SIMULATION ---

function generateSyntheticTrainingData() {
    const data = [];

    // Generate 80 "normal" transaction patterns
    for (let i = 0; i < 80; i++) {
        data.push([
            1,                              // device seen before
            Math.random() * 365 + 1,        // device age: 1-365 days
            1,                              // 1 account on device
            200 + Math.random() * 800,      // mouse speed: 200-1000
            50 + Math.random() * 200,       // speed std: moderate
            0.3 + Math.random() * 0.4,      // straightness: 0.3-0.7
            80 + Math.random() * 200,       // typing delay: 80-280ms
            30 + Math.random() * 70,        // WPM: 30-100
            0.02 + Math.random() * 0.08,    // error rate: 2-10%
            60 + Math.random() * 600,       // session: 1-11 min
            3 + Math.floor(Math.random() * 5), // pages: 3-7
            60 + Math.random() * 600,       // time to checkout
            500 + Math.random() * 5000,     // amount: 500-5500
            0.5 + Math.random() * 1.5,      // vs avg: 0.5-2.0
            1 + Math.floor(Math.random() * 4), // items: 1-4
            0,                              // orders last hour: 0
            Math.floor(Math.random() * 2),  // orders 24h: 0-1
            Math.random() * 5000,           // spend 24h
            0,                              // not new user
            24 + Math.random() * 1000,      // account age: 24+ hours
            0,                              // no shipping mismatch
            0,                              // not high risk amount
            0.25,                           // normal payment risk
            0.2,                            // normal hour
            0                               // no graph connections
        ]);
    }

    // Generate 20 "fraudulent" patterns
    for (let i = 0; i < 20; i++) {
        data.push([
            0,                              // new device
            0,                              // device age: 0
            Math.floor(Math.random() * 3) + 2, // 2-4 accounts
            Math.random() * 50,             // very low mouse speed (or none)
            Math.random() * 10,             // very low variance
            0.9 + Math.random() * 0.1,      // very straight: 0.9-1.0
            5 + Math.random() * 20,         // very fast typing
            200 + Math.random() * 300,      // superhuman WPM
            0,                              // no errors
            2 + Math.random() * 8,          // very short session: 2-10 sec
            1,                              // only 1 page
            2 + Math.random() * 8,          // instant checkout
            20000 + Math.random() * 80000,  // high amount
            3 + Math.random() * 7,          // 3-10x avg
            5 + Math.floor(Math.random() * 10), // many items
            2 + Math.floor(Math.random() * 5),  // many orders/hour
            5 + Math.floor(Math.random() * 10), // many orders/day
            50000 + Math.random() * 200000, // huge spend
            1,                              // new user
            Math.random() * 1,              // very new account
            Math.random() > 0.5 ? 1 : 0,   // possible mismatch
            1,                              // high risk amount
            0.5,                            // COD
            0.8,                            // late night
            Math.floor(Math.random() * 3)   // connected flagged
        ]);
    }

    return data;
}


// --- 11. PUBLIC API ---

export function initFraudDetection() {
    // Start collecting behavioral biometrics immediately
    startBiometricCollection();

    // Record device fingerprint
    const deviceHash = generateDeviceFingerprint();
    const currentUser = JSON.parse(localStorage.getItem('intellishop_user') || 'null');
    if (currentUser) {
        recordDeviceUserLink(deviceHash, currentUser.email);
    }

    // Train the Isolation Forest
    const events = JSON.parse(localStorage.getItem('intellishop_fraud_events') || '[]');
    if (events.length >= 10) {
        trainForest();
    } else {
        // Bootstrap with synthetic data for initial model
        const syntheticData = generateSyntheticTrainingData();
        forest.fit(syntheticData);
        console.log('[FraudML] Forest bootstrapped with synthetic data');
    }

    console.log('[FraudML] Fraud Detection System initialized');
    console.log(`[FraudML] Device fingerprint: ${deviceHash}`);
    console.log(`[FraudML] Historical events: ${events.length}`);
}

export function scoreFraudRisk(transactionData) {
    // Build feature vector from all collected signals
    const featureData = buildFeatureVector(transactionData);

    // Compute risk score
    const riskResult = computeFinalRiskScore(featureData.features);
    const decision = getRiskDecision(riskResult.finalScore);

    // Log the event
    const event = logFraudEvent(transactionData, featureData, riskResult, decision);

    console.log(`[FraudML] Risk Score: ${riskResult.finalScore}/100 → ${decision.label} (${decision.action})`);
    console.log(`[FraudML] Breakdown:`, riskResult.breakdown);

    return {
        score: riskResult.finalScore,
        breakdown: riskResult.breakdown,
        decision,
        eventId: event.id,
        deviceHash: featureData.deviceHash
    };
}

export function recordDeviceOnAuth(email) {
    const deviceHash = generateDeviceFingerprint();
    recordDeviceUserLink(deviceHash, email);
}

export function getFraudEvents() {
    return JSON.parse(localStorage.getItem('intellishop_fraud_events') || '[]');
}

export function getFlaggedOrders() {
    return JSON.parse(localStorage.getItem('intellishop_fraud_flagged') || '[]');
}

export function updateFraudEventReview(eventId, decision) {
    // Update in fraud events
    const events = JSON.parse(localStorage.getItem('intellishop_fraud_events') || '[]');
    const event = events.find(e => e.id === eventId);
    if (event) {
        event.adminReview = decision;
        localStorage.setItem('intellishop_fraud_events', JSON.stringify(events));
    }

    // Update in flagged orders
    const flagged = JSON.parse(localStorage.getItem('intellishop_fraud_flagged') || '[]');
    const flaggedEvent = flagged.find(e => e.id === eventId);
    if (flaggedEvent) {
        flaggedEvent.adminReview = decision;
        localStorage.setItem('intellishop_fraud_flagged', JSON.stringify(flagged));
    }

    // If admin rejects, increment graph risk for the device
    if (decision === 'rejected' && event) {
        const fingerprints = JSON.parse(localStorage.getItem('intellishop_fraud_fingerprints') || '{}');
        if (fingerprints[event.deviceHash]) {
            fingerprints[event.deviceHash].flaggedCount =
                (fingerprints[event.deviceHash].flaggedCount || 0) + 1;
            localStorage.setItem('intellishop_fraud_fingerprints', JSON.stringify(fingerprints));
        }
    }

    // Retrain model after admin feedback
    trainForest();
}

export function getFraudStats() {
    const events = getFraudEvents();
    const flagged = getFlaggedOrders();

    const total = events.length;
    const blocked = events.filter(e => e.decision === 'block').length;
    const flaggedCount = events.filter(e => e.decision === 'flag').length;
    const challenged = events.filter(e => e.decision === 'challenge').length;
    const allowed = events.filter(e => e.decision === 'allow').length;

    const avgScore = total > 0
        ? Math.round(events.reduce((s, e) => s + e.riskScore, 0) / total)
        : 0;

    const pendingReview = flagged.filter(f => f.adminReview === null).length;

    return {
        total, blocked, flaggedCount, challenged, allowed,
        avgScore, pendingReview,
        fraudRate: total > 0 ? ((blocked + flaggedCount) / total * 100).toFixed(1) : '0.0'
    };
}
