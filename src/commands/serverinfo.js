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
import { txt } from './questCommands.js';

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}

function buildServerInfoCard(guild) {
    const owner       = guild.ownerId ? `<@${guild.ownerId}>` : 'Unknown';
    const createdAt   = `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:D>`;
    const memberCount = guild.memberCount ?? guild.approximateMemberCount ?? '?';
    const boostLevel  = guild.premiumTier ?? 0;
    const boostCount  = guild.premiumSubscriptionCount ?? 0;
    const iconURL     = guild.iconURL({ size: 128, extension: 'png' });

    const boostBadge = boostLevel === 0 ? 'No Boosts'
        : boostLevel === 1 ? '🚀 Level 1'
        : boostLevel === 2 ? '🚀🚀 Level 2'
        : '🚀🚀🚀 Level 3';

    const verBadge = ['None', 'Low', 'Medium', 'High', 'Very High'][guild.verificationLevel] ?? 'Unknown';

    const c = new ContainerBuilder();

    const header = new SectionBuilder().addTextDisplayComponents(
        txt(`## ${guild.name}\n-# Server Information`),
    );
    if (iconURL) header.setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL));
    c.addSectionComponents(header);

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`**General**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `👑 **Owner:** ${owner}\n` +
        `📅 **Created:** ${createdAt}\n` +
        `🆔 **Server ID:** \`${guild.id}\``,
    ));

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`**Stats**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `👥 **Members:** ${memberCount.toLocaleString()}\n` +
        `💬 **Channels:** ${guild.channels?.cache?.size ?? '?'}\n` +
        `😀 **Emojis:** ${guild.emojis?.cache?.size ?? '?'}\n` +
        `🎭 **Roles:** ${guild.roles?.cache?.size ?? '?'}`,
    ));

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`**Boosts & Security**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `${boostBadge}  ·  **${boostCount}** boosts\n` +
        `-# Verification: ${verBadge}`,
    ));

    if (guild.description) {
        c.addSeparatorComponents(sep(true));
        c.addTextDisplayComponents(txt(`*"${guild.description}"*`));
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export const serverinfoCmd = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View information about this server'),
    prefix: 'serverinfo',

    async execute(interaction) {
        await interaction.deferReply();
        await interaction.followUp(buildServerInfoCard(interaction.guild));
    },

    async prefixExecute(message) {
        await message.channel.send(buildServerInfoCard(message.guild));
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