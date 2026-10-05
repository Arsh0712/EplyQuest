/**
 * suggestionStore — persists suggestions to suggestions.json
 * Schema: { [id]: { id, guildId, channelId, messageId, authorId, title, description, upvotes: [], downvotes: [], status, createdAt } }
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const FILE = 'suggestions.json';

function load() {
    if (!existsSync(FILE)) return {};
    try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function save(data) {
    writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function nextId(data) {
    const nums = Object.keys(data).map(Number).filter(n => !isNaN(n));
    return String(nums.length ? Math.max(...nums) + 1 : 1);
}

export const suggestionStore = {
    create({ guildId, channelId, messageId, authorId, title, description }) {
        const data = load();
        const id   = nextId(data);
        data[id]   = { id, guildId, channelId, messageId, authorId, title, description, upvotes: [], downvotes: [], status: 'open', createdAt: Date.now() };
        save(data);
        return data[id];
    },

    get(id) { return load()[id] ?? null; },

    getByMessageId(messageId) {
        const data = load();
        return Object.values(data).find(s => s.messageId === messageId) ?? null;
    },

    setMessageId(id, messageId) {
        const data = load();
        if (!data[id]) return;
        data[id].messageId = messageId;
        save(data);
    },

    vote(id, userId, type) {
        // type: 'up' | 'down'
        const data = load();
        const s    = data[id];
        if (!s) return null;
        s.upvotes   = s.upvotes.filter(u => u !== userId);
        s.downvotes = s.downvotes.filter(u => u !== userId);
        if (type === 'up')   s.upvotes.push(userId);
        if (type === 'down') s.downvotes.push(userId);
        save(data);
        return s;
    },

    setStatus(id, status) {
        const data = load();
        if (!data[id]) return null;
        data[id].status = status;
        save(data);
        return data[id];
    },

    delete(id) {
        const data = load();
        delete data[id];
        save(data);
    },

    getConfig(guildId) {
        const cfg = this._loadConfig();
        // Fall back to the hardcoded default channel if not explicitly configured
        return cfg[guildId] ?? { channelId: '1541611210926063697' };
    },

    setConfig(guildId, channelId) {
        const cfg = this._loadConfig();
        cfg[guildId] = { channelId };
        writeFileSync('suggestions-config.json', JSON.stringify(cfg, null, 2));
    },

    _loadConfig() {
        if (!existsSync('suggestions-config.json')) return {};
        try { return JSON.parse(readFileSync('suggestions-config.json', 'utf8')); } catch { return {}; }
    },
};
