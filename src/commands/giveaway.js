// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
import {
    SlashCommandBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} from 'discord.js';
import { txt } from './questCommands.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}

function parseDuration(str) {
    const re = /(\d+)\s*([smhd])/gi;
    let total = 0, match;
    while ((match = re.exec(str)) !== null) {
        const v = parseInt(match[1], 10);
        const u = match[2].toLowerCase();
        if (u === 's') total += v * 1_000;
        if (u === 'm') total += v * 60_000;
        if (u === 'h') total += v * 3_600_000;
        if (u === 'd') total += v * 86_400_000;
    }
    return total;
}

function formatDuration(ms) {
    const d = Math.floor(ms / 86_400_000); ms %= 86_400_000;
    const h = Math.floor(ms / 3_600_000);  ms %= 3_600_000;
    const m = Math.floor(ms / 60_000);     ms %= 60_000;
    const s = Math.floor(ms / 1000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
}

const EMOJI = '🎉';

// ── Active giveaways ───────────────────────────────────────────────────────
// Map<messageId, { channelId, endsAt, winners, prize, host, timeoutId }>

export const activeGiveaways = new Map();

// ── Card builders ──────────────────────────────────────────────────────────

function buildActiveCard({ prize, host, winners, endsAt, duration }) {
    const ts = Math.floor(endsAt / 1000);
    const c  = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        `# ${EMOJI}  G I V E A W A Y\n### ${prize}`,
    ));
    c.addSeparatorComponents(sepLg(true));
    c.addTextDisplayComponents(txt(
        `🏆 **Winners:** ${winners}\n` +
        `👤 **Hosted by:** ${host}\n` +
        `⏱️ **Duration:** ${formatDuration(duration)}`,
    ));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `⌛ **Ends:** <t:${ts}:R>\n` +
        `-# <t:${ts}:F>`,
    ));
    c.addSeparatorComponents(sepLg(true));
    c.addTextDisplayComponents(txt(
        `-# React with ${EMOJI} below to enter!`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildEndedCard({ prize, host, winnerMentions, totalEntries, rerolled = false }) {
    const c = new ContainerBuilder();

    const status = rerolled ? `${EMOJI}  REROLLED` : `${EMOJI}  GIVEAWAY ENDED`;
    c.addTextDisplayComponents(txt(`# ${status}\n### ${prize}`));
    c.addSeparatorComponents(sepLg(true));

    if (winnerMentions.length === 0) {
        c.addTextDisplayComponents(txt(
            `😔 **No valid entries** — no winner this time.\n` +
            `👤 **Hosted by:** ${host}`,
        ));
    } else {
        c.addTextDisplayComponents(txt(
            `🎊 **Winner${winnerMentions.length > 1 ? 's' : ''}:**\n` +
            `${winnerMentions.map(m => `> ${m}`).join('\n')}\n`,
        ));
        c.addSeparatorComponents(sep());
        c.addTextDisplayComponents(txt(
            `👤 **Hosted by:** ${host}\n` +
            `-# ${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'} total`,
        ));
    }

    c.addSeparatorComponents(sepLg(true));
    c.addTextDisplayComponents(txt(
        rerolled
            ? `-# Rerolled · winners have been updated above`
            : `-# Giveaway concluded`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildCongratsCard({ mentions, prize, host }) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `${EMOJI} Congratulations ${mentions.join(', ')}!\n` +
        `### You won **${prize}**!\n` +
        `-# Please contact ${host} to claim your prize.`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildErrCard(msg) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(`## ✗ Error\n-# ${msg}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildNotFoundCard(gwid) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Giveaway Not Found\n` +
        `-# No active giveaway with ID \`${gwid}\`\n` +
        `-# Make sure you copied the message ID correctly`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Shared: pick winners from a message's reactions ────────────────────────

async function pickWinners(channel, messageId, count) {
    const message   = await channel.messages.fetch(messageId);
    const reaction  = message.reactions.cache.get(EMOJI);
    let participants = [];
    if (reaction) {
        const users  = await reaction.users.fetch();
        participants = users.filter(u => !u.bot).map(u => u.id);
    }
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const picked   = shuffled.slice(0, Math.min(count, shuffled.length));
    return { message, participants, picked };
}

// ── Core end logic (shared by gend + auto-end) ────────────────────────────

export async function endGiveaway(client, messageId, channelId, { rerolled = false } = {}) {
    const data = activeGiveaways.get(messageId);
    if (!data) return null;

    if (!rerolled) {
        clearTimeout(data.timeoutId);
        activeGiveaways.delete(messageId);
    }

    try {
        const channel = await client.channels.fetch(channelId);
        const { message, participants, picked } = await pickWinners(channel, messageId, data.winners);
        const mentions = picked.map(id => `<@${id}>`);

        await message.edit(buildEndedCard({
            prize:          data.prize,
            host:           data.host,
            winnerMentions: mentions,
            totalEntries:   participants.length,
            rerolled,
        }));

        if (picked.length > 0) {
            await channel.send(buildCongratsCard({ mentions, prize: data.prize, host: data.host }));
        }

        return { mentions, participants };
    } catch (err) {
        console.error('[Giveaway] endGiveaway error:', err);
        return null;
    }
}

// ── ,,gstart ──────────────────────────────────────────────────────────────

async function runGstart({ durationStr, winners, host, prize, send, client, channelId }) {
    const duration = parseDuration(durationStr);
    if (!duration)            return await send(buildErrCard(`invalid duration \`${durationStr}\`  ·  try \`10m\`, \`1h\`, \`2h30m\`, \`1d\``));
    if (winners < 1 || winners > 20) return await send(buildErrCard(`winners must be between 1 and 20`));
    if (!prize?.trim())       return await send(buildErrCard(`prize cannot be empty`));

    const endsAt = Date.now() + duration;
    const msg    = await send(buildActiveCard({ prize, host, winners, endsAt, duration }));

    try { await msg.react(EMOJI); } catch {}

    const timeoutId = setTimeout(() => endGiveaway(client, msg.id, channelId), duration);
    activeGiveaways.set(msg.id, { channelId, endsAt, winners, prize, host, timeoutId });
}

export const gstartCmd = {
    data: new SlashCommandBuilder()
        .setName('gstart')
        .setDescription('Start a reaction giveaway')
        .addStringOption(o  => o.setName('time').setDescription('Duration e.g. 10m, 1h, 1d').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(20))
        .addStringOption(o  => o.setName('host').setDescription('Host (mention or name)').setRequired(true))
        .addStringOption(o  => o.setName('prize').setDescription('What are you giving away?').setRequired(true)),
    prefix: 'gstart',

    async execute(interaction) {
        await interaction.deferReply();
        await runGstart({
            durationStr: interaction.options.getString('time'),
            winners:     interaction.options.getInteger('winners'),
            host:        interaction.options.getString('host'),
            prize:       interaction.options.getString('prize'),
            client:      interaction.client,
            channelId:   interaction.channelId,
            send: async (opts) => {
                await interaction.editReply(opts);
                return await interaction.fetchReply();
            },
        });
    },

    async prefixExecute(message, args, client) {
        if (args.length < 4) {
            const c = new ContainerBuilder();
            c.addTextDisplayComponents(txt(
                `## ✗ Missing Arguments\n` +
                `-# usage: \`,,gstart <time> <winners> <host> <prize>\`\n` +
                `-# example: \`,,gstart 1h 2 @Admin Steam Gift Card\``,
            ));
            await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
            return;
        }
        const [durationStr, winnersStr, hostRaw, ...prizeParts] = args;
        const winners = parseInt(winnersStr, 10);
        if (isNaN(winners)) {
            await message.channel.send(buildErrCard(`winners must be a number, e.g. \`2\``));
            return;
        }
        await runGstart({
            durationStr, winners, host: hostRaw, prize: prizeParts.join(' '),
            client, channelId: message.channelId,
            send: (opts) => message.channel.send(opts),
        });
    },
};

// ── ,,gend <gwid> ─────────────────────────────────────────────────────────

async function runGend({ gwid, send, client }) {
    if (!gwid) {
        await send(buildErrCard(`usage: \`,,gend <message ID>\``));
        return;
    }
    const data = activeGiveaways.get(gwid);
    if (!data) {
        await send(buildNotFoundCard(gwid));
        return;
    }
    const result = await endGiveaway(client, gwid, data.channelId);
    if (!result) {
        await send(buildErrCard(`failed to end giveaway — check bot permissions in that channel`));
    }
}

export const gendCmd = {
    data: new SlashCommandBuilder()
        .setName('gend')
        .setDescription('End a giveaway early')
        .addStringOption(o => o.setName('gwid').setDescription('Message ID of the giveaway').setRequired(true)),
    prefix: 'gend',

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await runGend({
            gwid:   interaction.options.getString('gwid'),
            client: interaction.client,
            send:   (opts) => interaction.editReply(opts),
        });
    },

    async prefixExecute(message, args, client) {
        await runGend({
            gwid:   args[0] ?? null,
            client,
            send:   (opts) => message.channel.send(opts),
        });
    },
};

// ── ,,greroll <gwid> ──────────────────────────────────────────────────────

async function runGreroll({ gwid, send, client }) {
    if (!gwid) {
        await send(buildErrCard(`usage: \`,,greroll <message ID>\``));
        return;
    }

    // Allow reroll on both active and already-ended giveaways
    // For ended ones we won't have the data anymore — guide the user
    const data = activeGiveaways.get(gwid);
    if (!data) {
        await send(buildNotFoundCard(gwid));
        return;
    }

    const result = await endGiveaway(client, gwid, data.channelId, { rerolled: true });
    if (!result) {
        await send(buildErrCard(`failed to reroll — check bot permissions in that channel`));
        return;
    }

    if (result.mentions.length > 0) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(txt(
            `## 🎲 Rerolled!\n` +
            `-# New winner${result.mentions.length > 1 ? 's' : ''}: ${result.mentions.join(', ')}`,
        ));
        await send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
}

export const grerollCmd = {
    data: new SlashCommandBuilder()
        .setName('greroll')
        .setDescription('Reroll the winner(s) of a giveaway')
        .addStringOption(o => o.setName('gwid').setDescription('Message ID of the giveaway').setRequired(true)),
    prefix: 'greroll',

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await runGreroll({
            gwid:   interaction.options.getString('gwid'),
            client: interaction.client,
            send:   (opts) => interaction.editReply(opts),
        });
    },

    async prefixExecute(message, args, client) {
        await runGreroll({
            gwid:   args[0] ?? null,
            client,
            send:   (opts) => message.channel.send(opts),
        });
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