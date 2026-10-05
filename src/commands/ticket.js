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
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';
import { ticketStore } from '../quest/ticketStore.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}
function txt(c) { return new TextDisplayBuilder().setContent(c); }

// ── Card builders ──────────────────────────────────────────────────────────

function buildSetupCard() {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        `# Support Tickets\n` +
        `Need help? Open a ticket and our staff will assist you.`,
    ));
    c.addSeparatorComponents(sepLg(true));
    c.addTextDisplayComponents(txt(
        `-# Select a category below or click the button to open a ticket`,
    ));
    c.addSeparatorComponents(sep());

    // Category select menu
    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_open_select')
        .setPlaceholder('Choose a category...')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('General Support').setValue('general').setDescription('General questions and help'),
            new StringSelectMenuOptionBuilder().setLabel('Technical Issue').setValue('technical').setDescription('Bot bugs or technical problems'),
            new StringSelectMenuOptionBuilder().setLabel('Billing / Premium').setValue('billing').setDescription('Points, premium, or purchase issues'),
            new StringSelectMenuOptionBuilder().setLabel('Report a User').setValue('report').setDescription('Report a member for rule violations'),
            new StringSelectMenuOptionBuilder().setLabel('Other').setValue('other').setDescription('Anything not listed above'),
        );
    c.addActionRowComponents(new ActionRowBuilder().addComponents(menu));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildTicketCard(ticket, category = 'General Support') {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        `# Ticket #${String(ticket.number).padStart(4, '0')}\n` +
        `-# ${category}  ·  Opened by <@${ticket.authorId}>`,
    ));
    c.addSeparatorComponents(sepLg(true));
    c.addTextDisplayComponents(txt(
        `Welcome! A staff member will be with you shortly.\n` +
        `-# Please describe your issue in detail below.`,
    ));
    c.addSeparatorComponents(sep(true));

    const status = ticket.claimedBy
        ? `Claimed by <@${ticket.claimedBy}>`
        : `Waiting for staff`;

    c.addTextDisplayComponents(txt(
        `**Status:** ${status}\n` +
        `-# Opened <t:${Math.floor(ticket.createdAt / 1000)}:R>`,
    ));
    c.addSeparatorComponents(sepLg(true));

    // Action buttons
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_claim:${ticket.channelId}`)
            .setLabel(ticket.claimedBy ? 'Claimed' : 'Claim Ticket')
            .setStyle(ticket.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(!!ticket.claimedBy),
        new ButtonBuilder()
            .setCustomId(`ticket_close:${ticket.channelId}`)
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger),
    );
    c.addActionRowComponents(buttons);

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildClosedCard(ticket, closedBy) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `# Ticket Closed\n` +
        `-# Ticket #${String(ticket.number).padStart(4, '0')} was closed by <@${closedBy}>`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `-# This channel will be deleted in **5 seconds**.`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildErrCard(msg) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(`## Error\n-# ${msg}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildSuccessCard(msg) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(msg));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Open ticket ────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
    general:   'General Support',
    technical: 'Technical Issue',
    billing:   'Billing / Premium',
    report:    'Report a User',
    other:     'Other',
};

export async function openTicket(guild, member, category = 'general', client) {
    const cfg = ticketStore.getConfig(guild.id);
    const catLabel = CATEGORY_LABELS[category] ?? 'General Support';

    // Create the ticket channel
    const channelOptions = {
        name:   `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36).slice(-4)}`,
        type:   ChannelType.GuildText,
        topic:  `Ticket | ${catLabel} | ${member.user.tag}`,
        permissionOverwrites: [
            // Lock from everyone
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            // Allow ticket author
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
    };

    // Add support role if configured
    if (cfg?.supportRoleId) {
        channelOptions.permissionOverwrites.push({
            id: cfg.supportRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
        });
    }

    // Put in category if configured
    if (cfg?.categoryId) {
        channelOptions.parent = cfg.categoryId;
    }

    const channel = await guild.channels.create(channelOptions);
    const ticket  = ticketStore.create({ guildId: guild.id, channelId: channel.id, authorId: member.id });

    await channel.send(buildTicketCard(ticket, catLabel));

    return channel;
}

// ── Interaction handlers ───────────────────────────────────────────────────

export async function handleTicketOpenSelect(interaction, client) {
    const category = interaction.values[0];
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const channel = await openTicket(interaction.guild, interaction.member, category, client);
        await interaction.editReply({
    ...buildSuccessCard(`## Ticket Opened!\n-# Your ticket is ready: <#${channel.id}>`),
});
    } catch (err) {
        console.error('[ticket] Error opening:', err);
       await interaction.editReply({
    ...buildErrCard('Failed to create ticket — check my permissions.'),
});
    }
}

export async function handleTicketClaim(interaction) {
    const channelId = interaction.customId.split(':')[1];
    const ticket = ticketStore.get(channelId);
    if (!ticket) {
        await interaction.reply({ ...buildErrCard('Ticket not found.'), flags: MessageFlags.Ephemeral });
        return;
    }
    if (ticket.claimedBy) {
        await interaction.reply({ ...buildErrCard(`Already claimed by <@${ticket.claimedBy}>.`), flags: MessageFlags.Ephemeral });
        return;
    }

    const updated = ticketStore.claim(channelId, interaction.user.id);
    await interaction.update(buildTicketCard(updated));
}

export async function handleTicketClose(interaction) {
    const channelId = interaction.customId.split(':')[1];
    const ticket = ticketStore.get(channelId);
    if (!ticket) {
        await interaction.reply({ ...buildErrCard('Ticket not found.'), flags: MessageFlags.Ephemeral });
        return;
    }

    ticketStore.close(channelId);
    await interaction.update(buildClosedCard(ticket, interaction.user.id));

    setTimeout(async () => {
        try {
            const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
            if (channel) {
                ticketStore.delete(channelId);
                await channel.delete('Ticket closed').catch(() => {});
            }
        } catch {}
    }, 5000);
}

// ── Command: !ticket / /ticket ─────────────────────────────────────────────

export const ticketCmd = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system')
        .addSubcommand(s => s.setName('setup').setDescription('Post the ticket panel (admin only)'))
        .addSubcommand(s => s.setName('close').setDescription('Close the current ticket'))
        .addSubcommand(s =>
            s.setName('claim')
             .setDescription('Claim this ticket as yours'),
        )
        .addSubcommand(s =>
            s.setName('add')
             .setDescription('Add a user to this ticket')
             .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)),
        ),
    prefix: 'ticket',

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({ ...buildErrCard('You need **Manage Server** permission.'), flags: MessageFlags.Ephemeral });
                return;
            }
            await interaction.reply(buildSetupCard());
            return;
        }

        if (sub === 'close') {
            const ticket = ticketStore.get(interaction.channelId);
            if (!ticket) {
                await interaction.reply({ ...buildErrCard('This channel is not a ticket.'), flags: MessageFlags.Ephemeral });
                return;
            }
            ticketStore.close(interaction.channelId);
            await interaction.reply(buildClosedCard(ticket, interaction.user.id));
            setTimeout(async () => {
                try {
                    ticketStore.delete(interaction.channelId);
                    await interaction.channel.delete('Ticket closed').catch(() => {});
                } catch {}
            }, 5000);
            return;
        }

        if (sub === 'claim') {
            const ticket = ticketStore.get(interaction.channelId);
            if (!ticket) {
                await interaction.reply({ ...buildErrCard('This channel is not a ticket.'), flags: MessageFlags.Ephemeral });
                return;
            }
            if (ticket.claimedBy) {
                await interaction.reply({ ...buildErrCard(`Already claimed by <@${ticket.claimedBy}>.`), flags: MessageFlags.Ephemeral });
                return;
            }
            const updated = ticketStore.claim(interaction.channelId, interaction.user.id);
            // Re-fetch the channel message to update it
            await interaction.reply({ ...buildSuccessCard(`## Ticket Claimed\n-# <@${interaction.user.id}> is now handling this ticket`), flags: MessageFlags.Ephemeral });
            // Also update the pinned card if possible
            const msgs = await interaction.channel.messages.fetch({ limit: 5 });
            const ticketMsg = msgs.find(m => m.author.id === interaction.client.user.id && m.components?.length);
            if (ticketMsg) await ticketMsg.edit(buildTicketCard(updated)).catch(() => {});
            return;
        }

        if (sub === 'add') {
            const ticket = ticketStore.get(interaction.channelId);
            if (!ticket) {
                await interaction.reply({ ...buildErrCard('This channel is not a ticket.'), flags: MessageFlags.Ephemeral });
                return;
            }
            const user = interaction.options.getUser('user');
            await interaction.channel.permissionOverwrites.edit(user.id, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
            });
            ticketStore.addUser(interaction.channelId, user.id);
            await interaction.reply({ ...buildSuccessCard(`## User Added\n-# <@${user.id}> has been added to this ticket`), flags: MessageFlags.Ephemeral });
            return;
        }
    },

    async prefixExecute(message, args, client) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'setup') {
            if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                await message.channel.send(buildErrCard('You need **Manage Server** permission.'));
                return;
            }
            await message.channel.send(buildSetupCard());
            return;
        }

        if (sub === 'close') {
            const ticket = ticketStore.get(message.channelId);
            if (!ticket) { await message.channel.send(buildErrCard('This channel is not a ticket.')); return; }
            ticketStore.close(message.channelId);
            await message.channel.send(buildClosedCard(ticket, message.author.id));
            setTimeout(async () => {
                try { ticketStore.delete(message.channelId); await message.channel.delete('Ticket closed'); } catch {}
            }, 5000);
            return;
        }

        if (sub === 'claim') {
            const ticket = ticketStore.get(message.channelId);
            if (!ticket) { await message.channel.send(buildErrCard('This channel is not a ticket.')); return; }
            if (ticket.claimedBy) { await message.channel.send(buildErrCard(`Already claimed by <@${ticket.claimedBy}>.`)); return; }
            const updated = ticketStore.claim(message.channelId, message.author.id);
            await message.channel.send(buildSuccessCard(`## Ticket Claimed\n-# <@${message.author.id}> is now handling this ticket`));
            const msgs = await message.channel.messages.fetch({ limit: 5 });
            const ticketMsg = msgs.find(m => m.author.id === client.user.id && m.components?.length);
            if (ticketMsg) await ticketMsg.edit(buildTicketCard(updated)).catch(() => {});
            return;
        }

        if (sub === 'add') {
            const ticket = ticketStore.get(message.channelId);
            if (!ticket) { await message.channel.send(buildErrCard('This channel is not a ticket.')); return; }
            const mention = args[1];
            const userId  = mention?.replace(/[<@!>]/g, '');
            if (!userId) { await message.channel.send(buildErrCard('Usage: `,,ticket add @user`')); return; }
            await message.channel.permissionOverwrites.edit(userId, {
                ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
            });
            ticketStore.addUser(message.channelId, userId);
            await message.channel.send(buildSuccessCard(`## User Added\n-# <@${userId}> has been added to this ticket`));
            return;
        }

        // Default: show panel
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            await message.channel.send(buildErrCard('You need **Manage Server** permission to post the ticket panel.'));
            return;
        }
        await message.channel.send(buildSetupCard());
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