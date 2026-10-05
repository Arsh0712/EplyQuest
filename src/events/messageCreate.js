// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
import { ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { getEmoji } from '../handlers/emoji.js';
import { PREFIX } from '../utils/config.js';
import { feedbackStore } from '../quest/feedbackStore.js';

// Quest commands that are blocked when a user has a quest block
const BLOCKED_COMMANDS = new Set(['quest', 'questall', 'questlist', 'autoquest', 'status']);

const OWNER_FOOTER = `-# Eply Quest  ·  Built By Eply`;


function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function txt(content) {
    return new TextDisplayBuilder().setContent(content);
}

function buildBlockedCard(unblockAt, prefix) {
    const ts = Math.floor(unblockAt / 1000);
    const c  = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## 🚫 Quest Access Blocked\n` +
        `You missed your **feedback window** after your last quest.\n` +
        `-# Run \`${prefix}feedback <message>\` at any time to remove this block immediately`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `⏳ **Auto-unblock:** <t:${ts}:R>  (<t:${ts}:f>)`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(OWNER_FOOTER));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export default {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.content.startsWith(PREFIX)) return;

        const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const command = client.prefixCommands.get(commandName);
        if (!command) return;

        // ── Block check for quest commands ─────────────────────────────────
        if (BLOCKED_COMMANDS.has(commandName) && feedbackStore.isBlocked(message.author.id)) {
            const until = feedbackStore.blockedUntil(message.author.id);
            await message.channel.send(buildBlockedCard(until, PREFIX)).catch(() => {});
            return;
        }

        try {
            await command.prefixExecute(message, args, client);
        } catch (err) {
            console.error(err);
            await message.reply(`${getEmoji('error')} Something went wrong.`).catch(() => {});
        }
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