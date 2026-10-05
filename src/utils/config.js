// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================

import { PermissionFlagsBits } from 'discord.js';

export const PREFIX              = process.env.BOT_PREFIX       || ',,';
export const QUEST_ROLE_ID       = process.env.QUEST_ROLE_ID      || null;
export const QUEST_LOG_CHANNEL_ID = process.env.QUEST_LOG_CHANNEL_ID || null;

// ── Owner ──────────────────────────────────────────────────────────────────
// The bot owner has premium + every admin permission, always.
export const OWNER_ID = process.env.OWNER_ID || '1538668813355192340';

export function isOwner(userId) {
    return userId === OWNER_ID;
}

/**
 * Staff check — true for the owner OR any member with Administrator.
 * Accepts an interaction.member / message.member or a raw member object.
 */
export function isStaff(memberOrMessage) {
    if (!memberOrMessage) return false;
    const uid = memberOrMessage.id ?? memberOrMessage.user?.id;
    if (uid && isOwner(uid)) return true;
    return memberOrMessage?.permissions?.has?.(PermissionFlagsBits.Administrator) ?? false;
}

// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
