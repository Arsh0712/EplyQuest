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
} from 'discord.js';
import { pointsStore } from '../quest/premiumStore.js';
import { SHOP_ITEMS } from './shop.js';
import { sep, txt } from './questCommands.js';

// ── Card builders ──────────────────────────────────────────────────────────

function buildUnknownItemCard(query, prefix) {
    const list = SHOP_ITEMS.map(i => `\`${i.id}\``).join(', ');
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Unknown Item\n` +
        `-# \`${query}\` is not in the shop\n` +
        `-# available: ${list}\n` +
        `-# tip: run \`${prefix}shop\` to browse`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildMissingItemCard(prefix) {
    const list = SHOP_ITEMS.map(i => `\`${i.id}\``).join(', ');
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Missing Item\n` +
        `-# usage: \`${prefix}buy <item>\`\n` +
        `-# available: ${list}`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildResultCard(userId, item, ok) {
    const pts = pointsStore.get(userId);
    const c   = new ContainerBuilder();

    if (!ok) {
        c.addTextDisplayComponents(txt(
            `## ✗ Purchase Failed\n` +
            `-# not enough points to buy **${item.label}** (costs ${item.cost} pt${item.cost !== 1 ? 's' : ''})\n` +
            `-# your balance: **${pts} pt${pts !== 1 ? 's' : ''}**`,
        ));
    } else {
        c.addTextDisplayComponents(txt(
            `## ✦ Purchased!\n` +
            `-# ${item.emoji} **${item.label}** — enjoy ♡\n` +
            `-# remaining balance: **${pts} pt${pts !== 1 ? 's' : ''}**`,
        ));
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runBuy(userId, query, send, prefix = ',,') {
    if (!query) {
        await send(buildMissingItemCard(prefix));
        return;
    }

    const item = SHOP_ITEMS.find(i => i.id.toLowerCase() === query.toLowerCase());
    if (!item) {
        await send(buildUnknownItemCard(query, prefix));
        return;
    }

    const ok = pointsStore.spend(userId, item.cost);
    if (ok) item.buy(userId);
    await send(buildResultCard(userId, item, ok));
}

// ── Command ────────────────────────────────────────────────────────────────

export const buyCmd = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop')
        .addStringOption(o =>
            o.setName('item')
             .setDescription('Item ID (see ,,shop)')
             .setRequired(true)
             .addChoices(...SHOP_ITEMS.map(i => ({ name: `${i.emoji} ${i.label}`, value: i.id }))),
        ),
    prefix: 'buy',

    async execute(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString('item');
        await runBuy(interaction.user.id, query, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message, args) {
        const query = args[0] ?? null;
        await runBuy(message.author.id, query, (opts) => message.channel.send(opts), ',,');
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