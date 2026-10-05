// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================
import { MessageFlags } from 'discord.js';
import { getEmoji } from '../handlers/emoji.js';
import { handleHelpPageSelect } from '../commands/help.js';
import { handleSuggestVote, handleSuggestPitchNew } from '../commands/suggest.js';
import { handleTicketOpenSelect, handleTicketClaim, handleTicketClose } from '../commands/ticket.js';
import { handleWelcomerButton, handleWelcomerChannelModal, handleWelcomerMessageModal } from '../commands/welcomer.js';
import {
    buildReviewModal,
    handleFeedbackModal,
    handleAddVoiceButton,
    handleVoiceModal,
} from '../commands/feedback.js';
import {
    handleLinkModal,
    handleLinkPromptButton,
    handleStartSessionButton,
    handleTokenGuideButton,
    handleQuestPickSelect,
    handleQuestNavButton,
    handlePickAnotherButton,
    buildAccountPanel,
    buildConfirmLockCard,
    buildAccountLockedCard,
} from '../commands/questCommands.js';
import { handleQuestListPageButton } from '../commands/questlist.js';
import { handlePerQuestPageButton } from '../commands/questall.js';

export default {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {

        // Modal: link token
        if (interaction.isModalSubmit() && interaction.customId.startsWith('link_token_modal')) {
            await handleLinkModal(interaction, client);
            return;
        }

        // Button: open link modal
        if (interaction.isButton() && interaction.customId === 'link_prompt') {
            await handleLinkPromptButton(interaction);
            return;
        }

        // Button: unlink from Account Panel
        if (interaction.isButton() && interaction.customId === 'unlink_account') {
            const ts = client.tokenStore;
            ts.remove(interaction.user.id);
            await interaction.update(buildAccountPanel(null));
            return;
        }

        // Button: confirm account lock — edit the existing ephemeral message
        if (interaction.isButton() && interaction.customId === 'link_confirm_lock') {
            const pending = interaction.client.pendingLinks?.get(interaction.user.id);
            if (!pending) {
                await interaction.update({ content: 'Session expired. Please link again.', components: [], embeds: [] });
                return;
            }
            client.tokenStore.save(interaction.user.id, pending.token, pending.meta);
            interaction.client.pendingLinks.delete(interaction.user.id);
            await interaction.update({ ...buildAccountLockedCard() });
            return;
        }

        // Button: cancel account lock — edit back to account panel
        if (interaction.isButton() && interaction.customId === 'link_cancel_lock') {
            interaction.client.pendingLinks?.delete(interaction.user.id);
            await interaction.update({ ...buildAccountPanel(null) });
            return;
        }

        // Button: start quest session from link card
        if (interaction.isButton() && interaction.customId === 'quest_start_session') {
            await handleStartSessionButton(interaction, client);
            return;
        }

        // Buttons: platform token guides
        if (interaction.isButton() && ['token_guide_pc', 'token_guide_android', 'token_guide_ios'].includes(interaction.customId)) {
            await handleTokenGuideButton(interaction);
            return;
        }

        // Buttons: quest list pagination
        if (interaction.isButton() && interaction.customId.startsWith('ql_page:')) {
            await handleQuestListPageButton(interaction);
            return;
        }

        // Buttons: per-quest summary pagination
        if (interaction.isButton() && interaction.customId.startsWith('pq_page:')) {
            await handlePerQuestPageButton(interaction);
            return;
        }

        // Select menu: quest picker dropdown
        if (interaction.isStringSelectMenu() && interaction.customId === 'quest_pick_select') {
            await handleQuestPickSelect(interaction, client);
            return;
        }

        // Buttons: quest selector nav (‹ back / next ›)
        if (interaction.isButton() && interaction.customId.startsWith('quest_nav:')) {
            await handleQuestNavButton(interaction, client);
            return;
        }

        // Noop: quest_nav page counter button
        if (interaction.isButton() && interaction.customId === 'quest_nav_noop') {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        // Button: Pick Another — show quest list again
        if (interaction.isButton() && (interaction.customId === 'quest_pick_another' || interaction.customId === 'qs_pick_another')) {
            await handlePickAnotherButton(interaction, client);
            return;
        }

        // Disabled noop buttons — acknowledge silently
        if (interaction.isButton() && (
            interaction.customId.startsWith('status_noop_') ||
            interaction.customId.startsWith('quest_running_noop_') ||
            interaction.customId.startsWith('quest_done_noop_') ||
            interaction.customId.startsWith('quest_failed_noop_') ||
            interaction.customId.startsWith('ql_noop_') ||
            interaction.customId.startsWith('pq_noop_') ||
            interaction.customId.startsWith('aq_done_noop_') ||
            interaction.customId.startsWith('qs_start_') ||
            interaction.customId.startsWith('qs_stop_') ||
            interaction.customId.startsWith('qs_refresh_') ||
            interaction.customId.startsWith('qs_live_stop') ||
            interaction.customId.startsWith('qs_live_refresh')
        )) {
            await interaction.deferUpdate().catch(() => {});
            return;
        }

        // Modal: feedback review submit
        if (interaction.isModalSubmit() && interaction.customId.startsWith('feedback_modal:')) {
            await handleFeedbackModal(interaction, client);
            return;
        }

        // Modal: "Add Your Voice" submit
        // FIX: was checking for 'feedback_voice_modal:' (with colon) but modal has no colon suffix
        if (interaction.isModalSubmit() && interaction.customId === 'feedback_voice_modal') {
            await handleVoiceModal(interaction, client);
            return;
        }

        // Button: "Send Yours Too!" / "Add Your Voice" on a review card
        // FIX: showModal must be called directly — this handler does NOT defer
        if (interaction.isButton() && interaction.customId === 'feedback_add_voice') {
            await handleAddVoiceButton(interaction);
            return;
        }

        // Button: open feedback modal (prefix command fallback)
        if (interaction.isButton() && interaction.customId.startsWith('feedback_open_modal:')) {
            await interaction.showModal(buildReviewModal(interaction.user.id));
            return;
        }

        // Select menu: ticket category open
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_open_select') {
            await handleTicketOpenSelect(interaction, client);
            return;
        }

        // Welcomer buttons (setup panel)
        if (interaction.isButton() && interaction.customId.startsWith('welcomer_')) {
            await handleWelcomerButton(interaction);
            return;
        }

        // Modal: welcomer channel
        if (interaction.isModalSubmit() && interaction.customId === 'welcomer_channel_modal') {
            await handleWelcomerChannelModal(interaction);
            return;
        }

        // Modal: welcomer message
        if (interaction.isModalSubmit() && interaction.customId === 'welcomer_message_modal') {
            await handleWelcomerMessageModal(interaction);
            return;
        }

        // Button: ticket claim
        if (interaction.isButton() && interaction.customId.startsWith('ticket_claim:')) {
            await handleTicketClaim(interaction);
            return;
        }

        // Button: ticket close
        if (interaction.isButton() && interaction.customId.startsWith('ticket_close:')) {
            await handleTicketClose(interaction);
            return;
        }

        // Button: suggestion vote (up/down)
        if (interaction.isButton() && (
            interaction.customId.startsWith('suggest_up:') ||
            interaction.customId.startsWith('suggest_down:')
        )) {
            await handleSuggestVote(interaction);
            return;
        }

        // Button: pitch new idea
        // FIX: use deferReply so the interaction doesn't expire while we build the response
        if (interaction.isButton() && interaction.customId === 'suggest_pitch_new') {
            await handleSuggestPitchNew(interaction);
            return;
        }

        // Select menu: help page navigation
        if (interaction.isStringSelectMenu() && interaction.customId === 'help_page_select') {
            await handleHelpPageSelect(interaction);
            return;
        }

        // Slash commands
        if (!interaction.isChatInputCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (err) {
            console.error(err);
            const msg = { content: `${getEmoji('error')} Something went wrong.`, flags: 64 };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg).catch(() => {});
            } else {
                await interaction.reply(msg).catch(() => {});
            }
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