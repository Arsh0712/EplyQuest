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
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';
import { QuestClient } from '../quest/questClient.js';
import { TokenStore } from '../quest/tokenStore.js';
import { PREFIX, QUEST_ROLE_ID, QUEST_LOG_CHANNEL_ID } from '../utils/config.js';
import { EMOJI } from '../handlers/emoji.js';
import { pointsStore } from '../quest/premiumStore.js';
import { PermissionFlagsBits } from 'discord.js';

// ── Emoji shorthand ────────────────────────────────────────────────────────
const E = EMOJI;

// ── TokenStore factory ─────────────────────────────────────────────────────
export function makeTokenStore(secret) {
    return new TokenStore(secret);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sanitizeToken(raw) {
    return raw.trim()
        .replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
        .replace(/^`+|`+$/g, '')
        .replace(/^Bot\s+/i, '')
        .trim();
}

function isValidUserToken(token) {
    return token.length >= 50 && /^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(token);
}

export function rewardText(rewards) {
    return rewards.map(r => {
        if (r.orb_quantity) return `${r.orb_quantity} ${E.orbs}`;
        if (r.quantity)     return `${r.quantity}d Nitro`;
        return r.messages?.name ?? 'Reward';
    }).join(', ');
}

function nowTime() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Accent palette ─────────────────────────────────────────────────────────
export const ACCENT = {
    rose:     0xE8A4B8,
    lavender: 0xB8A4E8,
    mint:     0x98E8C1,
    amber:    0xE8D4A4,
    coral:    0xE88A8A,
    slate:    0x8A9BB8,
};

// ── Shared footer ──────────────────────────────────────────────────────────
const FOOTER = () => `-# ✦ Eply Quest  ·  autoquest  ·  ${nowTime()}`;

// ── Text-limit helpers ─────────────────────────────────────────────────────
const TEXT_LIMIT = 3800;

export function trimLines(lines, budget) {
    let total = 0;
    const kept = [];
    for (let i = lines.length - 1; i >= 0; i--) {
        const cost = lines[i].length + 1;
        if (total + cost > budget) break;
        kept.unshift(lines[i]);
        total += cost;
    }
    return kept;
}

// ── Progress bar ───────────────────────────────────────────────────────────
function buildProgressBar(pct, len = 15) {
    const filled = Math.round((pct / 100) * len);
    return '█'.repeat(filled) + '░'.repeat(len - filled);
}

function buildTaskBar(cur, tar, len = 12) {
    const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
    const filled = Math.round((pct / 100) * len);
    return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
}

// ── CDN helper ─────────────────────────────────────────────────────────────
function cdnQuestAsset(appId, name) {
    if (!appId || !name) return null;
    return `https://cdn.discordapp.com/app-assets/${appId}/quest-assets/${name}.png`;
}

// ── Time ago helper ────────────────────────────────────────────────────────
function timeAgo(iso) {
    if (!iso) return null;
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5)    return 'just now';
    if (diff < 60)   return `${diff} seconds ago`;
    if (diff < 120)  return 'a minute ago';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 7200) return 'an hour ago';
    return `${Math.floor(diff / 3600)} hours ago`;
}

// ── Days left helper ───────────────────────────────────────────────────────
function daysLeft(iso) {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ── Modal ──────────────────────────────────────────────────────────────────

function buildLinkModal() {
    return new ModalBuilder()
        .setCustomId('link_token_modal')
        .setTitle('Link Your Discord Token')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('link_token_input')
                    .setLabel('Your Discord user token')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Paste your token here...')
                    .setRequired(true),
            ),
        );
}

// ── Reusable card helpers ──────────────────────────────────────────────────

export function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}

export function txt(content) {
    return new TextDisplayBuilder().setContent(content);
}

export function footerRow(c) {
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(FOOTER()));
}

// ── UI Cards ───────────────────────────────────────────────────────────────

// ── Account Panel ──────────────────────────────────────────────────────────

export function buildAccountPanel(meta = null) {
    const c = new ContainerBuilder();

    if (meta) {
        const discordEpoch = 1420070400000n;
        let accountAge = 'N/A';
        try {
            const snowflake = BigInt(meta.accountUserId);
            const createdMs = Number((snowflake >> 22n) + discordEpoch);
            const years     = (Date.now() - createdMs) / (1000 * 60 * 60 * 24 * 365.25);
            accountAge      = years >= 1
                ? `${Math.floor(years)} yr${Math.floor(years) !== 1 ? 's' : ''} old`
                : `${Math.floor(years * 12)} mo old`;
        } catch {}

        let linkedAt = 'N/A';
        try {
            linkedAt = new Date(meta.linkedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
            });
        } catch {}

        const name = meta.username ?? 'Unknown';
        const uid  = meta.accountUserId ?? '—';

        const infoSection = new SectionBuilder().addTextDisplayComponents(txt(
            `## ${name}\n` +
            `-# ${uid}  ·  ${accountAge}  ·  linked ${linkedAt}`,
        ));

        if (meta.avatarUrl) {
            infoSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(meta.avatarUrl));
        }

        c.addSectionComponents(infoSection);
        c.addSeparatorComponents(sep(true));
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('link_prompt')
                    .setLabel('Update Token')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('unlink_account')
                    .setLabel('Unlink')
                    .setStyle(ButtonStyle.Danger),
            ),
        );
        c.addSeparatorComponents(sep());
        c.addTextDisplayComponents(txt(`-# ♡ encrypted at rest`));
    } else {
        c.addTextDisplayComponents(txt(
            `## Account\n` +
            `-# no token linked`,
        ));
        c.addSeparatorComponents(sep(true));
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('link_prompt')
                    .setLabel('Enter Token')
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Confirm Account Lock card ──────────────────────────────────────────────
// Shown after token is verified — user must confirm before saving.

export function buildConfirmLockCard(meta) {
    const username  = meta.username ?? 'Unknown';
    const userId    = meta.accountUserId ?? '—';
    const avatarUrl = meta.avatarUrl ?? null;
    const c = new ContainerBuilder();

    if (avatarUrl) {
        const section = new SectionBuilder().addTextDisplayComponents(txt(
            `## ${username}\n` +
            `-# ${userId}\n\n` +
            `Confirm to link this token to your account.`,
        ));
        section.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
        c.addSectionComponents(section);
    } else {
        c.addTextDisplayComponents(txt(
            `## ${username}\n` +
            `-# ${userId}\n\n` +
            `Confirm to link this token to your account.`,
        ));
    }

    c.addSeparatorComponents(sep(true));
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('link_confirm_lock')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('link_cancel_lock')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        ),
    );
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(`-# ♡ encrypted at rest`));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Account Locked success card ────────────────────────────────────────────

export function buildAccountLockedCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✦ Token Linked\n` +
        `-# use \`${PREFIX}quest\` to start`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildLinkCard(hasToken = false) {
    // Card 1: Status header
    const header = new ContainerBuilder();
    header.addTextDisplayComponents(txt(
        `-# autoquest  ·  session \`16mins\`  ·  \`${PREFIX}status\` to check progress`,
    ));

    if (hasToken) {
        header.addSeparatorComponents(sep(true));
        header.addTextDisplayComponents(txt(
            `## ✦ Ready to Farm\n` +
            `-# token linked — click start to begin`,
        ));
        header.addSeparatorComponents(sep());
        header.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('quest_start_session')
                    .setLabel('Start Session')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('link_prompt')
                    .setLabel('Update Token')
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
        header.addSeparatorComponents(sep());
        header.addTextDisplayComponents(txt(`-# ♡ encrypted at rest`));
    }

    // Card 2: Account Not Connected (no-token only)
    const accountCard = new ContainerBuilder();
    if (!hasToken) {
        accountCard.addTextDisplayComponents(txt(`**Account Not Connected**`));
        accountCard.addSeparatorComponents(sep(true));
        accountCard.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL('https://media3.giphy.com/media/v1.Y2lkPWFkYTY4OWU2YnJ6YWppN2Zyd2E0bWVoanN4c3N4dzlrOHdqZmk4b3kyemRjNnZzMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hn67aDZndq72SnmXmP/giphy-downsized.gif'),
            ),
        );
        accountCard.addSeparatorComponents(sep());
        accountCard.addTextDisplayComponents(txt(`Link your token below to get started.`));
        accountCard.addSeparatorComponents(sep(true));
        accountCard.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('link_prompt')
                    .setLabel('Enter Token')
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    // Card 3: How to Find Your Token
    const tokenGuideCard = new ContainerBuilder();
    tokenGuideCard.addTextDisplayComponents(txt(
        `**HOW TO FIND YOUR TOKEN**\n` +
        `-# pick your platform below`,
    ));
    tokenGuideCard.addSeparatorComponents(sep(true));
    tokenGuideCard.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('token_guide_pc').setLabel('ꕥ/ PC').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('token_guide_android').setLabel('ϙ° Android').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('token_guide_ios').setLabel('.✦+ iOS').setStyle(ButtonStyle.Secondary),
        ),
    );

    const components = hasToken
        ? [header, tokenGuideCard]
        : [header, accountCard, tokenGuideCard];

    return { components, flags: MessageFlags.IsComponentsV2 };
}

export function buildNoQuestsCard(accountName = '') {
    const c = new ContainerBuilder().setAccentColor(ACCENT.slate);
    c.addTextDisplayComponents(txt(`## No Quests Available`));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        (accountName ? `**${accountName}** has ` : '') +
        `no active quests right now.\n-# check back later or try a different account`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildExpiredTokenCard() {
    const c = new ContainerBuilder().setAccentColor(ACCENT.coral);
    c.addTextDisplayComponents(txt(`## Token Expired`));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `Your token was rejected by Discord and has been removed.\n` +
        `-# re-link with \`${PREFIX}link\``,
    ));
    c.addSeparatorComponents(sep(true));
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('link_prompt')
                .setLabel('Re-link Token')
                .setStyle(ButtonStyle.Secondary),
        ),
    );
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildErrorCard(err) {
    const msg   = err?.message ?? String(err);
    const is401 = msg.includes('401');
    const c     = new ContainerBuilder().setAccentColor(ACCENT.coral);
    c.addTextDisplayComponents(txt(
        is401
            ? `## Invalid Token\n\nThis token was rejected. Re-link with \`${PREFIX}link\`.`
            : `## Error\n\n${msg.slice(0, 800)}`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildStatusCard(quests, thumbUrl) {
    const active    = quests.filter(q => !q.isCompleted() && !q.isExpired());
    const completed = quests.filter(q => q.isCompleted()).length;
    const total     = active.length + completed;
    const bar       = buildProgressBar(total > 0 ? Math.round((completed / total) * 100) : 0);

    const c = new ContainerBuilder().setAccentColor(ACCENT.lavender);

    const header = new SectionBuilder().addTextDisplayComponents(txt(
        `## Quest Status\n` +
        `♡ **${completed}** / **${total}** complete\n` +
        `-# \`${bar}\``,
    ));
    if (thumbUrl) header.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl));
    c.addSectionComponents(header);
    c.addSeparatorComponents(sep(true));

    if (active.length === 0) {
        c.addTextDisplayComponents(txt(
            `no active quests\n-# all done or expired`,
        ));
    } else {
        for (const quest of active) {
            const reward    = rewardText(quest.config.rewards_config.rewards);
            const isRunning = quest.isEnrolledQuest();
            const taskCfg   = quest.config.task_config?.tasks ?? quest.config.task_config_v2?.tasks ?? {};
            const firstTask = Object.values(taskCfg)[0] ?? {};
            const eventKey  = firstTask.event_name ?? firstTask.type ?? Object.keys(taskCfg)[0] ?? '';
            const cur       = Number(quest.userStatus?.progress?.[eventKey]?.value ?? 0);
            const tar       = Number(firstTask.target ?? 0);
            const pct       = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;

            c.addTextDisplayComponents(txt(
                `**${quest.config.messages.quest_name}**\n` +
                `-# ${reward}  ·  ${pct}%  ·  ${buildTaskBar(cur, tar)}`,
            ));
            c.addSeparatorComponents(sep());
            c.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`status_noop_${quest.id}`)
                        .setLabel(isRunning ? '♡ running' : '♡ available')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                ),
            );
            c.addSeparatorComponents(sep());
        }
    }

    footerRow(c);
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── CARD 1: Premium Quest Selector ────────────────────────────────────────
// Crown header, 💎 Available Quests section, numbered quest entries with status

export function buildPremiumQuestSelectorCard(quests) {
    const available = quests.filter(q => !q.isCompleted() && !q.isExpired());
    const c = new ContainerBuilder().setAccentColor(ACCENT.rose);

    c.addTextDisplayComponents(txt(
        `## Quests\n` +
        `-# ${available.length} available  ·  pick one below`,
    ));
    c.addSeparatorComponents(sep(true));

    for (const q of available) {
        const name      = q.config.messages?.quest_name ?? '—';
        const game      = q.config.messages?.game_name ?? q.config.application?.name ?? '';
        const taskCfg   = q.config.task_config?.tasks ?? q.config.task_config_v2?.tasks ?? {};
        const firstTask = Object.values(taskCfg)[0] ?? {};
        const firstKey  = Object.keys(taskCfg)[0] ?? '';
        const platform  = firstKey.includes('MOBILE') ? 'mobile' : 'desktop';
        const tar       = Number(firstTask.target ?? 0);
        const cur       = Number(q.userStatus?.progress?.[firstKey]?.value ?? 0);
        const pct       = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
        const dl        = daysLeft(q.config.expires_at);
        const reward    = rewardText(q.config.rewards_config?.rewards ?? []);

        c.addTextDisplayComponents(txt(
            `**${name}**\n` +
            `-# ${game}  ·  ${reward}  ·  ${platform}  ·  ${pct}%` +
            (dl != null ? `  ·  ${dl}d left` : ''),
        ));
        c.addSeparatorComponents(sep());
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── CARD 2: Control Bar (dropdown picker) ──────────────────────────────────
// Separate card so select menu is interactive

export function buildControlBarCard(quests, selectedId = null) {
    const available = quests.filter(q => !q.isCompleted() && !q.isExpired());
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(`**Select a quest to begin**\n-# fast mode available after opening`));
    c.addSeparatorComponents(sep());

    if (available.length > 0) {
        const options = available.slice(0, 25).map(q => {
            const qName = q.config.messages?.quest_name ?? q.id;
            const gName = q.config.messages?.game_name ?? q.config.application?.name ?? '';
            const dl    = daysLeft(q.config.expires_at);
            const reward = rewardText(q.config.rewards_config?.rewards ?? []);
            const opt   = new StringSelectMenuOptionBuilder()
                .setLabel(qName.slice(0, 100))
                .setValue(q.id)
                .setDefault(q.id === selectedId);
            const desc = [gName, reward, dl != null ? `${dl}d left` : ''].filter(Boolean).join(' · ');
            if (desc) opt.setDescription(desc.slice(0, 100));
            return opt;
        });

        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('quest_pick_select')
                    .setPlaceholder('Pick a quest...')
                    .addOptions(options),
            ),
        );
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── CARD 3: Quest Overview + Live Progress ─────────────────────────────────

export function buildQuestOverviewCard(quest, status = 'idle', mode = 'normal') {
    const cfg       = quest.config;
    const questName = cfg.messages?.quest_name ?? '—';
    const gameName  = cfg.messages?.game_name ?? cfg.application?.name ?? '—';

    const taskCfg     = cfg.task_config?.tasks ?? cfg.task_config_v2?.tasks ?? {};
    const taskEntries = Object.entries(taskCfg);
    const firstKey    = taskEntries[0]?.[0] ?? '';
    const firstTask   = taskEntries[0]?.[1] ?? {};

    const userProg  = quest.userStatus?.progress ?? {};
    const eventKey  = firstTask.event_name ?? firstTask.type ?? firstKey;
    const cur       = Number(userProg[eventKey]?.value ?? userProg[firstKey]?.value ?? 0);
    const tar       = Number(firstTask.target ?? 0);
    const pct       = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;

    const rewards   = cfg.rewards_config?.rewards ?? [];
    const rewardStr = rewardText(rewards);
    const dl        = daysLeft(cfg.expires_at);
    const expiryStr = dl != null ? `${dl}d left` : '—';

    const isRunning = status === 'running';
    const isDone    = status === 'done' || quest.isCompleted();
    const isFailed  = status === 'failed';

    // Quest page / video URLs from config
    const questUrl  = cfg.messages?.quest_link ?? cfg.quest_link ?? null;
    const videoUrl  = cfg.messages?.video_link ?? cfg.video_link ?? null;

    const c = new ContainerBuilder();

    // Row 0: game name as a disabled label button (matches screenshot top pill)
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`qs_game_label_${quest.id}`)
                .setLabel(gameName.slice(0, 80))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        ),
    );

    c.addSeparatorComponents(sep());

    // Row 1: Completed / Refresh
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`qs_start_${quest.id}`)
                .setLabel(isDone ? 'Completed' : isRunning ? 'Running…' : 'Start')
                .setStyle(isDone ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(isRunning || isDone),
            new ButtonBuilder()
                .setCustomId(`qs_refresh_${quest.id}`)
                .setLabel('↻')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(isRunning),
        ),
    );

    // Row 2: View Quest / YouTube (link buttons if URLs available, disabled stubs if not)
    const viewBtn = questUrl
        ? new ButtonBuilder().setLabel('View Quest').setStyle(ButtonStyle.Link).setURL(questUrl)
        : new ButtonBuilder().setCustomId(`qs_view_stub_${quest.id}`).setLabel('View Quest').setStyle(ButtonStyle.Secondary).setDisabled(true);
    const videoBtn = videoUrl
        ? new ButtonBuilder().setLabel('▶').setStyle(ButtonStyle.Link).setURL(videoUrl)
        : new ButtonBuilder().setCustomId(`qs_video_stub_${quest.id}`).setLabel('▶').setStyle(ButtonStyle.Danger).setDisabled(true);

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(viewBtn, videoBtn),
    );

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `-# ${rewardStr}  ·  ${pct}% (${cur}/${tar})  ·  ${expiryStr}  ·  mode: ${mode}`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── CARD 4: Quest Art / Banner ─────────────────────────────────────────────

const PREMIUM_BANNER = 'https://media2.giphy.com/media/v1.Y2lkPWFkYTY4OWU2ZmNwMjNmN3l3M3VhbDdiZWU5cWtyZG54dmEzcXVmazA0OGp1d2IzayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vnoBLD7Qn5xFiKmMuL/giphy-downsized.gif';

export function buildQuestArtCard(quest) {
    const cfg       = quest.config;
    const questName = cfg.messages?.quest_name ?? 'Quest';
    const appId     = cfg.application?.id;
    const assets    = cfg.assets ?? {};
    const artUrl    = cdnQuestAsset(appId, assets.game_tile ?? assets.hero) ?? PREMIUM_BANNER;

    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(`-# ${questName}`));
    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(artUrl),
        ),
    );

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── CARD 5: Control Panel (buttons) ───────────────────────────────────────

export function buildControlPanelCard(quest, status = 'idle', mode = 'normal') {
    const isRunning = status === 'running';
    const isDone    = status === 'done' || quest.isCompleted();
    const c = new ContainerBuilder();

    if (isRunning) {
        // While running: only show Stop
        c.addTextDisplayComponents(txt(
            `**Running...**\n` +
            `-# Quest is in progress — press Stop to cancel`,
        ));
        c.addSeparatorComponents(sep(true));
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`qs_stop_${quest.id}`)
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger),
            ),
        );
    } else {
        // Idle / done: show full controls
        c.addTextDisplayComponents(txt(
            `**Controls**\n` +
            `-# fast keeps the solver aggressive`,
        ));
        c.addSeparatorComponents(sep(true));
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`qs_start_${quest.id}`)
                    .setLabel('Start')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(isDone),
                new ButtonBuilder()
                    .setCustomId(`qs_mode_normal_${quest.id}`)
                    .setLabel('Normal')
                    .setStyle(mode === 'normal' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`qs_mode_fast_${quest.id}`)
                    .setLabel('Fast')
                    .setStyle(mode === 'fast' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            ),
        );
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`qs_enroll_${quest.id}`)
                    .setLabel('Enroll')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(quest.isEnrolledQuest?.() || isDone),
                new ButtonBuilder()
                    .setCustomId('quest_pick_another')
                    .setLabel('Pick Another')
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── CARD 6: Live Logs ─────────────────────────────────────────────────────

export function buildPremiumLogsCard(quest, logLines, cur = 0, tar = 0) {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(`## 📜 Logs`));
    c.addSeparatorComponents(sep(true));

    // Build display lines: prefer structured Progress lines, fall back to raw log
    let displayLines;
    if (tar > 0) {
        // Always show last few raw log entries with the canonical progress line appended
        const rawTail = trimLines(logLines, TEXT_LIMIT - 120);
        displayLines  = [...rawTail, `Progress: ${cur}/${tar}`];
    } else {
        displayLines = trimLines(logLines, TEXT_LIMIT - 8);
    }

    c.addTextDisplayComponents(txt(
        '```\n' + (displayLines.length ? displayLines.join('\n') : 'starting…') + '\n```',
    ));

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`-# ♡  ${nowTime()}`));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Role guard ─────────────────────────────────────────────────────────────

function buildNoRoleCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## Access Restricted\n` +
        `You need the <@&${QUEST_ROLE_ID}> role to use quest commands.\n` +
        `-# Contact a staff member to get access.`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function hasQuestRole(member) {
    if (!QUEST_ROLE_ID) return true; // no role configured — allow all
    return member?.roles?.cache?.has(QUEST_ROLE_ID) ?? false;
}



const QUEST_LIST_BANNER = 'https://media.giphy.com/media/d2rYOn0ee3W3SYvCTu/giphy.gif';

export function buildQuestListCard(quests) {
    const available = quests.filter(q => !q.isCompleted() && !q.isExpired());
    const count     = available.length;
    const c = new ContainerBuilder();

    const firstQuest  = available[0];
    const firstAppId  = firstQuest?.config?.application?.id;
    const firstAssets = firstQuest?.config?.assets ?? {};
    const thumbUrl    = cdnQuestAsset(firstAppId, firstAssets.game_tile ?? firstAssets.hero);

    const headerSection = new SectionBuilder().addTextDisplayComponents(txt(
        `## ${count} Quest${count !== 1 ? 's' : ''} Available
-# Choose a quest to start`,
    ));
    if (thumbUrl) headerSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl));
    c.addSectionComponents(headerSection);
    c.addSeparatorComponents(sep(true));

    c.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(QUEST_LIST_BANNER),
        ),
    );
    c.addSeparatorComponents(sep());

    const listLines = available.map((q, i) => {
        const name = q.config.messages?.quest_name ?? '—';
        const game = q.config.messages?.game_name ?? q.config.application?.name ?? '';
        const desc = q.config.messages?.quest_description ?? game;
        const dl   = daysLeft(q.config.expires_at);
        const exp  = dl != null ? `Expires in ${dl} day${dl !== 1 ? 's' : ''}` : '';
        return `**${i + 1}. 🎮 ${name}**\n*${desc}*${exp ? ` · ${exp}` : ''}`;
    });
    c.addTextDisplayComponents(txt(listLines.join('\n\n')));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildQuestPickCard(quests, selectedId = null) {
    const available = quests.filter(q => !q.isCompleted() && !q.isExpired());
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(`*Use the dropdown below to pick one.*`));
    c.addSeparatorComponents(sep());

    if (available.length > 0) {
        const options = available.slice(0, 25).map(q => {
            const qName = q.config.messages?.quest_name ?? q.id;
            const gName = q.config.messages?.game_name ?? q.config.application?.name ?? '';
            const dl    = daysLeft(q.config.expires_at);
            const opt   = new StringSelectMenuOptionBuilder()
                .setLabel(qName.slice(0, 100))
                .setValue(q.id)
                .setDefault(q.id === selectedId);
            if (gName || dl != null) {
                opt.setDescription(`${gName}${dl != null ? ` · Expires in ${dl}d` : ''}`.slice(0, 100));
            }
            return opt;
        });
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('quest_pick_select')
                    .setPlaceholder('Pick a quest...')
                    .addOptions(options),
            ),
        );
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Giphy banner fetcher ───────────────────────────────────────────────────
const GIPHY_API_KEY  = 'j5gtWLw0xy3Zp4RJqbxWuirz2WyPv0Ba';
const GIPHY_TERMS    = ['anime', 'Alya sometimes hides her feelings', 'honkai star rail', 'Roblox'];

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

// ── Quest cost ─────────────────────────────────────────────────────────────

const QUEST_COST = 1;

function buildQuestNotEnoughPointsCard(have) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## ✗ Not Enough Points\n` +
        `-# \`!quest\` costs **${QUEST_COST} pt**  ·  you have **${have} pts**\n` +
        `-# invite members to earn points  ·  check \`!shop\``,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Quest session state ────────────────────────────────────────────────────
// Tracks the active selector message per user so we can delete it after pick
export const questSelectorMessages = new Map(); // userId → { selectorMsg, quests, idx, bannerUrl }

function buildQuestSelectorCard(quests, idx, bannerUrl = null) {
    const available = quests.filter(q => !q.isCompleted() && !q.isExpired());
    const total     = available.length;
    const safeIdx   = Math.max(0, Math.min(idx, total - 1));
    const c         = new ContainerBuilder();

    if (total === 0) {
        c.addTextDisplayComponents(txt(`**No quests available**\n-# all quests are completed or expired`));
        return { components: [c], flags: MessageFlags.IsComponentsV2 };
    }

    // Banner GIF
    if (bannerUrl) {
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(bannerUrl),
            ),
        );
    }

    // Dropdown: all available quests
    const options = available.slice(0, 25).map((q, i) => {
        const qName  = q.config.messages?.quest_name ?? q.id;
        const gName  = q.config.messages?.game_name ?? q.config.application?.name ?? '';
        const dl     = daysLeft(q.config.expires_at);
        const reward = rewardText(q.config.rewards_config?.rewards ?? []);
        const opt    = new StringSelectMenuOptionBuilder()
            .setLabel(qName.slice(0, 100))
            .setValue(q.id)
            .setDefault(i === safeIdx);
        const desc   = [gName, reward, dl != null ? `${dl}d left` : ''].filter(Boolean).join(' · ');
        if (desc) opt.setDescription(desc.slice(0, 100));
        return opt;
    });

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('quest_pick_select')
                .setPlaceholder('Pick a quest…')
                .addOptions(options),
        ),
    );

    // Back / page counter / Next
    const backBtn = new ButtonBuilder()
        .setCustomId(`quest_nav:${safeIdx - 1}`)
        .setLabel('‹ back')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safeIdx === 0);

    const pageBtn = new ButtonBuilder()
        .setCustomId('quest_nav_noop')
        .setLabel(`${safeIdx + 1}  /  ${total}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const nextBtn = new ButtonBuilder()
        .setCustomId(`quest_nav:${safeIdx + 1}`)
        .setLabel('next ›')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safeIdx >= total - 1);

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(backBtn, pageBtn, nextBtn),
    );

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

async function runQuestSession(userId, tokenStore, send, member = null) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkCard(false)); return false; }

    // 1-point cost per quest session (admins are exempt)
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) ?? false;
    if (!isAdmin) {
        const pts = pointsStore.get(userId);
        if (pts < QUEST_COST) {
            await send(buildQuestNotEnoughPointsCard(pts));
            return false;
        }
        pointsStore.spend(userId, QUEST_COST);
    }

    const qc = new QuestClient(token);
    try {
        const manager   = await qc.fetchQuests();
        const valid     = manager.filterQuestsValid();

        if (valid.length === 0) {
            let accountName = '';
            try {
                const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
                if (res.ok) { const d = await res.json(); accountName = d.global_name || d.username || ''; }
            } catch {}
            await send(buildNoQuestsCard(accountName));
            return false;
        }

        // Fetch random Giphy banner for this session
        const bannerUrl   = await fetchGiphyBanner();
        const selectorMsg = await send(buildQuestSelectorCard(valid, 0, bannerUrl));
        questSelectorMessages.set(userId, { selectorMsg, quests: valid, idx: 0, bannerUrl });
        return true;

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

// ── Quest runner (after quest is selected) ────────────────────────────────

export async function runSelectedQuest(userId, questId, tokenStore, send, selectorMsg = null, client = null) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkCard(false)); return; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const quest   = manager.get(questId);
        if (!quest) { await send(buildErrorCard(new Error('Quest not found.'))); return; }

        // Extract progress target once
        const taskCfg   = quest.config.task_config?.tasks ?? quest.config.task_config_v2?.tasks ?? {};
        const firstTask = Object.values(taskCfg)[0] ?? {};
        const firstKey  = Object.keys(taskCfg)[0] ?? '';
        const eventKey  = firstTask.event_name ?? firstTask.type ?? firstKey;
        const tar       = Number(firstTask.target ?? 0);
        let   cur       = Number(quest.userStatus?.progress?.[eventKey]?.value ?? quest.userStatus?.progress?.[firstKey]?.value ?? 0);

        // Send quest overview card
        const overviewMsg = await send(buildQuestOverviewCard(quest, 'idle', 'normal'));
        // Send art card
        await send(buildQuestArtCard(quest));

        // Delete the old selector card now that the quest card is sent
        if (selectorMsg) await selectorMsg.delete().catch(() => {});

        const log = (m) => {
            console.log(m);
            const match = m.match(/(\d+)\s*\/\s*(\d+)/);
            if (match) cur = Number(match[1]);
        };

        // Switch overview to running
        await overviewMsg?.edit(buildQuestOverviewCard(quest, 'running', 'normal')).catch(() => {});

        const success = await manager.doingQuest(quest, log);

        if (!success) {
            await overviewMsg?.edit(buildQuestOverviewCard(quest, 'failed', 'normal')).catch(() => {});
            return;
        }

        await manager.claimRewards(log).catch(() => 0);
        await overviewMsg?.edit(buildQuestOverviewCard(quest, 'done', 'normal')).catch(() => {});

        // ── Post completion to log channel ────────────────────────────────
        if (QUEST_LOG_CHANNEL_ID && client) {
            try {
                const questName = quest.config.messages?.quest_name ?? 'Quest';
                const logCh = await client.channels.fetch(QUEST_LOG_CHANNEL_ID).catch(() => null);
                if (logCh) {
                    const logCard = new ContainerBuilder();
                    logCard.addTextDisplayComponents(txt(
                        `<@${userId}> your **${questName}** has been completed`,
                    ));
                    await logCh.send({ components: [logCard], flags: MessageFlags.IsComponentsV2 });
                }
            } catch (err) {
                console.error('[quest] Failed to post to log channel:', err);
            }
        }

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

async function runStatus(userId, tokenStore, send) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkCard(false)); return; }

    const qc = new QuestClient(token);
    try {
        let thumbUrl = '';
        try {
            const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
            if (res.ok) {
                const d = await res.json();
                if (d.avatar) thumbUrl = `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=128`;
            }
        } catch {}

        const manager   = await qc.fetchQuests();
        const allQuests = manager.list();
        if (allQuests.length === 0) { await send(buildNoQuestsCard()); return; }
        await send(buildStatusCard(allQuests, thumbUrl));

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

// ── Commands ───────────────────────────────────────────────────────────────

export const questCmd = {
    data: new SlashCommandBuilder().setName('quest').setDescription('Start your quest session (costs 1 pt)'),
    prefix: 'quest',
    async execute(interaction, client) {
        // No defer/reply — send directly to channel
        await interaction.deferUpdate().catch(() => {});
        await runQuestSession(interaction.user.id, client.tokenStore, (opts) => interaction.channel.send(opts), interaction.member);
    },
    async prefixExecute(message, _args, client) {
        await runQuestSession(message.author.id, client.tokenStore, (opts) => message.channel.send(opts), message.member);
    },
};

export const statusCmd = {
    data: new SlashCommandBuilder().setName('status').setDescription('Check your quest session progress'),
    prefix: 'status',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runStatus(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runStatus(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const linkCmd = {
    data: new SlashCommandBuilder().setName('link').setDescription('Link or update your Discord token'),
    prefix: 'link',

    async execute(interaction, client) {
        const ts       = client.tokenStore;
        const hasToken = ts.has(interaction.user.id);
        if (hasToken) {
            const meta = ts.getMeta(interaction.user.id);
            await interaction.reply({ ...buildAccountPanel(meta), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ ...buildAccountPanel(null), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
    },

    async prefixExecute(message, args, client) {
        const ts          = client.tokenStore;
        const inlineToken = args.join('').trim();

        if (inlineToken) {
            try { await message.delete(); } catch {}
            const token = sanitizeToken(inlineToken);

            const sendDM = async (payload) => {
                const user = await client.users.fetch(message.author.id).catch(() => null);
                const dm   = await user?.createDM().catch(() => null);
                await dm?.send(payload).catch(() => {});
            };

            if (!isValidUserToken(token)) {
                const c = new ContainerBuilder().setAccentColor(ACCENT.coral);
                c.addTextDisplayComponents(txt(`${E.cross} **invalid token format**\n\nThat doesn't look like a valid Discord token.`));
                await sendDM({ components: [c], flags: MessageFlags.IsComponentsV2 });
                return;
            }

            let accountName = '', verifyOk = false;
            try {
                const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
                verifyOk = res.ok;
                if (res.ok) { const d = await res.json(); accountName = d.global_name || d.username || ''; }
            } catch {}

            if (!verifyOk) {
                const c = new ContainerBuilder().setAccentColor(ACCENT.coral);
                c.addTextDisplayComponents(txt(`${E.cross} **token rejected**\n\nMake sure you copied the \`Authorization\` header and try again.`));
                await sendDM({ components: [c], flags: MessageFlags.IsComponentsV2 });
                return;
            }

            let avatarUrl = null, accountUserId = null;
            try {
                const res2 = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
                if (res2.ok) {
                    const d = await res2.json();
                    accountUserId = d.id;
                    if (d.avatar) avatarUrl = `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=128`;
                }
            } catch {}

            ts.save(message.author.id, token, { username: accountName, accountUserId, avatarUrl });
            await sendDM(buildAccountPanel(ts.getMeta(message.author.id)));
            return;
        }

        const hasTok = ts.has(message.author.id);
        await message.reply(buildAccountPanel(hasTok ? ts.getMeta(message.author.id) : null));
    },
};

export const unlinkCmd = {
    data: new SlashCommandBuilder().setName('unlink').setDescription('Remove your saved Discord token'),
    prefix: 'unlink',

    async execute(interaction, client) {
        const removed = client.tokenStore.remove(interaction.user.id);
        const c = new ContainerBuilder().setAccentColor(removed ? ACCENT.mint : ACCENT.slate);
        c.addTextDisplayComponents(txt(
            removed
                ? `## Token Removed\n-# your account has been unlinked`
                : `## Nothing to Unlink\n-# no token was found for your account`,
        ));
        await interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    },

    async prefixExecute(message, _args, client) {
        const removed = client.tokenStore.remove(message.author.id);
        const c = new ContainerBuilder().setAccentColor(removed ? ACCENT.mint : ACCENT.slate);
        c.addTextDisplayComponents(txt(
            removed
                ? `## Token Removed\n-# your account has been unlinked`
                : `## Nothing to Unlink\n-# no token was found for your account`,
        ));
        await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    },
};

// ── Modal Handler ──────────────────────────────────────────────────────────

export async function handleLinkModal(interaction, client) {
    const ts    = client.tokenStore;
    const raw   = interaction.fields.getTextInputValue('link_token_input');
    const token = sanitizeToken(raw);

    const [, originMsgId] = interaction.customId.split(':');

    const respond = async (payload) => {
        if (originMsgId) {
            await interaction.deferUpdate();
            await interaction.message?.edit(payload).catch(async () => {
                await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
            });
        } else {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            await interaction.editReply(payload);
        }
    };

    if (!originMsgId) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!isValidUserToken(token)) {
        const c = new ContainerBuilder().setAccentColor(ACCENT.coral);
        c.addTextDisplayComponents(txt(`${E.cross} **invalid token format**\n\nThat doesn't look like a valid Discord token. Copy the **Authorization** header value exactly.`));
        await respond({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    let accountName = '', accountUserId = null, avatarUrl = null, verifyOk = false;
    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
        verifyOk = res.ok;
        if (res.ok) {
            const d = await res.json();
            accountName   = d.global_name || d.username || '';
            accountUserId = d.id;
            if (d.avatar) avatarUrl = `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=128`;
        }
    } catch {}

    if (!verifyOk) {
        const c = new ContainerBuilder().setAccentColor(ACCENT.coral);
        c.addTextDisplayComponents(txt(`${E.cross} **token rejected**\n\nMake sure you copied the \`Authorization\` header and try again.`));
        await respond({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    // Store pending token temporarily (not yet saved to tokenStore)
    // Show confirm lock card — user must press Confirm to finalize
    const pendingMeta = { username: accountName, accountUserId, avatarUrl, linkedAt: new Date().toISOString(), pendingToken: token };
    // Store in client.pendingLinks keyed by userId for the confirm handler
    if (!interaction.client.pendingLinks) interaction.client.pendingLinks = new Map();
    interaction.client.pendingLinks.set(interaction.user.id, { token, meta: pendingMeta });
    await respond({ ...buildConfirmLockCard(pendingMeta), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
}

// ── Button / Select Handlers ───────────────────────────────────────────────

export async function handleLinkPromptButton(interaction) {
    const modal = buildLinkModal();
    modal.setCustomId(`link_token_modal:${interaction.message.id}`);
    await interaction.showModal(modal);
}


// Called when user picks a quest from the dropdown — deletes selector, sends quest cards
export async function handleQuestPickSelect(interaction, client) {
    const questId = interaction.values[0];
    await interaction.deferUpdate();

    const cached     = questSelectorMessages.get(interaction.user.id);
    const selectorMsg = cached?.selectorMsg ?? interaction.message ?? null;

    await runSelectedQuest(
        interaction.user.id,
        questId,
        client.tokenStore,
        (opts) => interaction.channel.send(opts),
        selectorMsg,
        client,
    );

    questSelectorMessages.delete(interaction.user.id);
}

// Called when user presses ‹ back or next › on the quest selector
export async function handleQuestNavButton(interaction, client) {
    const idx    = parseInt(interaction.customId.split(':')[1], 10);
    const cached = questSelectorMessages.get(interaction.user.id);

    if (!cached) {
        await interaction.deferUpdate();
        return;
    }

    cached.idx = idx;
    await interaction.update(buildQuestSelectorCard(cached.quests, idx, cached.bannerUrl ?? null));
}

// Called when user clicks "Pick Another" button
export async function handlePickAnotherButton(interaction, client) {
    await interaction.deferUpdate();
    await runQuestSession(interaction.user.id, client.tokenStore, (opts) => interaction.channel.send(opts));
}

export async function handleStartSessionButton(interaction, client) {
    await interaction.deferUpdate();
    await runQuestSession(interaction.user.id, client.tokenStore, (opts) => interaction.channel.send(opts));
}

export async function handleTokenGuideButton(interaction) {
    const MAP = {
        token_guide_pc: {
            title: 'ꕥ/ PC',
            steps:
                `1. Open Discord in your **browser** (not the app)\n` +
                `2. Press \`Ctrl+Shift+I\` → Network → XHR\n` +
                `3. Send any message, then find the \`authorization\` header\n` +
                `4. Copy the value and paste it below`,
        },
        token_guide_android: {
            title: 'ϙ° Android',
            steps:
                `1. Open Discord in **Chrome** or **Firefox** mobile\n` +
                `2. Tap menu → More tools → Developer Tools\n` +
                `3. Go to Network → XHR → send a message → find \`authorization\`\n` +
                `4. Copy the value and paste it below`,
        },
        token_guide_ios: {
            title: '.✦+ iOS',
            steps:
                `1. Open Discord in **Safari**\n` +
                `2. Enable Web Inspector in Settings → Safari → Advanced\n` +
                `3. Go to Network → XHR → send a message → find \`authorization\`\n` +
                `4. Copy the value and paste it below`,
        },
    };

    const guide = MAP[interaction.customId];
    const c = new ContainerBuilder().setAccentColor(ACCENT.rose);
    c.addTextDisplayComponents(txt(`## How to find your token  ·  ${guide.title}`));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(guide.steps));
    c.addSeparatorComponents(sep(true));
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('link_prompt')
                .setLabel('Enter Token')
                .setStyle(ButtonStyle.Secondary),
        ),
    );
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(`-# ♡ your token is encrypted at rest`));

    await interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
}
// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================