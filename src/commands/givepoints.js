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
import { pointsStore } from '../quest/premiumStore.js';
import { sep, txt } from './questCommands.js';
import { isStaff } from '../utils/config.js';

// ── Permission check ───────────────────────────────────────────────────────
// Owner + admins can give points.
const isAdmin = isStaff;

// ── Card builders ──────────────────────────────────────────────────────────

function buildNoPermCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ No Permission\n` +
        `-# only admins can give points`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildMissingArgsCard(prefix) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Missing Arguments\n` +
        `-# usage: \`${prefix}givepoints @user <amount>\``,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildInvalidAmountCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Invalid Amount\n` +
        `-# amount must be a positive number`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildSuccessCard(targetId, amount, newTotal) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✦ Points Given\n` +
        `-# <@${targetId}> received **${amount} pt${amount !== 1 ? 's' : ''}**\n` +
        `-# their new balance: **${newTotal} pts**`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runGivePoints(executorMember, targetId, amount, send, prefix = ',,') {
    if (!isAdmin(executorMember)) {
        await send(buildNoPermCard());
        return;
    }
    if (!targetId || amount === null) {
        await send(buildMissingArgsCard(prefix));
        return;
    }
    if (isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
        await send(buildInvalidAmountCard());
        return;
    }
    const newTotal = pointsStore.add(targetId, amount);
    await send(buildSuccessCard(targetId, amount, newTotal));
}

// ── Command ────────────────────────────────────────────────────────────────

export const givePointsCmd = {
    data: new SlashCommandBuilder()
        .setName('givepoints')
        .setDescription('Give points to a user (admin only)')
        .addUserOption(o => o.setName('user').setDescription('User to give points to').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount of points to give').setRequired(true).setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    prefix: 'givepoints',

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        await runGivePoints(interaction.member, target?.id, amount, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message, args) {
        // ,,givepoints @user <amount>
        const mention = args[0];
        const targetId = mention?.replace(/^<@!?(\d+)>$/, '$1') ?? null;
        const amount = args[1] !== undefined ? parseInt(args[1], 10) : null;
        await runGivePoints(message.member, targetId, amount, (opts) => message.channel.send(opts), ',,');
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