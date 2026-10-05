import { readFileSync, writeFileSync, existsSync } from 'fs';
import { OWNER_ID, isOwner } from '../utils/config.js';

const PREMIUM_FILE = 'premium.json';
const POINTS_FILE  = 'points.json';

// ── Premium ────────────────────────────────────────────────────────────────

function loadPremium() {
    if (!existsSync(PREMIUM_FILE)) { writeFileSync(PREMIUM_FILE, '{}'); return {}; }
    try { return JSON.parse(readFileSync(PREMIUM_FILE, 'utf8')); } catch { return {}; }
}

function savePremium(data) {
    writeFileSync(PREMIUM_FILE, JSON.stringify(data, null, 2));
}

export const premiumStore = {
    // The owner always has premium — hardcoded, regardless of premium.json
    has(userId)    { return isOwner(userId) || !!loadPremium()[userId]; },
    add(userId)    { const d = loadPremium(); d[userId] = { grantedAt: new Date().toISOString() }; savePremium(d); },
    // Premium can never be removed from the owner
    remove(userId) {
        if (isOwner(userId)) return false;
        const d = loadPremium(); delete d[userId]; savePremium(d); return true;
    },
    list()         { const ids = Object.keys(loadPremium()); if (!ids.includes(OWNER_ID)) ids.unshift(OWNER_ID); return ids; },
};

// ── Points ─────────────────────────────────────────────────────────────────

function loadPoints() {
    if (!existsSync(POINTS_FILE)) { writeFileSync(POINTS_FILE, '{}'); return {}; }
    try { return JSON.parse(readFileSync(POINTS_FILE, 'utf8')); } catch { return {}; }
}

function savePoints(data) {
    writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2));
}

export const pointsStore = {
    get(userId)        { return loadPoints()[userId] ?? 0; },
    getAll()           { return loadPoints(); },
    add(userId, amt)   { const d = loadPoints(); d[userId] = (d[userId] ?? 0) + amt; savePoints(d); return d[userId]; },
    spend(userId, amt) {
        const d = loadPoints();
        const cur = d[userId] ?? 0;
        if (cur < amt) return false;
        d[userId] = cur - amt;
        savePoints(d);
        return true;
    },
    set(userId, amt)   { const d = loadPoints(); d[userId] = amt; savePoints(d); },
};
