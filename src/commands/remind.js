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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from 'discord.js';
import { txt } from './questCommands.js';

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

function buildReminderSetCard(user, message, ms, channelId) {
    const fireAt = Math.floor((Date.now() + ms) / 1000);
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(`## ⏰ Reminder Set`));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`**Message:** *"${message}"*`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `🕐 **Fires:** <t:${fireAt}:R>  (<t:${fireAt}:f>)\n` +
        `-# You'll be pinged in <#${channelId}>`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`-# Duration: ${formatDuration(ms)}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildReminderFireCard(user, message) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(`## ⏰ Reminder!\n<@${user.id}>`));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`*"${message}"*`));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`-# This reminder was set by you`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildErrCard(msg) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(`## ✗ Error\n-# ${msg}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

async function runRemind({ user, channelId, durationStr, message, send, client }) {
    if (!durationStr || !message?.trim()) {
        await send(buildErrCard('Usage: `,,remind <time> <message>`\nExample: `,,remind 30m Take a break!`'));
        return;
    }

    const ms = parseDuration(durationStr);
    if (!ms || ms < 5_000) {
        await send(buildErrCard('Minimum reminder time is **5 seconds**. Try `5s`, `10m`, `1h`, `2h30m`'));
        return;
    }
    if (ms > 7 * 86_400_000) {
        await send(buildErrCard('Maximum reminder time is **7 days**.'));
        return;
    }

    await send(buildReminderSetCard(user, message.trim(), ms, channelId));

    setTimeout(async () => {
        try {
            const ch = await client.channels.fetch(channelId);
            if (ch) await ch.send(buildReminderFireCard(user, message.trim()));
        } catch (err) {
            console.error('[remind] Failed to fire reminder:', err);
        }
    }, ms);
}

export const remindCmd = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder — bot will ping you after the time')
        .addStringOption(o => o.setName('time').setDescription('Duration e.g. 10m, 1h, 2h30m').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('What to remind you about').setRequired(true)),
    prefix: 'remind',

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await runRemind({
            user:        interaction.user,
            channelId:   interaction.channelId,
            durationStr: interaction.options.getString('time'),
            message:     interaction.options.getString('message'),
            send:        (opts) => interaction.editReply(opts),
            client:      interaction.client,
        });
    },

    async prefixExecute(message, args, client) {
        const [durationStr, ...rest] = args;
        await runRemind({
            user:        message.author,
            channelId:   message.channelId,
            durationStr,
            message:     rest.join(' '),
            send:        (opts) => message.channel.send(opts),
            client,
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