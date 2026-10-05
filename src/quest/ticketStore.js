/**
 * ticketStore — persists tickets to tickets.json
 * Schema: { [channelId]: { id, guildId, channelId, authorId, claimedBy, status, createdAt } }
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const FILE        = 'tickets.json';
const CONFIG_FILE = 'tickets-config.json';

function load() {
    if (!existsSync(FILE)) return {};
    try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function save(d) { writeFileSync(FILE, JSON.stringify(d, null, 2)); }

function nextNum(guildId) {
    const data = load();
    const nums = Object.values(data).filter(t => t.guildId === guildId).map(t => t.number ?? 0);
    return nums.length ? Math.max(...nums) + 1 : 1;
}

export const ticketStore = {
    create({ guildId, channelId, authorId }) {
        const data   = load();
        const number = nextNum(guildId);
        data[channelId] = { guildId, channelId, authorId, number, claimedBy: null, status: 'open', addedUsers: [], createdAt: Date.now() };
        save(data);
        return data[channelId];
    },

    get(channelId) { return load()[channelId] ?? null; },

    claim(channelId, staffId) {
        const data = load();
        if (!data[channelId]) return null;
        data[channelId].claimedBy = staffId;
        save(data);
        return data[channelId];
    },

    addUser(channelId, userId) {
        const data = load();
        if (!data[channelId]) return null;
        if (!data[channelId].addedUsers.includes(userId))
            data[channelId].addedUsers.push(userId);
        save(data);
        return data[channelId];
    },

    close(channelId) {
        const data = load();
        if (!data[channelId]) return null;
        data[channelId].status = 'closed';
        save(data);
        return data[channelId];
    },

    delete(channelId) {
        const data = load();
        delete data[channelId];
        save(data);
    },

    // ── Config ─────────────────────────────────────────────────────────────

    getConfig(guildId) {
        const cfg = this._loadCfg();
        return cfg[guildId] ?? null;
    },

    setConfig(guildId, { categoryId, logChannelId, supportRoleId }) {
        const cfg = this._loadCfg();
        cfg[guildId] = { categoryId, logChannelId, supportRoleId };
        writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    },

    _loadCfg() {
        if (!existsSync(CONFIG_FILE)) return {};
        try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
    },
};
