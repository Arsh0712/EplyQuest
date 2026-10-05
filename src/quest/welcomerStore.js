/**
 * welcomerStore — persists welcomer config to welcomer-config.json
 * Schema: { [guildId]: { channelId, message, embedColor, showAvatar, enabled } }
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const FILE = 'welcomer-config.json';

function load() {
    if (!existsSync(FILE)) return {};
    try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function save(d) { writeFileSync(FILE, JSON.stringify(d, null, 2)); }

const DEFAULTS = {
    channelId:  null,
    message:    'Welcome to the server, {user}! We now have {count} members.',
    enabled:    true,
};

export const welcomerStore = {
    get(guildId) {
        const d = load();
        return d[guildId] ? { ...DEFAULTS, ...d[guildId] } : null;
    },

    set(guildId, fields) {
        const d = load();
        d[guildId] = { ...DEFAULTS, ...(d[guildId] ?? {}), ...fields };
        save(d);
        return d[guildId];
    },

    setChannel(guildId, channelId) {
        return this.set(guildId, { channelId });
    },

    setMessage(guildId, message) {
        return this.set(guildId, { message });
    },

    setEnabled(guildId, enabled) {
        return this.set(guildId, { enabled });
    },

    delete(guildId) {
        const d = load();
        delete d[guildId];
        save(d);
    },
};
