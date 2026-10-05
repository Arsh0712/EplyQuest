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
import { pointsStore } from '../quest/premiumStore.js';
import { premiumStore } from '../quest/premiumStore.js';
import { txt } from './questCommands.js';

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}

const MEDALS = ['🥇', '🥈', '🥉'];
const RANKS  = ['4.', '5.', '6.', '7.', '8.', '9.', '10.'];

function buildLeaderboardCard(guild, entries, callerRank) {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        `# 🏆 Points Leaderboard\n` +
        `-# Top earners in ${guild?.name ?? 'this server'}`,
    ));
    c.addSeparatorComponents(sepLg(true));

    if (entries.length === 0) {
        c.addTextDisplayComponents(txt(
            `-# No points have been earned yet — be the first!\n` +
            `-# Earn pts by inviting members or submitting feedback`,
        ));
        return { components: [c], flags: MessageFlags.IsComponentsV2 };
    }

    const top3  = entries.slice(0, 3);
    const rest  = entries.slice(3, 10);

    // Top 3 podium
    for (let i = 0; i < top3.length; i++) {
        const { userId, points } = top3[i];
        const medal  = MEDALS[i];
        const isPrem = premiumStore.has(userId);
        c.addTextDisplayComponents(txt(
            `${medal} <@${userId}>${isPrem ? ' 💎' : ''}\n` +
            `-# **${points}** pt${points !== 1 ? 's' : ''}`,
        ));
        if (i < top3.length - 1 || rest.length > 0) c.addSeparatorComponents(sep());
    }

    // Positions 4–10
    if (rest.length > 0) {
        c.addSeparatorComponents(sep(true));
        for (let i = 0; i < rest.length; i++) {
            const { userId, points } = rest[i];
            const rank = RANKS[i];
            c.addTextDisplayComponents(txt(
                `${rank} <@${userId}> — **${points}** pt${points !== 1 ? 's' : ''}`,
            ));
        }
    }

    // Caller's rank (if outside top 10)
    if (callerRank && callerRank.rank > 10) {
        c.addSeparatorComponents(sepLg(true));
        c.addTextDisplayComponents(txt(
            `**Your position:** #${callerRank.rank} — **${callerRank.points}** pts`,
        ));
    }

    c.addSeparatorComponents(sepLg(true));
    c.addTextDisplayComponents(txt(
        `-# Earn pts by inviting members (+1) or submitting feedback (+2)`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

async function runLeaderboard(userId, guild, send) {
    // Get all points data
    const all = pointsStore.getAll ? pointsStore.getAll() : {};
    const entries = Object.entries(all)
        .map(([uid, pts]) => ({ userId: uid, points: pts }))
        .filter(e => e.points > 0)
        .sort((a, b) => b.points - a.points);

    // Find caller's rank
    const callerIdx = entries.findIndex(e => e.userId === userId);
    const callerRank = callerIdx >= 0
        ? { rank: callerIdx + 1, points: entries[callerIdx].points }
        : null;

    await send(buildLeaderboardCard(guild, entries, callerRank));
}

export const leaderboardCmd = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top points earners'),
    prefix: 'leaderboard',

    async execute(interaction) {
        await interaction.deferReply();
        await runLeaderboard(
            interaction.user.id,
            interaction.guild,
            (opts) => interaction.followUp(opts),
        );
    },

    async prefixExecute(message, _args, client) {
        await runLeaderboard(
            message.author.id,
            message.guild,
            (opts) => message.channel.send(opts),
        );
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