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
function sepLg(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(divider);
}

function buildUserInfoCard(user, member) {
    const hasPrem   = premiumStore.has(user.id);
    const points    = pointsStore.get(user.id);
    const avatar    = user.displayAvatarURL({ size: 128, extension: 'png' });
    const createdAt = `<t:${Math.floor(user.createdAt.getTime() / 1000)}:D>`;
    const joinedAt  = member?.joinedAt
        ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
        : 'Unknown';

    const topRole   = member?.roles?.cache
        ?.filter(r => r.name !== '@everyone')
        ?.sort((a, b) => b.position - a.position)
        ?.first();

    const badges = [];
    if (user.bot)    badges.push('🤖 Bot');
    if (hasPrem)     badges.push('💎 Premium');
    if (badges.length === 0) badges.push('🔓 Free');

    const c = new ContainerBuilder();

    const header = new SectionBuilder().addTextDisplayComponents(
        txt(`## ${user.username}\n-# ${badges.join('  ·  ')}`),
    );
    header.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar));
    c.addSectionComponents(header);

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`**Account**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `🆔 **ID:** \`${user.id}\`\n` +
        `📅 **Account created:** ${createdAt}\n` +
        `🗓️ **Joined server:** ${joinedAt}`,
    ));

    if (topRole) {
        c.addSeparatorComponents(sep());
        c.addTextDisplayComponents(txt(`🎭 **Top role:** ${topRole}`));
    }

    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`**Bot Status**`));
    c.addSeparatorComponents(sep());
    c.addTextDisplayComponents(txt(
        `🪙 **Points:** ${points} pt${points !== 1 ? 's' : ''}\n` +
        `✨ **Premium:** ${hasPrem ? 'Active ✅' : 'Inactive ❌'}`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

async function runUserInfo(target, member, send) {
    await send(buildUserInfoCard(target, member));
}

export const userinfoCmd = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View info about a user')
        .addUserOption(o => o.setName('user').setDescription('User to look up (defaults to you)').setRequired(false)),
    prefix: 'userinfo',

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user') ?? interaction.user;
        const member = interaction.options.getMember('user') ?? interaction.member;
        await runUserInfo(target, member, (opts) => interaction.followUp(opts));
    },

    async prefixExecute(message, args, client) {
        let target = message.author;
        let member = message.member;

        const mention = args[0];
        if (mention) {
            const id = mention.replace(/[<@!>]/g, '');
            try {
                target = await client.users.fetch(id);
                member = await message.guild?.members.fetch(id).catch(() => null);
            } catch {
                // If fetch fails, fall back to caller
            }
        }

        await runUserInfo(target, member, (opts) => message.channel.send(opts));
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