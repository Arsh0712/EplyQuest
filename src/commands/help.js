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
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
} from 'discord.js';
import { PREFIX } from '../utils/config.js';
import { sep, txt, ACCENT } from './questCommands.js';

const OWNER_TAG = 'Built By Eply';

// ── Pages ──────────────────────────────────────────────────────────────────
const PAGES = [
    { value: 'home',     label: '🏠 Home',          desc: 'Overview & getting started'          },
    { value: 'quest',    label: '👑 Quest Suite',   desc: 'link · quest · questall & more'      },
    { value: 'points',   label: '🪙 Points & Shop', desc: 'Earn & spend points'                 },
    { value: 'feedback', label: '📝 Feedback',      desc: 'Reviews & suggestions'               },
    { value: 'giveaway', label: '🎉 Giveaway',      desc: 'Host server giveaways'               },
    { value: 'utility',  label: '🛠️ Utility',       desc: 'Reminders, info & ping'              },
    { value: 'admin',    label: '🛡️ Admin',         desc: 'Administrator-only commands'         },
];

// ── Select menu ────────────────────────────────────────────────────────────
function buildSelectMenu(currentPage) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('help_page_select')
        .setPlaceholder('📂 Browse a section…');

    for (const page of PAGES) {
        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(page.label)
                .setValue(page.value)
                .setDescription(page.desc)
                .setDefault(page.value === currentPage),
        );
    }

    return new ActionRowBuilder().addComponents(menu);
}

// ── Command entry block — same layout as the shop card ─────────────────────
function cmdBlock(c, { emoji, name, args = '', title, desc }, isLast = false) {
    const usage = args ? `/${name} ${args}` : `/${name}`;
    c.addTextDisplayComponents(txt(
        `${emoji} **${title}**  ·  \`${usage}\`\n` +
        `-# ${desc}`,
    ));
    if (!isLast) c.addSeparatorComponents(sep(true));
}

// ── Page header — same layout as the shop card ─────────────────────────────
function pageHeader(c, emoji, title, subtitle) {
    c.addTextDisplayComponents(txt(
        `## ${emoji} ${title}\n` +
        `-# ${subtitle}`,
    ));
    c.addSeparatorComponents(sep(true));
}

// ── Page: Home ─────────────────────────────────────────────────────────────
function pageHome(c, botAvatar) {
    const hero = new SectionBuilder().addTextDisplayComponents(txt(
        `## ✦ Eply Quest\n` +
        `-# Command Center  ·  fast, clean, built for power users`,
    ));

    if (botAvatar) {
        hero.setThumbnailAccessory(new ThumbnailBuilder().setURL(botAvatar));
    }

    c.addSectionComponents(hero);
    c.addSeparatorComponents(sep(true));

    c.addTextDisplayComponents(txt(
        `### ⚡ Getting Started\n` +
        `**①** \`/link\` — connect your account (private modal)\n` +
        `**②** \`/quest\` — start a quest session & watch live logs\n` +
        `**③** \`/feedback\` — review the session & earn **+2 pts**`,
    ));

    c.addSeparatorComponents(sep(true));

    c.addTextDisplayComponents(txt(
        `### 🗂️ Browse All Sections\n` +
        `👑 Quest Suite  ·  🪙 Points & Shop  ·  📝 Feedback\n` +
        `🎉 Giveaway  ·  🛠️ Utility  ·  🛡️ Admin\n\n` +
        `-# pick a category from the menu below\n` +
        `-# every command also works with the \`${PREFIX}\` prefix`,
    ));
}

// ── Page: Quest Suite ──────────────────────────────────────────────────────
function pageQuest(c) {
    pageHeader(c, '👑', 'Quest Suite', 'link an account, run quests, watch them complete live');

    const cmds = [
        { emoji: '🔗', name: 'link',      title: 'Link Account',   desc: 'connect or update your token — stored encrypted, sent via private modal' },
        { emoji: '🔓', name: 'unlink',    title: 'Unlink Account', desc: 'remove your saved token from the bot completely'                         },
        { emoji: '👑', name: 'quest',     title: 'Quest',          desc: 'start a quest session with a live control panel & real-time logs'        },
        { emoji: '📊', name: 'status',    title: 'Status',         desc: 'check progress of your current active session'                           },
        { emoji: '💎', name: 'questall',  title: 'Quest All',      desc: 'complete every active quest automatically in one session'                },
        { emoji: '📋', name: 'questlist', title: 'Quest List',     desc: 'browse all quests — active, completed, and expired'                      },
        { emoji: '⚡', name: 'autoquest', title: 'Auto Quest',     desc: 'toggle auto-run — new quests are completed the moment they drop'         },
        { emoji: '🎁', name: 'claimall',  title: 'Claim All',      desc: 'instantly claim rewards for every completed quest'                       },
    ];

    cmds.forEach((cmd, i) => cmdBlock(c, cmd, i === cmds.length - 1));
}

// ── Page: Points & Shop ────────────────────────────────────────────────────
function pagePoints(c) {
    pageHeader(c, '🪙', 'Points & Shop', 'earn points, then spend them on quest sessions');

    c.addTextDisplayComponents(txt(
        `### 💰 Earning Points\n` +
        `📨 **Invite a member** → **+1 pt** *(you'll get a DM)*\n` +
        `📝 **Submit feedback** after a quest → **+2 pts**`,
    ));
    c.addSeparatorComponents(sep(true));

    const cmds = [
        { emoji: '🛍️', name: 'shop',        title: 'Shop',        desc: 'browse the full item catalogue & see your balance'                 },
        { emoji: '💳', name: 'buy',         args: '<item>',       title: 'Buy',         desc: 'purchase an item — `/buy quest` (1 pt) · `/buy questall` (5 pts)' },
        { emoji: '🪪', name: 'profile',     title: 'Profile',     desc: 'your balance, premium status & account info'                       },
        { emoji: '🏆', name: 'leaderboard', title: 'Leaderboard', desc: 'see the top points earners on the server'                          },
    ];

    cmds.forEach((cmd, i) => cmdBlock(c, cmd, i === cmds.length - 1));
}

// ── Page: Feedback & Suggestions ───────────────────────────────────────────
function pageFeedback(c) {
    pageHeader(c, '📝', 'Feedback & Suggestions', 'honest reviews keep the quest engine improving');

    c.addTextDisplayComponents(txt(
        `### ⭐ Reviews\n` +
        `### \`/feedback <message>\`\n` +
        `-# share your thoughts after a quest — earn **+2 pts** every time`,
    ));
    c.addSeparatorComponents(sep(true));

    c.addTextDisplayComponents(txt(
        `### ⚠️ The Rules\n` +
        `-# submit within **30 minutes** after a session ends\n` +
        `-# miss the window → quest commands blocked for **24 hours**\n` +
        `-# \`/feedback\` clears the block **instantly**`,
    ));
    c.addSeparatorComponents(sep(true));

    c.addTextDisplayComponents(txt(`### 💡 Suggestions`));
    c.addSeparatorComponents(sep(true));

    const cmds = [
        { emoji: '💭', name: 'suggest', args: 'idea',  title: 'Pitch an Idea',   desc: 'submit a suggestion with a title & full description'   },
        { emoji: '📡', name: 'suggest', args: 'setup', title: 'Suggestion Feed', desc: 'set the channel where suggestions are posted *(admin)*' },
    ];

    cmds.forEach((cmd, i) => cmdBlock(c, cmd, i === cmds.length - 1));
    c.addTextDisplayComponents(txt(`-# members vote 👍 / 👎 on every suggestion`));
}

// ── Page: Giveaway ─────────────────────────────────────────────────────────
function pageGiveaway(c) {
    pageHeader(c, '🎉', 'Giveaways', 'reaction-based giveaways with automatic winner drawing');

    c.addTextDisplayComponents(txt(
        `### 🚀 Start One\n` +
        `\`/gstart <time> <winners> <host> <prize>\`\n\n` +
        `**Example:** \`/gstart 1h 1 @Eply Discord Nitro\`\n` +
        `-# **⏱️ Time:** \`10s\` · \`5m\` · \`2h\` · \`1d\` · combos like \`1h30m\`\n` +
        `-# **🏆 Winners:** 1 – 20`,
    ));
    c.addSeparatorComponents(sep(true));

    c.addTextDisplayComponents(txt(`### 🧰 Manage`));
    c.addSeparatorComponents(sep(true));

    const cmds = [
        { emoji: '🔚', name: 'gend',    args: '<message id>', title: 'End Giveaway',   desc: 'end a giveaway early & draw the winners'       },
        { emoji: '🎲', name: 'greroll', args: '<message id>', title: 'Reroll Winners', desc: 'reroll an ended giveaway & pick new winner(s)' },
    ];

    cmds.forEach((cmd, i) => cmdBlock(c, cmd, i === cmds.length - 1));
    c.addTextDisplayComponents(txt(`-# the bot reacts 🎉 automatically — members react to enter`));
}

// ── Page: Utility ──────────────────────────────────────────────────────────
function pageUtility(c) {
    pageHeader(c, '🛠️', 'Utility', 'everyday helpers for any server');

    const cmds = [
        { emoji: '⏰', name: 'remind',     args: '<time> <message>', title: 'Reminder',   desc: 'timed reminder — e.g. `/remind 30m Take a break!`' },
        { emoji: '🔍', name: 'userinfo',   args: '[@user]',          title: 'User Info',  desc: 'detailed info about yourself or another member'    },
        { emoji: '🌐', name: 'serverinfo', title: 'Server Info',     desc: 'stats and info about this server'                        },
        { emoji: '🏓', name: 'ping',       title: 'Ping',            desc: 'check the bot\'s WebSocket & REST latency'               },
        { emoji: '🏠', name: 'help',       title: 'Help',            desc: 'open this command center'                                },
    ];

    cmds.forEach((cmd, i) => cmdBlock(c, cmd, i === cmds.length - 1));
}

// ── Page: Admin ────────────────────────────────────────────────────────────
function pageAdmin(c) {
    pageHeader(c, '🛡️', 'Admin', 'requires **Administrator** — the bot owner always has full access');

    const cmds = [
        { emoji: '💫', name: 'givepremium',   args: '@user',          title: 'Give Premium',    desc: 'grant premium quest access to a member'        },
        { emoji: '🚫', name: 'removepremium', args: '@user',          title: 'Remove Premium',  desc: 'revoke a member\'s premium access'             },
        { emoji: '🪙', name: 'givepoints',    args: '@user <amount>', title: 'Give Points',     desc: 'add points to a member\'s balance'             },
        { emoji: '🎫', name: 'ticket',        args: 'setup',          title: 'Ticket Panel',    desc: 'post the support ticket panel in this channel' },
        { emoji: '👋', name: 'welcomer',      args: 'setup',          title: 'Welcomer',        desc: 'configure the welcome message for new members' },
        { emoji: '💡', name: 'suggest',       args: 'setup #channel', title: 'Suggestion Feed', desc: 'set the channel where suggestions are posted'  },
    ];

    cmds.forEach((cmd, i) => cmdBlock(c, cmd, i === cmds.length - 1));
    c.addTextDisplayComponents(txt(
        `-# ticket tools: \`/ticket close\` · \`/ticket claim\` · \`/ticket add @user\``,
    ));
}

// ── Full card builder ──────────────────────────────────────────────────────
export function buildHelp(pageKey = 'home', client = null) {
    const botAvatar = client?.user?.displayAvatarURL({ size: 128, extension: 'png' }) ?? null;
    const c = new ContainerBuilder().setAccentColor(ACCENT.lavender);

    switch (pageKey) {
        case 'home':     pageHome(c, botAvatar); break;
        case 'quest':    pageQuest(c);           break;
        case 'points':   pagePoints(c);          break;
        case 'feedback': pageFeedback(c);        break;
        case 'giveaway': pageGiveaway(c);        break;
        case 'utility':  pageUtility(c);         break;
        case 'admin':    pageAdmin(c);           break;
        default:
            c.addTextDisplayComponents(txt(`## ❓ Unknown Section\n-# use the menu below to pick a section`));
    }

    // Footer — same pattern as the rest of the suite
    c.addSeparatorComponents(sep(true));
    c.addTextDisplayComponents(txt(`-# Eply Quest  ·  ${OWNER_TAG}`));
    c.addSeparatorComponents(sep());
    c.addActionRowComponents(buildSelectMenu(pageKey));

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Interaction handler ────────────────────────────────────────────────────
export async function handleHelpPageSelect(interaction) {
    const page = interaction.values[0];
    await interaction.update(buildHelp(page, interaction.client));
}

// ── Command ────────────────────────────────────────────────────────────────
export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Browse everything Eply Quest can do'),
    prefix: 'help',

    async execute(interaction) {
        await interaction.reply(buildHelp('home', interaction.client));
    },

    async prefixExecute(message, _args, client) {
        await message.reply(buildHelp('home', client));
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
