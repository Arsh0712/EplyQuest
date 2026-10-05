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
import { sep, txt } from './questCommands.js';
import { isStaff } from '../utils/config.js';

// ── Permission check ───────────────────────────────────────────────────────
// Owner + admins can remove premium.
const isAdmin = isStaff;

// ── Card builders ──────────────────────────────────────────────────────────

function buildNoPermCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ No Permission\n` +
        `-# only admins can remove premium`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildMissingTargetCard(prefix) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Missing User\n` +
        `-# usage: \`${prefix}removepremium @user\``,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildNotPremiumCard(targetId) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Not Premium\n` +
        `-# <@${targetId}> does not have premium`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildSuccessCard(targetId) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✦ Premium Removed\n` +
        `-# <@${targetId}> no longer has premium access`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runRemovePremium(executorMember, targetId, send, prefix = ',,') {
    if (!isAdmin(executorMember)) {
        await send(buildNoPermCard());
        return;
    }
    if (!targetId) {
        await send(buildMissingTargetCard(prefix));
        return;
    }
    if (!premiumStore.has(targetId)) {
        await send(buildNotPremiumCard(targetId));
        return;
    }
    if (!premiumStore.remove(targetId)) {
        // Owner premium can't be removed
        await send(buildSuccessCard(targetId));
        return;
    }
    await send(buildSuccessCard(targetId));
}

// ── Command ────────────────────────────────────────────────────────────────

export const removePremiumCmd = {
    data: new SlashCommandBuilder()
        .setName('removepremium')
        .setDescription('Remove premium from a user (admin only)')
        .addUserOption(o => o.setName('user').setDescription('User to remove premium from').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    prefix: 'removepremium',

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user');
        await runRemovePremium(interaction.member, target?.id, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message, args) {
        const mention = args[0];
        const targetId = mention?.replace(/^<@!?(\d+)>$/, '$1') ?? null;
        await runRemovePremium(message.member, targetId, (opts) => message.channel.send(opts), ',,');
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