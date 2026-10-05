
// ============================================================
//                    EPLY QUEST — CLAIMALL
// ============================================================
// Claimall is currently unavailable in V1.
//
// Built By Eply
// ============================================================

import {
    SlashCommandBuilder,
    MessageFlags,
} from 'discord.js';

const UNAVAILABLE_MESSAGE =
    '## ⚠️ Claimall Unavailable\n' +
    '-# Claimall isn’t available in this version of the bot. Please wait for **V2** to be released in **Eply Quest**.';

function showClaimallStatus(user) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║                  ◆ EPLY QUEST ◆                         ║');
    console.log('║                                                          ║');
    console.log('║                    CLAIMALL                              ║');
    console.log('║                                                          ║');
    console.log('║              ● STATUS: V1 DISABLED                       ║');
    console.log('║                                                          ║');
    console.log('║       Claimall is unavailable in this version.           ║');
    console.log('║                                                          ║');
    console.log('║             Please wait for V2.                          ║');
    console.log('║                                                          ║');
    console.log('║                  Eply Quest                         ║');
    console.log('║                                                          ║');
    console.log('║  User: ' + user);
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
}

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║                  ◆ EPLY QUEST ◆                         ║');
console.log('║                                                          ║');
console.log('║                 CLAIMALL MODULE                          ║');
console.log('║                                                          ║');
console.log('║              ● STATUS: V1 DISABLED                       ║');
console.log('║                                                          ║');
console.log('║        Claimall will return in V2.                       ║');
console.log('║                                                          ║');
console.log('║                  Eply Quest                         ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

export const claimallCmd = {
    data: new SlashCommandBuilder()
        .setName('claimall')
        .setDescription('Claim rewards for all completed quests instantly'),

    prefix: 'claimall',

    async execute(interaction, _client) {
        showClaimallStatus(
            interaction.user.tag + ' (' + interaction.user.id + ')'
        );

        await interaction.reply({
            content: UNAVAILABLE_MESSAGE,
            flags: MessageFlags.Ephemeral,
        });
    },

    async prefixExecute(message, _args, _client) {
        showClaimallStatus(
            message.author.tag + ' (' + message.author.id + ')'
        );

        await message.reply({
            content: UNAVAILABLE_MESSAGE,
        });
    },
};

