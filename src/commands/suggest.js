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
    SectionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import { suggestionStore } from '../quest/suggestionStore.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}
function txt(content) {
    return new TextDisplayBuilder().setContent(content);
}

// ── Suggestion card ────────────────────────────────────────────────────────

export function buildSuggestionCard(s) {
    const c = new ContainerBuilder();

    // Header
    c.addTextDisplayComponents(txt(
        `# Idea Spark\n**${s.title}**`,
    ));
    c.addSeparatorComponents(sep(true));

    // Quote-style description
    c.addTextDisplayComponents(txt(`*"${s.description}"*`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `A community idea is now open for signal, discussion, and staff review.`,
    ));
    c.addSeparatorComponents(sep(true));

    // Vote counts
    const up   = s.upvotes.length;
    const down = s.downvotes.length;
    c.addTextDisplayComponents(txt(
        `**Response:** Up **${up}** | Down **${down}**`,
    ));

    // Vote buttons
    const voteRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`suggest_up:${s.id}`)
            .setLabel(`Up (${up})`)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`suggest_down:${s.id}`)
            .setLabel(`Down (${down})`)
            .setStyle(ButtonStyle.Danger),
    );
    c.addActionRowComponents(voteRow);

    c.addSeparatorComponents(sep(true));

    // Meta
    c.addTextDisplayComponents(txt(
        `**Pitched by:** <@${s.authorId}>\n` +
        `Idea Lane: General\n` +
        `Published <t:${Math.floor(s.createdAt / 1000)}:f>`,
    ));

    c.addSeparatorComponents(sep(true));

    // Pitch button
    const pitchRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('suggest_pitch_new')
            .setLabel('Pitch a New Idea')
            .setStyle(ButtonStyle.Secondary),
    );
    c.addActionRowComponents(pitchRow);

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildErrCard(msg) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(`## Error\n-# ${msg}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildSetupCard(channelId) {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## Suggestion System Setup\n` +
        `-# Suggestions will be posted in <#${channelId}>`,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildPitchPromptCard() {
    const c = new ContainerBuilder();
    c.addTextDisplayComponents(txt(
        `## Pitch an Idea\n` +
        `-# Use \`,,suggest <title> | <description>\` to submit your idea\n` +
        `-# Example: \`,,suggest Better moderation | Add a warning system with escalating punishments\``,
    ));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Interaction handlers ───────────────────────────────────────────────────

export async function handleSuggestVote(interaction) {
    const [, type, id] = interaction.customId.split(':');
    const s = suggestionStore.vote(id, interaction.user.id, type);
    if (!s) {
        await interaction.reply({ ...buildErrCard('Suggestion not found.'), flags: MessageFlags.Ephemeral });
        return;
    }
    // Use deferUpdate + message.edit so the interaction never expires
    await interaction.deferUpdate();
    await interaction.message.edit(buildSuggestionCard(s));
}

export async function handleSuggestPitchNew(interaction) {
    await interaction.reply({ ...buildPitchPromptCard(), flags: MessageFlags.Ephemeral });
}

// ── Runner ─────────────────────────────────────────────────────────────────

async function runSuggestSetup(interaction, channelMention) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ ...buildErrCard('You need **Manage Server** permission to set up suggestions.'), flags: MessageFlags.Ephemeral });
        return;
    }
    const channelId = channelMention?.replace(/[<#>]/g, '') ?? interaction.channelId;
    suggestionStore.setConfig(interaction.guildId, channelId);
    await interaction.reply({ ...buildSetupCard(channelId), flags: MessageFlags.Ephemeral });
}

async function runSuggest(user, guildId, titleRaw, descRaw, send, client) {
    const title = titleRaw?.trim();
    const description = descRaw?.trim();

    if (!title || !description) {
        await send(buildErrCard('Usage: `,,suggest <title> | <description>`'));
        return;
    }

    const cfg = suggestionStore.getConfig(guildId);
    if (!cfg) {
        await send(buildErrCard('Suggestion channel not set up. An admin must run `,,suggest setup #channel` first.'));
        return;
    }

    // Create suggestion (without messageId yet)
    const s = suggestionStore.create({
        guildId,
        channelId: cfg.channelId,
        messageId: null,
        authorId:  user.id,
        title,
        description,
    });

    try {
        const channel = await client.channels.fetch(cfg.channelId);
        const msg     = await channel.send(buildSuggestionCard(s));
        suggestionStore.setMessageId(s.id, msg.id);

        // Create a thread for discussion
        try {
            await msg.startThread({ name: `Idea: ${title}`, autoArchiveDuration: 1440 });
        } catch {}

        // Confirm to user (ephemerally if possible)
        const confirm = new ContainerBuilder();
        confirm.addTextDisplayComponents(txt(
            `## Idea Submitted!\n` +
            `-# Your idea **"${title}"** has been posted in <#${cfg.channelId}>`,
        ));
        await send({ components: [confirm], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
        console.error('[suggest] Error posting:', err);
        await send(buildErrCard('Failed to post — check my permissions in the suggestion channel.'));
    }
}

// ── Command ────────────────────────────────────────────────────────────────

export const suggestCmd = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit or manage suggestions')
        .addSubcommand(s =>
            s.setName('setup')
             .setDescription('Set the suggestion channel (admin only)')
             .addChannelOption(o => o.setName('channel').setDescription('Channel to post suggestions in').setRequired(true)),
        )
        .addSubcommand(s =>
            s.setName('idea')
             .setDescription('Submit a new suggestion')
             .addStringOption(o => o.setName('title').setDescription('Short title for your idea').setRequired(true))
             .addStringOption(o => o.setName('description').setDescription('Full description of your idea').setRequired(true)),
        ),
    prefix: 'suggest',

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');
            await runSuggestSetup(interaction, `<#${channel.id}>`);
        } else if (sub === 'idea') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const title = interaction.options.getString('title');
            const desc  = interaction.options.getString('description');
            await runSuggest(interaction.user, interaction.guildId, title, desc,
                (opts) => interaction.editReply(opts), client,
            );
        }
    },

    async prefixExecute(message, args, client) {
        // ,,suggest setup #channel
        if (args[0]?.toLowerCase() === 'setup') {
            await runSuggestSetup(
                { memberPermissions: message.member.permissions, guildId: message.guildId, reply: (opts) => message.channel.send(opts) },
                args[1] ?? null,
            );
            return;
        }

        // ,,suggest <title> | <description>
        const full = args.join(' ');
        const pipe = full.indexOf('|');
        if (pipe === -1) {
            await message.channel.send(buildErrCard('Usage: `,,suggest <title> | <description>`'));
            return;
        }
        const title = full.slice(0, pipe).trim();
        const desc  = full.slice(pipe + 1).trim();
        await runSuggest(message.author, message.guildId, title, desc,
            (opts) => message.channel.send(opts), client,
        );
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