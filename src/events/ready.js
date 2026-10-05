// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
import { ActivityType } from 'discord.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PREFIX, OWNER_ID } from '../utils/config.js';
import { startAutoquestWatcher } from '../utils/autoquestWatcher.js';

const col = {
    reset:  '\x1b[0m',
    bright: '\x1b[1m',
    green:  '\x1b[92m',
    white:  '\x1b[97m',
    gray:   '\x1b[90m',
    purple: '\x1b[35m',
};

const line = `${col.purple}${col.bright}  ─────────────────────────────────────${col.reset}`;

/**
 * Keep the bot's avatar in sync with assets/logo.png.
 * Uses a local marker file (.avatar-synced) so the avatar is only uploaded
 * when the logo file actually changes — Discord rate-limits avatar changes.
 */
async function syncLogoAvatar(client) {
    try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const logoPath  = join(__dirname, '..', '..', 'assets', 'logo.png');
        const markerPath = join(__dirname, '..', '..', '.avatar-synced');
        if (!existsSync(logoPath)) return;
        const logoBuf = readFileSync(logoPath);
        const { createHash } = await import('node:crypto');
        const logoHash = createHash('md5').update(logoBuf).digest('hex');
        if (existsSync(markerPath) && readFileSync(markerPath, 'utf8').trim() === logoHash) return;
        await client.user.setAvatar(logoBuf);
        writeFileSync(markerPath, logoHash);
        console.log(`  ${col.green}${col.bright}✓ ${col.white}Bot avatar updated from assets/logo.png${col.reset}`);
    } catch (err) {
        // Rate-limited or failed — not fatal, retry on next boot
        console.log(`  ${col.gray}· avatar sync skipped: ${err.message}${col.reset}`);
    }
}

export default {
    name: 'clientReady',
    once: true,
    async execute(client) {
        client.user.setPresence({
            activities: [{ name: `Eply Quest | ${PREFIX}help`, type: ActivityType.Watching }],
            status: 'online',
        });

        await syncLogoAvatar(client);

        console.log(line);
        console.log(`  ${col.green}${col.bright}✓ ${col.white}Logged in as ${col.green}${client.user.tag}${col.reset}`);
        console.log(`  ${col.green}${col.bright}✓ ${col.white}Serving ${col.green}${client.guilds.cache.size}${col.white} guild(s)${col.reset}`);
        console.log(`  ${col.green}${col.bright}✓ ${col.white}Owner: ${col.green}${OWNER_ID}${col.reset}`);
        console.log(`  ${col.green}${col.bright}✓ ${col.white}Eply Quest — Built By Eply${col.reset}`);
        console.log(line);

        startAutoquestWatcher(client);
    },
};

// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================