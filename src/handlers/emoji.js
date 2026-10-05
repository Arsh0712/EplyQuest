// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EMOJI_PATH = join(__dirname, '../../data/emoji.json');

// ── Named emoji constants (fallbacks when data/emoji.json is missing) ─────
export const EMOJI = {
    orbs:    '🪙',
    tick:    '✅',
    cross:   '❌',
    success: '✅',
    warning: '⚠️',
    error:   '❌',
    info:    'ℹ️',
    arrow:   '➜',
    ping:    '🏓',
    quest:   '👑',
    star:    '⭐',
    diamond: '💎',
};

export function getEmoji(name) {
  try {
    const data = JSON.parse(readFileSync(EMOJI_PATH, 'utf8'));
    return data[name] ?? EMOJI[name] ?? '';
  } catch {
    return EMOJI[name] ?? '';
  }
}

export function getAllEmojis() {
  try {
    return { ...EMOJI, ...JSON.parse(readFileSync(EMOJI_PATH, 'utf8')) };
  } catch {
    return { ...EMOJI };
  }
}

export function setEmoji(name, emoji) {
  try {
    const data = JSON.parse(readFileSync(EMOJI_PATH, 'utf8'));
    data[name] = emoji;
    writeFileSync(EMOJI_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
//                    EPLY QUEST — QUEST SOLVER
// ============================================================
// Free Quest Solver
// Open Source • Free to Use • Free to Modify
//
// Built By Eply
// ============================================================