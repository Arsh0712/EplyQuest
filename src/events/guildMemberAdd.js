// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
import {
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    MessageFlags,
} from 'discord.js';
import { pointsStore } from '../quest/premiumStore.js';
import { welcomerStore } from '../quest/welcomerStore.js';
import { buildWelcomeCard } from '../commands/welcomer.js';

// ── Invite cache: guildId → Map<inviteCode, { uses, inviterId }> ──────────
const inviteCache = new Map();

export async function cacheInvites(guild) {
    try {
        const invites = await guild.invites.fetch();
        inviteCache.set(guild.id, new Map(
            invites.map(i => [i.code, { uses: i.uses, inviterId: i.inviter?.id }]),
        ));
    } catch {}
}

function sep(divider = false) {
    return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(divider);
}
function txt(content) {
    return new TextDisplayBuilder().setContent(content);
}

function buildInviteDmCard(newMember, totalInvites, totalPoints) {
    const c = new ContainerBuilder();

    c.addTextDisplayComponents(txt(
        `## 🎉 You Invited a New Member!\n` +
        `-# **${newMember.user.username}** just joined the server`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `📨 **Total Invites:** ${totalInvites}\n` +
        `🪙 **Your Points:** ${totalPoints} pt${totalPoints !== 1 ? 's' : ''}`,
    ));
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(
        `-# Keep inviting to earn more points · spend them with \`,,shop\`\n` +
        `-#  Eply Quest · Built By Eply`,
    ));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export default {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        const guild = member.guild;

        // ── Send welcome message ───────────────────────────────────────────
        try {
            const cfg = welcomerStore.get(guild.id);
            if (cfg?.enabled && cfg?.channelId) {
                const welcomeChannel = await client.channels.fetch(cfg.channelId).catch(() => null);
                if (welcomeChannel) await welcomeChannel.send(buildWelcomeCard(member, cfg));
            }
        } catch (err) {
            console.error('[welcomer] Failed to send welcome message:', err);
        }

        const cachedBefore = inviteCache.get(guild.id) ?? new Map();

        let freshInvites;
        try {
            freshInvites = await guild.invites.fetch();
        } catch {
            return;
        }

        // Find the invite whose use count went up
        let inviterId    = null;
        let inviteCode   = null;
        for (const invite of freshInvites.values()) {
            const prev = cachedBefore.get(invite.code);
            if (prev && invite.uses > prev.uses) {
                inviterId  = invite.inviter?.id ?? prev.inviterId ?? null;
                inviteCode = invite.code;
                break;
            }
        }

        // Refresh cache
        inviteCache.set(guild.id, new Map(
            freshInvites.map(i => [i.code, { uses: i.uses, inviterId: i.inviter?.id }]),
        ));

        if (!inviterId || inviterId === member.user.id) return;

        // Add point and get new total
        const newPoints = pointsStore.add(inviterId, 1);
        console.log(`[points] +1 pt to ${inviterId} for inviting ${member.user.tag}  →  total: ${newPoints}`);

        // Count total invites by this user across the guild
        let totalInvites = 0;
        for (const invite of freshInvites.values()) {
            if (invite.inviter?.id === inviterId) {
                totalInvites += invite.uses ?? 0;
            }
        }

        // DM the inviter
        try {
            const inviter = await client.users.fetch(inviterId);
            await inviter.send(buildInviteDmCard(member, totalInvites, newPoints));
        } catch (err) {
            console.error(`[guildMemberAdd] Could not DM inviter ${inviterId}:`, err.message);
        }
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
