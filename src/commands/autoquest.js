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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} from 'discord.js';
import { enableAutoquest, disableAutoquest, isAutoquestEnabled } from '../quest/autoquestStore.js';
import { PREFIX } from '../utils/config.js';
import { EMOJI } from '../handlers/emoji.js';
import {
    sep,
    txt,
    rewardText,
    ACCENT,
} from './questCommands.js';

const E = EMOJI;

// ── Runner ─────────────────────────────────────────────────────────────────

async function runAutoquestToggle(userId, tokenStore, replyFn) {
    if (isAutoquestEnabled(userId)) {
        disableAutoquest(userId);
        const c = new ContainerBuilder().setAccentColor(ACCENT.amber);
        c.addTextDisplayComponents(txt(
            `## ϙϙ autoquest disabled\n\nI'll no longer auto-run new quests for you.\nUse \`${PREFIX}autoquest\` again to re-enable.`,
        ));
        await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    if (!tokenStore.has(userId)) {
        const c = new ContainerBuilder().setAccentColor(ACCENT.coral);
        c.addTextDisplayComponents(txt(
            `${E.cross} **no token saved**\n\nAutoquest needs your Discord user token.\n\n**Use \`${PREFIX}link\` first**, then run \`${PREFIX}autoquest\` again.`,
        ));
        await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    enableAutoquest(userId);
    const c = new ContainerBuilder().setAccentColor(ACCENT.mint);
    c.addTextDisplayComponents(txt(
        `## ϙϙ autoquest enabled\n\n♡ every new Discord quest that drops will be **auto-completed for you** in the background.\n\nYou'll get a DM summary after each one finishes.\n\nUse \`${PREFIX}autoquest\` again to turn this off.\n\n-# keep your token fresh with \`${PREFIX}link\``,
    ));
    await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

// ── Command ────────────────────────────────────────────────────────────────

export const autoquestCmd = {
    data: new SlashCommandBuilder().setName('autoquest').setDescription('Toggle auto-completing every new quest the moment it drops'),
    prefix: 'autoquest',
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await runAutoquestToggle(interaction.user.id, client.tokenStore, (opts) => interaction.editReply(opts));
    },
    async prefixExecute(message, _args, client) {
        await runAutoquestToggle(message.author.id, client.tokenStore, (opts) => message.reply(opts));
    },
};

// ── Background autoquest runner (called by autoquestWatcher) ───────────────

export async function runAutoquestForUser(userId, quest, tokenStore, discordClient) {
    const token = tokenStore.get(userId);
    if (!token) { disableAutoquest(userId); return; }

    const { QuestClient: QC } = await import('../quest/questClient.js');
    const { Quest: Q }        = await import('../quest/quest.js');
    const qc  = new QC(token);
    const log = (m) => console.log(`[AutoQuest:${userId}]`, m);

    try {
        const manager = await qc.fetchQuests();
        let live = manager.get(quest.id);
        if (!live) {
            live = Q.create({ id: quest.id, config: quest.config, user_status: null, targeted_content: quest.targetedContent, preview: quest.preview });
        }
        if (live.isCompleted() || live.isExpired()) return;

        await manager.doingQuest(live, log);

        let claimManager = manager;
        try { claimManager = await qc.fetchQuests(); } catch { if (!manager.hasQuest(live.id)) manager.upsert(live); }
        await claimManager.claimRewards(log).catch(() => 0);

        try {
            const user   = await discordClient.users.fetch(userId);
            const dm     = await user.createDM();
            const reward = rewardText(live.config.rewards_config.rewards);

            const c = new ContainerBuilder().setAccentColor(ACCENT.mint);
            c.addTextDisplayComponents(txt(`${E.tick} **quest session complete**`));
            c.addSeparatorComponents(sep(true));
            c.addTextDisplayComponents(txt(`${E.tick} **${live.config.messages.quest_name}**\n-# ↳ ${reward}`));
            c.addSeparatorComponents(sep());
            c.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aq_done_noop_${live.id}`)
                        .setLabel('✓ done')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                ),
            );
            c.addSeparatorComponents(sep(true));
            c.addTextDisplayComponents(txt(`-# you reached today's limit  ·  come back tomorrow`));
            await dm.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch {}

    } catch (err) {
        const msg = err?.message ?? String(err);
        console.error(`[AutoQuest:${userId}] Error:`, msg);
        if (msg.includes('401')) {
            tokenStore.remove(userId);
            disableAutoquest(userId);
            try {
                const user = await discordClient.users.fetch(userId);
                const dm   = await user.createDM();
                const c    = new ContainerBuilder().setAccentColor(ACCENT.coral);
                c.addTextDisplayComponents(txt(
                    `## ϙϙ autoquest paused\n\n${E.cross} your saved token expired.\n\nRun \`${PREFIX}link\` to re-link, then \`${PREFIX}autoquest\` to re-enable.`,
                ));
                await dm.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
            } catch {}
        }
    }
}
// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
