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
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from 'discord.js';
import { QuestClient } from '../quest/questClient.js';
import { PREFIX } from '../utils/config.js';
import { EMOJI } from '../handlers/emoji.js';
import {
    buildLinkCard,
    buildExpiredTokenCard,
    buildErrorCard,
    sep,
    txt,
    footerRow,
    rewardText,
} from './questCommands.js';

const E = EMOJI;

// ── Questlist pagination ───────────────────────────────────────────────────
const PAGE_SIZE = 3;

// In-memory cache: userId → { quests, accountName }
// Populated by runQuestList; read by handleQuestListPageButton.
const questListCache = new Map();

// ── Quest List banner ──────────────────────────────────────────────────────
const QUESTLIST_BANNER = 'https://media.giphy.com/media/d2rYOn0ee3W3SYvCTu/giphy.gif';

// ── Quest List card (paginated) ────────────────────────────────────────────

/**
 * Build one page of the quest list.
 *
 * @param {Quest[]} allQuests   - Full list for this user (sourced from cache).
 * @param {string}  accountName - Display name for the header.
 * @param {string}  userId      - Embedded in button customIds for routing.
 * @param {number}  page        - 0-based current page index.
 */
function buildQuestListCard(allQuests, accountName, userId, page = 0) {
    const totalPages = Math.max(1, Math.ceil(allQuests.length / PAGE_SIZE));
    const safePage   = Math.max(0, Math.min(page, totalPages - 1));
    const slice      = allQuests.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

    const available  = allQuests.filter(q => !q.isCompleted() && !q.isExpired()).length;
    const completed  = allQuests.filter(q => q.isCompleted()).length;

    const c = new ContainerBuilder();

    // ── Header ─────────────────────────────────────────────────────────────
    c.addTextDisplayComponents(txt(
        `## ♡ ${allQuests.length} Quest${allQuests.length !== 1 ? 's' : ''} Available\n` +
        `-# ${accountName ? `${accountName}  ·  ` : ''}` +
        `${available} available  ·  ${completed} completed`,
    ));

    // ── Banner GIF ─────────────────────────────────────────────────────────
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(QUESTLIST_BANNER),
        ),
    );
    c.addSeparatorComponents(sep(true));

    // ── Quest entries ──────────────────────────────────────────────────────
    if (allQuests.length === 0) {
        c.addTextDisplayComponents(txt(
            `${E.cross} no quests found\n-# all quests may already be completed or expired`,
        ));
    } else {
        const lines = slice.map((quest, i) => {
            const cfg       = quest.config;
            const globalIdx = safePage * PAGE_SIZE + i + 1;
            const exp       = new Date(cfg.expires_at).getTime();
            const diffDays  = Math.max(0, Math.ceil((exp - Date.now()) / 86_400_000));

            let expiryLabel;
            if (quest.isExpired())   expiryLabel = 'Expired';
            else if (diffDays === 0) expiryLabel = 'Expires today';
            else if (diffDays === 1) expiryLabel = 'Expires in 1 day';
            else                     expiryLabel = `Expires in ${diffDays} days`;

            const questTitle = cfg.messages.quest_name;
            const appName    = cfg.application?.name ?? questTitle;
            const reward     = rewardText(cfg.rewards_config.rewards);

            let icon;
            if (quest.isCompleted())    icon = E.tick;
            else if (quest.isExpired()) icon = E.cross;
            else                        icon = '✦';

            return (
                `${globalIdx}. ${icon} **${questTitle}**\n` +
                `-# *${appName}*  ·  ${expiryLabel}  ·  ${reward}`
            );
        });

        c.addTextDisplayComponents(txt(lines.join('\n\n')));
        c.addSeparatorComponents(sep());
        c.addTextDisplayComponents(txt(`-# *use \`${PREFIX}quest\` to start completing quests ♡*`));
    }

    // ── Pagination row ─────────────────────────────────────────────────────
    if (totalPages > 1) {
        c.addSeparatorComponents(sep(true));

        const backBtn = new ButtonBuilder()
            .setCustomId(`ql_page:${userId}:${safePage - 1}`)
            .setLabel('‹ back')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(safePage === 0);

        const pageLabel = new ButtonBuilder()
            .setCustomId(`ql_noop_label_${userId}`)
            .setLabel(`${safePage + 1}  /  ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        const nextBtn = new ButtonBuilder()
            .setCustomId(`ql_page:${userId}:${safePage + 1}`)
            .setLabel('next ›')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(safePage >= totalPages - 1);

        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(backBtn, pageLabel, nextBtn),
        );
    }

    footerRow(c);
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runQuestList(userId, tokenStore, send) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkCard(false)); return; }

    const qc = new QuestClient(token);
    try {
        let accountName = '';
        try {
            const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
            if (res.ok) { const d = await res.json(); accountName = d.global_name || d.username || ''; }
        } catch {}

        const manager   = await qc.fetchQuests();
        const allQuests = manager.list();

        // Cache for pagination button handler
        questListCache.set(userId, { quests: allQuests, accountName });

        await send(buildQuestListCard(allQuests, accountName, userId, 0));

    } catch (err) {
        const msg = err?.message ?? String(err);
        if (msg.includes('401') && tokenStore.has(userId)) {
            tokenStore.remove(userId);
            await send(buildExpiredTokenCard()).catch(() => {});
        } else {
            await send(buildErrorCard(err)).catch(() => {});
        }
    }
}

// ── Command ────────────────────────────────────────────────────────────────

export const questListCmd = {
    data: new SlashCommandBuilder().setName('questlist').setDescription('View all your quests and their status'),
    prefix: 'questlist',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runQuestList(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestList(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

// ── Button Handler ─────────────────────────────────────────────────────────

/**
 * Handle ‹ Back / Next › button presses on the quest list.
 * customId format: `ql_page:{userId}:{page}`
 */
export async function handleQuestListPageButton(interaction) {
    const parts  = interaction.customId.split(':');
    const userId = parts[1];
    const page   = parseInt(parts[2], 10);

    // Only the user who ran the command may page through it
    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: `${E.cross} Only the person who ran this command can turn pages.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const cached = questListCache.get(userId);
    if (!cached) {
        await interaction.reply({
            content: `${E.cross} Session expired. Run \`${PREFIX}questlist\` again.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const { quests, accountName } = cached;
    const card = buildQuestListCard(quests, accountName, userId, page);

    await interaction.update(card);
}
// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
