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
import { sep, txt } from './questCommands.js';
import { PREFIX } from '../utils/config.js';

// ── Shop items ─────────────────────────────────────────────────────────────
// Add / edit items here freely. `id` is what the user types in ,,buy <id>.

export const SHOP_ITEMS = [
    {
        id:    'quest',
        label: 'Quest Session',
        desc:  `Run one \`${PREFIX}quest\` session`,
        cost:  1,
        emoji: '🎮',
        buy(_userId) { return true; },
    },
    {
        id:    'questall',
        label: 'Questall Session',
        desc:  `Run one \`${PREFIX}questall\` (all quests)`,
        cost:  5,
        emoji: '⚡',
        buy(_userId) { return true; },
    },
];

// ── Card builder ───────────────────────────────────────────────────────────

function buildShopCard(userId) {
    const pts = pointsStore.get(userId);
    const c   = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        `## 🛒 Shop\n` +
        `-# your balance: **${pts} pt${pts !== 1 ? 's' : ''}**  ·  earn more by inviting members`,
    ));
    c.addSeparatorComponents(sep(true));

    for (const item of SHOP_ITEMS) {
        const canAfford = pts >= item.cost;
        c.addTextDisplayComponents(txt(
            `${item.emoji} **${item.label}**  ·  ${item.cost} pt${item.cost !== 1 ? 's' : ''}\n` +
            `-# ${item.desc}\n` +
            `-# use \`${PREFIX}buy ${item.id}\` to purchase${canAfford ? '' : '  ·  ⚠️ insufficient points'}`,
        ));
        c.addSeparatorComponents(sep(true));
    }

    c.addTextDisplayComponents(txt(
        `-# invite a member → earn **1 pt** per invite`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runShop(userId, send) {
    await send(buildShopCard(userId));
}

// ── Command ────────────────────────────────────────────────────────────────

export const shopCmd = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse items available for purchase with your points'),
    prefix: 'shop',

    async execute(interaction) {
        await interaction.deferReply();
        await runShop(interaction.user.id, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message) {
        await runShop(message.author.id, (opts) => message.channel.send(opts));
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