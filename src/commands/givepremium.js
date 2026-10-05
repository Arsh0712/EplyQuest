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
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import { premiumStore } from '../quest/premiumStore.js';
import { sep, txt, ACCENT } from './questCommands.js';
import { isStaff, isOwner } from '../utils/config.js';

// ── Permission check ───────────────────────────────────────────────────────
// Owner + admins can grant premium.
const isAdmin = isStaff;

// ── Card builder ───────────────────────────────────────────────────────────

function buildGivePremiumCard(target, success, already = false) {
    const c = new ContainerBuilder();

    if (!success) {
        c.addTextDisplayComponents(txt(
            `## ✗ No Permission\n` +
            `-# only admins can give premium`,
        ));
        return { components: [c], flags: MessageFlags.IsComponentsV2 };
    }

    if (already) {
        c.addTextDisplayComponents(txt(
            `## ✦ Already Premium\n` +
            `-# <@${target}> already has premium`,
        ));
        return { components: [c], flags: MessageFlags.IsComponentsV2 };
    }

    c.addTextDisplayComponents(txt(
        `## ✦ Premium Granted\n` +
        `-# <@${target}> now has premium access`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildMissingTargetCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Missing User\n` +
        `-# usage: \`,,givepremium @user\``,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runGivePremium(executorMember, targetId, send) {
    if (!isAdmin(executorMember)) {
        await send(buildGivePremiumCard(targetId, false));
        return;
    }
    if (!targetId) {
        await send(buildMissingTargetCard());
        return;
    }
    // Owner always has premium — no grant needed
    if (isOwner(targetId)) {
        await send(buildGivePremiumCard(targetId, true, true));
        return;
    }
    const already = premiumStore.has(targetId);
    if (!already) premiumStore.add(targetId);
    await send(buildGivePremiumCard(targetId, true, already));
}

// ── Command ────────────────────────────────────────────────────────────────

export const givePremiumCmd = {
    data: new SlashCommandBuilder()
        .setName('givepremium')
        .setDescription('Grant premium to a user (admin only)')
        .addUserOption(o => o.setName('user').setDescription('User to grant premium').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    prefix: 'givepremium',

    async execute(interaction, client) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user');
        await runGivePremium(interaction.member, target?.id, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message, args, client) {
        // Parse mention: <@123456789> or <@!123456789>
        const mention = args[0];
        const targetId = mention?.replace(/^<@!?(\d+)>$/, '$1') ?? null;
        await runGivePremium(message.member, targetId, (opts) => message.channel.send(opts));
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
