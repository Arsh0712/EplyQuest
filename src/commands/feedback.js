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
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';
import { txt } from './questCommands.js';
import { pointsStore } from '../quest/premiumStore.js';

// ── Config ─────────────────────────────────────────────────────────────────
const FEEDBACK_CHANNEL_ID = '1553089163182604400';
const GIFT_POINTS         = 2;

// ── Helpers ────────────────────────────────────────────────────────────────

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}

const SCORE_MAP = {
    '1': { stars: '★ ✧ ✧ ✧ ✧', label: 'Poor'      },
    '2': { stars: '★ ★ ✧ ✧ ✧', label: 'Fair'      },
    '3': { stars: '★ ★ ★ ✧ ✧', label: 'Good'      },
    '4': { stars: '★ ★ ★ ★ ✧', label: 'Great'     },
    '5': { stars: '★ ★ ★ ★ ★', label: 'Excellent' },
};

const CATEGORY_MAP = {
    general:   'General',
    support:   'Support',
    purchase:  'Purchase',
    staff:     'Staff',
    community: 'Community',
};

// ── Modal builder ──────────────────────────────────────────────────────────

export function buildReviewModal(userId) {
    const modal = new ModalBuilder()
        .setCustomId(`feedback_modal:${userId}`)
        .setTitle('Craft Your Review');

    const scoreInput = new TextInputBuilder()
        .setCustomId('score')
        .setLabel('Experience score (1–5)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a number: 1, 2, 3, 4 or 5')
        .setRequired(true)
        .setMaxLength(1);

    const categoryInput = new TextInputBuilder()
        .setCustomId('category')
        .setLabel('Review category')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('General · Support · Purchase · Staff · Community')
        .setRequired(true)
        .setMaxLength(20);

    const memoryInput = new TextInputBuilder()
        .setCustomId('memory')
        .setLabel('What should we remember?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Example: The support was fast, clear, and made the whole order feel premium.')
        .setRequired(true)
        .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder().addComponents(scoreInput),
        new ActionRowBuilder().addComponents(categoryInput),
        new ActionRowBuilder().addComponents(memoryInput),
    );

    return modal;
}

// ── Review card (posted to feedback channel) ───────────────────────────────

function buildReviewCard(user, { score, category, memory }) {
    const scoreInfo  = SCORE_MAP[score] ?? SCORE_MAP['3'];
    const catLabel   = CATEGORY_MAP[category.toLowerCase()] ?? category;
    const avatarUrl  = user.displayAvatarURL({ size: 128, extension: 'png' });
    const publishedTs = Math.floor(Date.now() / 1000);

    const c = new ContainerBuilder();

    const header = new SectionBuilder().addTextDisplayComponents(
        txt(`# ✦ Community Review\n**${scoreInfo.label}** experience`),
    );
    header.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
    c.addSectionComponents(header);

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`*"${memory}"*`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(`A fresh member highlight for the community.`));
    c.addSeparatorComponents(sep(true));

    c.addTextDisplayComponents(txt(
        `**Experience Score:** ${scoreInfo.stars}  ${score}/5`,
    ));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `**Reviewed by:** ${user.username} | <@${user.id}>\n` +
        `Member ID:  ${user.id}\n` +
        `Review Lane: ${catLabel}\n` +
        `Published <t:${publishedTs}:f>`,
    ));
    c.addSeparatorComponents(sepLg(true));

    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('feedback_add_voice')
                .setLabel('Send Yours Too!')
                .setStyle(ButtonStyle.Success),
        ),
    );

return {
    components: [c],
    flags: MessageFlags.IsComponentsV2,
};
}
// ── Received card ──────────────────────────────────────────────────────────

function buildReceivedCard(newPoints) {
    return {
        content:
            `## ✅ Feedback Received\n` +
            `**Thanks for your feedback!**\n` +
            `**Here's a little gift!**\n` +
            `-# You received **+${GIFT_POINTS} pts** — new balance: **${newPoints} pts**\n` +
            `-# Eply Quest · Built By Eply`,
    };
}
// ── "Add Your Voice" modal ─────────────────────────────────────────────────
// FIX: customId must NOT have a colon suffix — interactionCreate matches exact string

function buildAddVoiceModal() {
    const modal = new ModalBuilder()
        .setCustomId(`feedback_voice_modal`)   // ← no colon — matches handler below
        .setTitle('Send Your Review');

    const input = new TextInputBuilder()
        .setCustomId('voice_message')
        .setLabel('Your thoughts')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Share your experience...')
        .setRequired(true)
        .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

// ── Interaction handlers ───────────────────────────────────────────────────

export async function handleFeedbackModal(interaction, client) {
    const userId   = interaction.user.id;
    const score    = interaction.fields.getTextInputValue('score').trim();
    const category = interaction.fields.getTextInputValue('category').trim();
    const memory   = interaction.fields.getTextInputValue('memory').trim();

    // Validate score
    if (!['1','2','3','4','5'].includes(score)) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(txt(`## ✗ Invalid Score\n-# Please enter a number from 1 to 5`));
      await interaction.reply({
    ...buildReceivedCard(newPoints),
    flags: MessageFlags.Ephemeral,
});
        return;
    }

    // Award gift points
    const newPoints = pointsStore.add(userId, GIFT_POINTS);

    // Post to feedback channel
    try {
        const ch = await client.channels.fetch(FEEDBACK_CHANNEL_ID);
        if (ch) await ch.send(buildReviewCard(interaction.user, { score, category, memory }));
    } catch (err) {
        console.error('[feedback] Failed to post review:', err);
    }

    await interaction.reply({ ...buildReceivedCard(newPoints), flags: MessageFlags.Ephemeral });
}

// FIX: showModal must be called directly (no defer first)
export async function handleAddVoiceButton(interaction) {
    await interaction.showModal(buildAddVoiceModal());
}

export async function handleVoiceModal(interaction, client) {
    // FIX: defer first so Discord doesn't time out while we fetch the channel
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const message = interaction.fields.getTextInputValue('voice_message').trim();
    const user    = interaction.user;

    try {
        const ch = await client.channels.fetch(FEEDBACK_CHANNEL_ID);
        if (ch) {
            const voiceCard = new ContainerBuilder();
            voiceCard.addTextDisplayComponents(txt(
                `**Voice Added** by ${user.username} | <@${user.id}>\n` +
                `-# *"${message}"*\n` +
                `-# <t:${Math.floor(Date.now() / 1000)}:f>`,
            ));
            await ch.send({ components: [voiceCard], flags: MessageFlags.IsComponentsV2 });
        }
    } catch (err) {
        console.error('[feedback] Failed to post voice:', err);
    }

    const ack = new ContainerBuilder();
    ack.addTextDisplayComponents(txt(`## ✅ Received!\n-# Thank you for sharing your perspective.`));
    await interaction.editReply({ components: [ack], flags: MessageFlags.IsComponentsV2 });
}

// ── Command ────────────────────────────────────────────────────────────────

export const feedbackCmd = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Craft your community review'),
    prefix: 'feedback',

    async execute(interaction) {
        // showModal must be the FIRST response — no defer
        await interaction.showModal(buildReviewModal(interaction.user.id));
    },

    async prefixExecute(message) {
        const c = new ContainerBuilder();
        c.addTextDisplayComponents(txt(
            `## 📝 Craft Your Review\n` +
            `-# Click below to open the review form`,
        ));
        c.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`feedback_open_modal:${message.author.id}`)
                    .setLabel('Open Review Form')
                    .setStyle(ButtonStyle.Primary),
            ),
        );
        await message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
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