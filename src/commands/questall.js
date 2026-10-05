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
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from 'discord.js';
import { QuestClient } from '../quest/questClient.js';
import { EMOJI } from '../handlers/emoji.js';
import { premiumStore, pointsStore } from '../quest/premiumStore.js';
import { QUEST_ROLE_ID, QUEST_LOG_CHANNEL_ID, isStaff, isOwner } from '../utils/config.js';
import {
    buildLinkCard,
    buildExpiredTokenCard,
    buildErrorCard,
    sep,
    txt,
    rewardText,
    trimLines,
    ACCENT,
    hasQuestRole,
} from './questCommands.js';

const E = EMOJI;

// ── Giphy banner fetcher ───────────────────────────────────────────────────
const GIPHY_API_KEY = 'j5gtWLw0xy3Zp4RJqbxWuirz2WyPv0Ba';
const GIPHY_TERMS   = ['anime', 'Alya sometimes hides her feelings', 'honkai star rail', 'Roblox'];
let   cachedBannerUrl = null;

async function fetchGiphyBanner() {
    try {
        const term   = GIPHY_TERMS[Math.floor(Math.random() * GIPHY_TERMS.length)];
        const offset = Math.floor(Math.random() * 25);
        const url    = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=1&offset=${offset}&rating=pg-13`;
        const res    = await fetch(url);
        if (!res.ok) return null;
        const json   = await res.json();
        const gif    = json?.data?.[0];
        return gif?.images?.downsized?.url ?? gif?.images?.original?.url ?? null;
    } catch {
        return null;
    }
}

// ── Permission / points guard cards ───────────────────────────────────────

const QUESTALL_COST = 5;

function buildNoPremiumCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Premium Required\n` +
        `-# \`!questall\` is for premium users only\n` +
        `-# ask an admin for premium access`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildNotEnoughPointsCard(have) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Not Enough Points\n` +
        `-# \`!questall\` costs **${QUESTALL_COST} pts**  ·  you have **${have} pts**\n` +
        `-# invite members to earn more  ·  check \`!shop\``,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Already-running guard ──────────────────────────────────────────────────
const activeQuestalls = new Set();

// ── Per-quest page cache ───────────────────────────────────────────────────
export const perQuestCache = new Map();

// ── Constants ──────────────────────────────────────────────────────────────
const TEXT_LIMIT   = 3800;
const PQ_PAGE_SIZE = 5;

// ── Progress bar ───────────────────────────────────────────────────────────
function pqBar(pct, len = 8) {
    const f = Math.round((Math.min(100, Math.max(0, pct)) / 100) * len);
    return '`' + '█'.repeat(f) + '░'.repeat(len - f) + '`';
}

function nowTime() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Card 1: Overview ───────────────────────────────────────────────────────

function buildQuestallCard(stats, done, bannerUrl = null) {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        done
            ? `## ✦ Questall Complete\n-# ${stats.solved} solved  ·  ${stats.failed} failed  ·  ${stats.skippedCompleted} already done`
            : `## Questall Running\n-# ${stats.solved} solved  ·  ${stats.running} running  ·  ${stats.queued} queued`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `total ${stats.total}  ·  ` +
        `enroll ${stats.enrollSuccess}✓ ${stats.enrollFail}✗  ·  ` +
        `solved ${stats.solved}  ·  failed ${stats.failed}  ·  ` +
        `skipped ${stats.skipped}`,
    ));

    if (bannerUrl) {
        c.addSeparatorComponents(sep(true));
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl),
            ),
        );
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Card 2: Per-quest Summary (paginated) ──────────────────────────────────

function buildPerQuestCard(perQuest, userId, page, done) {
    const totalPages = Math.max(1, Math.ceil(perQuest.length / PQ_PAGE_SIZE));
    const safePage   = Math.max(0, Math.min(page, totalPages - 1));
    const slice      = perQuest.slice(safePage * PQ_PAGE_SIZE, (safePage + 1) * PQ_PAGE_SIZE);

    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## Quests\n-# page ${safePage + 1} of ${totalPages}`,
    ));
    c.addSeparatorComponents(sep(true));

    if (perQuest.length === 0) {
        c.addTextDisplayComponents(txt(`-# no quests to display`));
        return { components: [c], flags: MessageFlags.IsComponentsV2 };
    }

    const lines = slice.map(q => {
        const icon =
            q.status === 'completed' ? E.tick :
            q.status === 'failed'    ? E.cross :
            q.status === 'running'   ? '…' :
            q.status === 'skipped'   ? '↪' : '○';
        const bar    = pqBar(q.pct ?? 0);
        const pctStr = q.pct != null ? `  ${q.pct}%  ${bar}` : '';
        return `${icon} **${q.name}**\n-# ${q.statusLabel ?? q.status}${pctStr}`;
    });
    c.addTextDisplayComponents(txt(lines.join('\n\n')));

    if (done) {
        c.addSeparatorComponents(sep(true));
        c.addTextDisplayComponents(txt(`-# all quest workers finished  ·  ${nowTime()}`));
    }

    if (totalPages > 1) {
        c.addSeparatorComponents(sep(true));
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`pq_page:${userId}:${safePage - 1}`)
                    .setLabel('‹ back')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(safePage === 0),
                new ButtonBuilder()
                    .setCustomId(`pq_noop_${userId}`)
                    .setLabel(`${safePage + 1}  /  ${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`pq_page:${userId}:${safePage + 1}`)
                    .setLabel('next ›')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(safePage >= totalPages - 1),
            ),
        );
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Card 3: Live Logs ──────────────────────────────────────────────────────

function buildQuestallLogCard(logLines, currentQuest = null) {
    const c = new ContainerBuilder();

    const header = currentQuest
        ? `## 📜 Logs  ·  ${currentQuest}\n-# updating live`
        : `## 📜 Logs\n-# updating live`;
    c.addTextDisplayComponents(txt(header));
    c.addSeparatorComponents(sep(true));

    const tail = trimLines(logLines, TEXT_LIMIT - 8);
    c.addTextDisplayComponents(txt(
        '```\n' + (tail.length ? tail.join('\n') : 'starting…') + '\n```',
    ));

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`-# ♡  ${nowTime()}`));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Progress reader ────────────────────────────────────────────────────────

function readQuestProgress(quest, taskEntries) {
    const userProg = quest.userStatus?.progress ?? {};
    let totalCur = 0, totalTar = 0;
    for (const [key, task] of taskEntries) {
        const eventKey = task.event_name ?? task.type ?? key;
        totalCur += Number(userProg[eventKey]?.value ?? userProg[key]?.value ?? 0);
        totalTar += Number(task.target ?? 0);
    }
    return { cur: totalCur, tar: totalTar };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runQuestall(userId, tokenStore, send, member = null, client = null) {
    // ── Role guard ─────────────────────────────────────────────────────────
    // Bypass: the owner, admins, users with the role, OR users who have enough pts
    const isStaffUser = isStaff(member);
    const pts       = pointsStore.get(userId);
    const hasBought = pts >= QUESTALL_COST;

    if (!isStaffUser && !isOwner(userId) && !hasQuestRole(member) && !hasBought) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(txt(
            `## Access Restricted\n` +
            `You need the <@&${QUEST_ROLE_ID}> role **or** at least **${QUESTALL_COST} pts** from the shop to use \`!questall\`.\n` +
            `-# Buy points via invites then spend them with \`!buy questall\``,
        ));
        await send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return false;
    }

    // ── Premium + points gate ──────────────────────────────────────────────
    if (!isStaffUser && !isOwner(userId) && !premiumStore.has(userId)) {
        await send(buildNoPremiumCard());
        return false;
    }
    if (!isStaffUser && !isOwner(userId) && pts < QUESTALL_COST) {
        await send(buildNotEnoughPointsCard(pts));
        return false;
    }
    // Deduct points (staff/owner don't pay)
    if (!isStaffUser && !isOwner(userId)) pointsStore.spend(userId, QUESTALL_COST);

    if (activeQuestalls.has(userId)) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(txt(`**Questall already running**\n-# wait for the current session to finish`));
        await send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return false;
    }
    activeQuestalls.add(userId);
    try {
        return await _runQuestallInner(userId, tokenStore, send);
    } finally {
        activeQuestalls.delete(userId);
    }
}

async function _runQuestallInner(userId, tokenStore, send) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkCard(false)); return false; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const all     = manager.list();
        const valid   = manager.filterQuestsValid();

        const stats = {
            total:              all.length,
            enrollSuccess:      0,
            enrollFail:         0,
            queued:             valid.length,
            running:            0,
            solved:             0,
            failed:             0,
            skipped:            all.filter(q => q.isCompleted() || q.isExpired()).length,
            skippedCompleted:   all.filter(q => q.isCompleted()).length,
            skippedUnsupported: 0,
        };

        const perQuest = all.map(q => ({
            name:        q.config.messages.quest_name,
            status:      q.isCompleted() ? 'completed' : q.isExpired() ? 'skipped' : 'queued',
            statusLabel: q.isCompleted() ? 'Completed' : q.isExpired() ? 'Expired' : 'Queued',
            pct:         q.isCompleted() ? 100 : 0,
        }));

        perQuestCache.set(userId, { perQuest, done: false });

        // Fetch a random Giphy banner once for this session
        const bannerUrl = await fetchGiphyBanner();

        const overviewMsg  = await send(buildQuestallCard(stats, false, bannerUrl));
        const perQuestMsg  = await send(buildPerQuestCard(perQuest, userId, 0, false));

        for (const quest of valid) {
            const questName   = quest.config.messages.quest_name;
            const pqEntry     = perQuest.find(p => p.name === questName);
            const taskCfg     = quest.config.task_config?.tasks ?? quest.config.task_config_v2?.tasks ?? {};
            const taskEntries = Object.entries(taskCfg);

            if (pqEntry) { pqEntry.status = 'running'; pqEntry.statusLabel = 'Running'; pqEntry.pct = 0; }
            stats.running++;
            stats.queued = Math.max(0, stats.queued - 1);

            await overviewMsg.edit(buildQuestallCard(stats, false, bannerUrl)).catch(() => {});
            await perQuestMsg.edit(buildPerQuestCard(perQuest, userId, 0, false)).catch(() => {});

            const log = (m) => {
                console.log(m);
                void (async () => {
                    const progressMatch = /(\d+)\s*\/\s*(\d+)/.exec(m);
                    const spoofMatch    = /About\s+(\d+)\s+more\s+minute/.exec(m);
                    const isCompleted   = /completed/i.test(m) && !/fail|error/i.test(m);
                    const isSpoofed     = /spoofed/i.test(m);

                    if (progressMatch) {
                        const cur = Number(progressMatch[1]);
                        const tar = Number(progressMatch[2]);
                        const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
                        if (pqEntry) pqEntry.pct = pct;
                        await perQuestMsg.edit(buildPerQuestCard(perQuest, userId, 0, false)).catch(() => {});
                    } else if (isSpoofed && spoofMatch) {
                        const { cur, tar } = readQuestProgress(quest, taskEntries);
                        const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
                        if (pqEntry) pqEntry.pct = pct;
                        await perQuestMsg.edit(buildPerQuestCard(perQuest, userId, 0, false)).catch(() => {});
                    } else if (isCompleted) {
                        if (pqEntry) pqEntry.pct = 100;
                        await perQuestMsg.edit(buildPerQuestCard(perQuest, userId, 0, false)).catch(() => {});
                    }
                })();
            };

            const success = await manager.doingQuest(quest, log);
            stats.running = Math.max(0, stats.running - 1);

            if (!success) {
                stats.failed++;
                if (pqEntry) { pqEntry.status = 'failed'; pqEntry.statusLabel = 'Failed'; }
            } else {
                await manager.claimRewards((m) => console.log(m)).catch(() => 0);
                stats.solved++;
                stats.enrollSuccess++;
                if (pqEntry) { pqEntry.status = 'completed'; pqEntry.statusLabel = 'Completed'; pqEntry.pct = 100; }
            }

            await overviewMsg.edit(buildQuestallCard(stats, false, bannerUrl)).catch(() => {});
            await perQuestMsg.edit(buildPerQuestCard(perQuest, userId, 0, false)).catch(() => {});
        }

        perQuestCache.set(userId, { perQuest, done: true });
        await overviewMsg.edit(buildQuestallCard(stats, true, bannerUrl)).catch(() => {});
        await perQuestMsg.edit(buildPerQuestCard(perQuest, userId, 0, true)).catch(() => {});

        // ── Post completion to log channel ────────────────────────────────
        if (QUEST_LOG_CHANNEL_ID && client) {
            try {
                const logCh = await client.channels.fetch(QUEST_LOG_CHANNEL_ID).catch(() => null);
                if (logCh) {
                    const logCard = new ContainerBuilder();
                    logCard.addTextDisplayComponents(txt(
                        `<@${userId}> your quests have been completed (${stats.solved} solved)`,
                    ));
                    await logCh.send({ components: [logCard], flags: MessageFlags.IsComponentsV2 });
                }
            } catch (err) {
                console.error('[questall] Failed to post to log channel:', err);
            }
        }

        return stats.solved > 0;

    } catch (err) {
        const msg = err?.message ?? String(err);
        if (msg.includes('401') && tokenStore.has(userId)) {
            tokenStore.remove(userId);
            await send(buildExpiredTokenCard()).catch(() => {});
        } else {
            await send(buildErrorCard(err)).catch(() => {});
        }
        return false;
    }
}

// ── Per-quest page button handler ──────────────────────────────────────────

export async function handlePerQuestPageButton(interaction) {
    const parts  = interaction.customId.split(':');
    const userId = parts[1];
    const page   = parseInt(parts[2], 10);

    if (interaction.user.id !== userId) {
        await interaction.reply({ content: 'Only the person who ran this command can turn pages.', flags: MessageFlags.Ephemeral });
        return;
    }

    const cached = perQuestCache.get(userId);
    if (!cached) {
        await interaction.reply({ content: 'Session expired. Run `questall` again.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.update(buildPerQuestCard(cached.perQuest, userId, page, cached.done));
}

// ── Command ────────────────────────────────────────────────────────────────

export const questallCmd = {
    data: new SlashCommandBuilder().setName('questall').setDescription('Run all available quests in one session'),
    prefix: 'questall',
    async execute(interaction, client) {
        await interaction.deferUpdate().catch(() => {});
        await runQuestall(interaction.user.id, client.tokenStore, (opts) => interaction.channel.send(opts), interaction.member, client);
    },
    async prefixExecute(message, _args, client) {
        await runQuestall(message.author.id, client.tokenStore, (opts) => message.channel.send(opts), message.member, client);
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