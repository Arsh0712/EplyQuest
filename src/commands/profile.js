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
    MessageFlags,
} from 'discord.js';
import { premiumStore, pointsStore } from '../quest/premiumStore.js';
import { txt } from './questCommands.js';

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}

// ── Card builder ───────────────────────────────────────────────────────────

function buildProfileCard(user, member) {
    const userId    = user.id;
    const hasPrem   = premiumStore.has(userId);
    const points    = pointsStore.get(userId);
    const avatar    = user.displayAvatarURL({ size: 128, extension: 'png' });
    const joinedAt  = member?.joinedAt
        ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
        : 'Unknown';
    const createdAt = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:D>`;
    const premiumBadge = hasPrem ? '💎 Premium' : '🔓 Free';

    const c = new ContainerBuilder();

    // Header with avatar
    const header = new SectionBuilder().addTextDisplayComponents(txt(
        `## ${user.username}'s Profile\n` +
        `-# ${premiumBadge}`,
    ));
    header.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar));
    c.addSectionComponents(header);
    c.addSeparatorComponents(sep(true));

    // Stats
    c.addTextDisplayComponents(txt(`**Account**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `🗓️ **Joined Server:** ${joinedAt}\n` +
        `📅 **Account Created:** ${createdAt}`,
    ));
    c.addSeparatorComponents(sep(true));

    // Points & status
    c.addTextDisplayComponents(txt(`**Status**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `🪙 **Points:** ${points} pt${points !== 1 ? 's' : ''}\n` +
        `✨ **Premium:** ${hasPrem ? 'Active ✅' : 'Inactive ❌'}`,
    ));

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `-# earn pts by inviting members · spend them in \`,,shop\``,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runProfile(user, member, send) {
    await send(buildProfileCard(user, member));
}

// ── Command ────────────────────────────────────────────────────────────────

export const profileCmd = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your membership status and points'),
    prefix: 'profile',

    async execute(interaction) {
        await interaction.deferReply();
        await runProfile(interaction.user, interaction.member, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message) {
        await runProfile(message.author, message.member, (opts) => message.channel.send(opts));
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