// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================

import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import deployCommands from './utils/deployCommands.js';
import { makeTokenStore } from './commands/questCommands.js';
import { startAutoquestWatcher } from './utils/autoquestWatcher.js';
import { writeFileSync, existsSync } from 'fs';
import { cacheInvites } from './events/guildMemberAdd.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);


const col = {
    reset:   '\x1b[0m',
    bright:  '\x1b[1m',
    cyan:    '\x1b[96m',
    blue:    '\x1b[34m',
    white:   '\x1b[97m',
    magenta: '\x1b[35m',
    green:   '\x1b[92m',
    dim:     '\x1b[90m',
};
function banner() {
    const art = String.raw`
 ███████╗██████╗ ██╗  ██╗   ██╗    ███████╗ █████╗ ███████╗███████╗████████╗
 ██╔════╝██╔══██╗╚██╗ ██╔╝   ██╔╝    ██╔════╝██╔══██╗██╔════╝██╔════╝╚══██╔══╝
 █████╗  ██████╔╝ ╚███╔╝    ██╔╝     █████╗  ███████║███████╗█████╗     ██║
 ██╔══╝  ██╔═══╝  ██╔██╗    ██╔╝     ██╔══╝  ██╔══██║╚════██║██╔══╝     ██║
 ███████╗██║     ██╔╝ ██╗   ██╔╝      ███████╗██║  ██║███████║███████╗   ██║
 ╚══════╝╚═╝     ╚═╝  ╚═╝   ╚═╝       ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝
                                Q U E S T   ·   BUILT BY EPLY
`;

    const lines = art.trimEnd().split('\n');

    console.log('');
    for (const line of lines) {
        console.log(`${col.magenta}${line}${col.reset}`);
    }

    console.log('');
    console.log(`${col.dim}        ════════════════════════════════════════════════════════════════${col.reset}`);
    console.log('');
    console.log(`                    ${col.magenta}${col.bright}◆ EPLY QUEST ◆${col.reset}`);
    console.log(`                 ${col.cyan}${col.bright}Built By Eply${col.reset}`);
    console.log('');
    console.log(`              ${col.green}${col.bright}●${col.reset} ${col.white}${col.bright}SYSTEM ONLINE${col.reset}`);
    console.log(`              ${col.dim}│${col.reset} ${col.cyan}QUEST ENGINE${col.reset} ${col.dim}│${col.reset} ${col.magenta}v1.0${col.reset}`);
    console.log('');
    console.log(`${col.dim}        ════════════════════════════════════════════════════════════════${col.reset}`);
    console.log('');
}


const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error('DISCORD_TOKEN is not set.'); process.exit(1); }

// Ensure data files exist
if (!existsSync('tokens.json'))              writeFileSync('tokens.json', '{}');
if (!existsSync('autoquest.json'))           writeFileSync('autoquest.json', '[]');
if (!existsSync('premium.json'))             writeFileSync('premium.json', '{}');
if (!existsSync('points.json'))              writeFileSync('points.json', '{}');
if (!existsSync('suggestions.json'))         writeFileSync('suggestions.json', '{}');
if (!existsSync('suggestions-config.json'))  writeFileSync('suggestions-config.json', '{}');
if (!existsSync('tickets.json'))             writeFileSync('tickets.json', '{}');
if (!existsSync('tickets-config.json'))      writeFileSync('tickets-config.json', '{}');
if (!existsSync('welcomer-config.json'))     writeFileSync('welcomer-config.json', '{}');

banner();
await deployCommands(TOKEN, process.env.DISCORD_CLIENT_ID);


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites,
    ],
    partials: [Partials.Message, Partials.Channel],
});

client.commands       = new Collection();
client.prefixCommands = new Collection();
client.tokenStore     = makeTokenStore(TOKEN);

// Non-command exports to skip when registering commands
const SKIP_EXPORTS = new Set([
    'default',
    'makeTokenStore',
    'handleLinkModal',
    'handleLinkPromptButton',
    'handleStartSessionButton',
    'handleTokenGuideButton',
    'runAutoquestForUser',      // autoquest.js
    'handlePerQuestPageButton', // questall.js
    'perQuestCache',            // questall.js
    'SHOP_ITEMS',               // shop.js — not a command
    'handleHelpPageSelect',     // help.js — interaction handler, not a command
    'buildHelp',                // help.js — builder util, not a command
    'activeGiveaways',          // giveaway.js — store, not a command
    'endGiveaway',              // giveaway.js — util, not a command
    'buildSuggestionCard',      // suggest.js — card builder
    'handleSuggestVote',        // suggest.js — interaction handler
    'handleSuggestPitchNew',    // suggest.js — interaction handler
    'handleTicketOpenSelect',   // ticket.js — interaction handler
    'handleTicketClaim',        // ticket.js — interaction handler
    'handleTicketClose',        // ticket.js — interaction handler
    'openTicket',               // ticket.js — util
    'buildReviewModal',         // feedback.js — modal builder
    'handleFeedbackModal',      // feedback.js — interaction handler
    'handleAddVoiceButton',     // feedback.js — interaction handler
    'handleVoiceModal',         // feedback.js — interaction handler
    'buildWelcomeCard',         // welcomer.js — card builder
    'handleWelcomerButton',     // welcomer.js — interaction handler
    'handleWelcomerChannelModal', // welcomer.js — interaction handler
    'handleWelcomerMessageModal', // welcomer.js — interaction handler
    'cacheInvites',             // guildMemberAdd.js (not a command)
    // premiumStore exports
    'premiumStore',
    'pointsStore',
    // questCommands re-exports
    'ACCENT',
    'sep', 'txt', 'footerRow', 'rewardText', 'trimLines',
    'buildLinkCard', 'buildExpiredTokenCard', 'buildErrorCard',
    'buildNoQuestsCard', 'buildAccountPanel', 'buildConfirmLockCard',
    'buildAccountLockedCard', 'buildQuestListCard', 'buildQuestPickCard',
    'buildPremiumQuestSelectorCard', 'buildControlBarCard',
    'buildQuestOverviewCard', 'buildQuestArtCard', 'buildControlPanelCard',
    'buildPremiumLogsCard', 'questSelectorMessages',
    'runSelectedQuest',
    'handleQuestPickSelect', 'handleQuestNavButton', 'handlePickAnotherButton',
]);

const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
    const mod = await import(pathToFileURL(join(__dirname, 'commands', file)).href);
    // Single default export
    if (mod.default) {
        const cmd = mod.default;
        if (cmd?.data)   client.commands.set(cmd.data.name, cmd);
        if (cmd?.prefix) client.prefixCommands.set(cmd.prefix, cmd);
    }
    // Named exports
    for (const [key, cmd] of Object.entries(mod)) {
        if (SKIP_EXPORTS.has(key)) continue;
        if (cmd?.data)   client.commands.set(cmd.data.name, cmd);
        if (cmd?.prefix) client.prefixCommands.set(cmd.prefix, cmd);
    }
}

const eventFiles = readdirSync(join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
    const mod   = await import(pathToFileURL(join(__dirname, 'events', file)).href);
    const event = mod.default;
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Cache existing invites once bot is ready (for invite tracking)
client.once('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
        await cacheInvites(guild);
    }
});
// Also cache when bot joins a new guild
client.on('guildCreate', async (guild) => {
    await cacheInvites(guild);
});

client.login(TOKEN);
startAutoquestWatcher(client);

// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
