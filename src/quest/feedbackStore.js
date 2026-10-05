/**
 * feedbackStore — tracks pending feedback requests and quest blocks.
 *
 * pendingFeedback: userId → { expiresAt: number, timeoutId }
 *   After a quest completes the user has 30 min to run ,,feedback.
 *   If they don't, they get a 24h quest block.
 *
 * blockedUsers: userId → unblockAt (timestamp ms)
 *   While blocked they cannot run quest / questall / questlist / autoquest.
 */

const pendingFeedback = new Map();  // userId → { expiresAt, timeoutId }
const blockedUsers    = new Map();  // userId → unblockAt (ms timestamp)

const FEEDBACK_WINDOW_MS = 30 * 60 * 1000;   // 30 minutes
const BLOCK_DURATION_MS  = 24 * 60 * 60 * 1000; // 24 hours

export const feedbackStore = {
    // ── Pending ────────────────────────────────────────────────────────────

    /** Start the 30-min feedback window. onExpire is called if they miss it. */
    startWindow(userId, onExpire) {
        this.clearWindow(userId); // cancel any existing timer
        const expiresAt = Date.now() + FEEDBACK_WINDOW_MS;
        const timeoutId = setTimeout(() => {
            pendingFeedback.delete(userId);
            onExpire(userId);
        }, FEEDBACK_WINDOW_MS);
        pendingFeedback.set(userId, { expiresAt, timeoutId });
    },

    hasPending(userId) {
        return pendingFeedback.has(userId);
    },

    clearWindow(userId) {
        const entry = pendingFeedback.get(userId);
        if (entry) {
            clearTimeout(entry.timeoutId);
            pendingFeedback.delete(userId);
        }
    },

    remainingMs(userId) {
        const e = pendingFeedback.get(userId);
        if (!e) return 0;
        return Math.max(0, e.expiresAt - Date.now());
    },

    // ── Block ──────────────────────────────────────────────────────────────

    block(userId) {
        blockedUsers.set(userId, Date.now() + BLOCK_DURATION_MS);
    },

    isBlocked(userId) {
        const until = blockedUsers.get(userId);
        if (!until) return false;
        if (Date.now() >= until) {
            blockedUsers.delete(userId);
            return false;
        }
        return true;
    },

    blockedUntil(userId) {
        return blockedUsers.get(userId) ?? null;
    },

    unblock(userId) {
        blockedUsers.delete(userId);
    },
};
