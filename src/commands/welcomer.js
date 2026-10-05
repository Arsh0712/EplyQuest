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
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    MessageFlags,
} from 'discord.js';
import { welcomerStore } from '../quest/welcomerStore.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}
function t(content) {
    return new TextDisplayBuilder().setContent(content);
}

function buildErrCard(msg) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(t(`## Error\n-# ${msg}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Welcome card (sent when member joins) ─────────────────────────────────

export function buildWelcomeCard(member, cfg) {
    const user       = member.user;
    const memberCount = member.guild.memberCount;
    const avatarUrl  = user.displayAvatarURL({ size: 256, extension: 'png' });

    // Replace placeholders in the custom message
    const message = cfg.message
        .replace(/{user}/gi,   `<@${user.id}>`)
        .replace(/{username}/gi, user.username)
        .replace(/{count}/gi,  String(memberCount))
        .replace(/{server}/gi, member.guild.name);

    const c = new ContainerBuilder();

    // Header with avatar
    const header = new SectionBuilder().addTextDisplayComponents(
        t(`# Welcome!\n${message}`),
    );
    header.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
    c.addSectionComponents(header);

    c.addSeparatorComponents(sepLg(true));

    c.addTextDisplayComponents(t(
        `You are member **#${memberCount}**\n` +
        `-# Joined <t:${Math.floor(Date.now() / 1000)}:R>`,
    ));

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(t(
        `-# Eply Quest · Built By Eply`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Setup panel card ───────────────────────────────────────────────────────

function buildSetupPanel(cfg) {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(t(`# Welcomer Setup`));
    c.addSeparatorComponents(sepLg(true));

    if (cfg) {
        c.addTextDisplayComponents(t(
            `**Status:** ${cfg.enabled ? 'Enabled' : 'Disabled'}\n` +
            `**Channel:** ${cfg.channelId ? `<#${cfg.channelId}>` : 'Not set'}\n` +
            `**Message:**\n> ${cfg.message}`,
        ));
    } else {
        c.addTextDisplayComponents(t(
            `**Status:** Not configured\n` +
            `-# Use the buttons below to set up your welcomer`,
        ));
    }

    c.addSeparatorComponents(sepLg(true));

    // Action buttons
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('welcomer_set_channel')
            .setLabel('Set Channel')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('welcomer_set_message')
            .setLabel('Set Message')
            .setStyle(ButtonStyle.Primary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('welcomer_toggle')
            .setLabel(cfg?.enabled === false ? 'Enable' : 'Disable')
            .setStyle(cfg?.enabled === false ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('welcomer_preview')
            .setLabel('Preview')
            .setStyle(ButtonStyle.Secondary),
    );

    c.addActionRowComponents(row1);
    c.addActionRowComponents(row2);

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(t(
        `-# Placeholders: \`{user}\` \`{username}\` \`{count}\` \`{server}\``,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildChannelSetCard(channelId) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(t(
        `## Welcome Channel Set\n` +
        `-# Welcome messages will be sent to <#${channelId}>`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildMessageSetCard(message) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(t(
        `## Welcome Message Updated\n` +
        `-# New message:\n> ${message}`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Modals ─────────────────────────────────────────────────────────────────

function buildChannelModal() {
    const modal = new ModalBuilder()
        .setCustomId('welcomer_channel_modal')
        .setTitle('Set Welcome Channel');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('channel_id')
                .setLabel('Channel ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Right-click a channel → Copy ID')
                .setRequired(true)
                .setMaxLength(20),
        ),
    );
    return modal;
}

function buildMessageModal(current) {
    const modal = new ModalBuilder()
        .setCustomId('welcomer_message_modal')
        .setTitle('Set Welcome Message');

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('welcome_message')
                .setLabel('Welcome message')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Welcome to {server}, {user}! You are member #{count}.')
                .setValue(current ?? '')
                .setRequired(true)
                .setMaxLength(500),
        ),
    );
    return modal;
}

// ── Interaction handlers ───────────────────────────────────────────────────

export async function handleWelcomerButton(interaction) {
    const { customId, guildId } = interaction;

    if (customId === 'welcomer_set_channel') {
        await interaction.showModal(buildChannelModal());
        return;
    }

    if (customId === 'welcomer_set_message') {
        const cfg = welcomerStore.get(guildId);
        await interaction.showModal(buildMessageModal(cfg?.message ?? null));
        return;
    }

    if (customId === 'welcomer_toggle') {
        const cfg = welcomerStore.get(guildId);
        const newState = !(cfg?.enabled ?? true);
        welcomerStore.setEnabled(guildId, newState);
        const updated = welcomerStore.get(guildId);
        await interaction.update(buildSetupPanel(updated));
        return;
    }

    if (customId === 'welcomer_preview') {
        const cfg = welcomerStore.get(guildId);
        if (!cfg) {
            await interaction.reply({ ...buildErrCard('No welcomer config found. Set it up first.'), flags: MessageFlags.Ephemeral });
            return;
        }
        const preview = buildWelcomeCard(interaction.member, cfg);
        await interaction.reply({ ...preview, flags: MessageFlags.Ephemeral });
        return;
    }
}

export async function handleWelcomerChannelModal(interaction) {
    const channelId = interaction.fields.getTextInputValue('channel_id').trim();

    // Validate the channel exists in this guild
    const channel = interaction.guild.channels.cache.get(channelId)
        ?? await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
        await interaction.reply({ ...buildErrCard(`Channel \`${channelId}\` not found. Make sure you copied the ID correctly.`), flags: MessageFlags.Ephemeral });
        return;
    }

    welcomerStore.setChannel(interaction.guildId, channelId);
    const updated = welcomerStore.get(interaction.guildId);

    // Refresh the setup panel
    await interaction.update(buildSetupPanel(updated));
}

export async function handleWelcomerMessageModal(interaction) {
    const message = interaction.fields.getTextInputValue('welcome_message').trim();
    welcomerStore.setMessage(interaction.guildId, message);
    const updated = welcomerStore.get(interaction.guildId);
    await interaction.update(buildSetupPanel(updated));
}

// ── Command ────────────────────────────────────────────────────────────────

export const welcomerCmd = {
    data: new SlashCommandBuilder()
        .setName('welcomer')
        .setDescription('Configure the welcome system')
        .addSubcommand(s =>
            s.setName('setup')
             .setDescription('Open the welcomer setup panel'),
        )
        .addSubcommand(s =>
            s.setName('channel')
             .setDescription('Set the welcome channel directly')
             .addChannelOption(o =>
                 o.setName('channel')
                  .setDescription('Channel to send welcome messages in')
                  .setRequired(true),
             ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    prefix: 'welcomer',

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const cfg = welcomerStore.get(interaction.guildId);
            await interaction.reply(buildSetupPanel(cfg));
            return;
        }

        if (sub === 'channel') {
            const channel = interaction.options.getChannel('channel');
            welcomerStore.setChannel(interaction.guildId, channel.id);
            const updated = welcomerStore.get(interaction.guildId);
            await interaction.reply({ ...buildChannelSetCard(channel.id), flags: MessageFlags.Ephemeral });
            return;
        }
    },

    async prefixExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            await message.channel.send(buildErrCard('You need **Manage Server** permission.'));
            return;
        }

        const sub = args[0]?.toLowerCase();

        if (sub === 'setup' || !sub) {
            const cfg = welcomerStore.get(message.guildId);
            await message.channel.send(buildSetupPanel(cfg));
            return;
        }

        if (sub === 'channel') {
            const mention = args[1];
            const channelId = mention?.replace(/[<#>]/g, '');
            if (!channelId) {
                await message.channel.send(buildErrCard('Usage: `!welcomer channel #channel`'));
                return;
            }
            welcomerStore.setChannel(message.guildId, channelId);
            await message.channel.send(buildChannelSetCard(channelId));
            return;
        }

        await message.channel.send(buildErrCard('Unknown subcommand. Use `setup` or `channel`.'));
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