import { registerTheme, ThemeDefinition } from '../types';

const inkwashTheme: ThemeDefinition = {
  id: 'inkwash',
  name: '水墨',
  css: {
    '--bg': 'oklch(96% 0.008 80)',
    '--bg-surface': 'oklch(93% 0.012 75)',
    '--border': 'oklch(78% 0.02 60)',
    '--border-soft': 'oklch(87% 0.015 65)',
    '--ink': 'oklch(15% 0.03 50)',
    '--ink-secondary': 'oklch(40% 0.03 55)',
    '--ink-muted': 'oklch(58% 0.025 60)',
    '--ink-faint': 'oklch(72% 0.02 65)',
    '--sakura': 'oklch(50% 0.2 25)',
    '--sakura-soft': 'oklch(65% 0.15 25)',
    '--sakura-bg': 'oklch(93% 0.04 25)',
    '--sage': 'oklch(50% 0.1 155)',
    '--sage-soft': 'oklch(75% 0.06 155)',
    '--sage-bg': 'oklch(93% 0.025 155)',
    '--gold': 'oklch(62% 0.15 80)',
    '--gold-soft': 'oklch(82% 0.08 80)',
    '--text-xs': 'clamp(0.72rem, 0.66rem + 0.25vw, 0.82rem)',
    '--text-sm': 'clamp(0.85rem, 0.78rem + 0.3vw, 0.98rem)',
    '--text-base': 'clamp(1rem, 0.92rem + 0.35vw, 1.12rem)',
    '--text-lg': 'clamp(1.3rem, 1.05rem + 1vw, 1.65rem)',
    '--text-xl': 'clamp(1.7rem, 1.2rem + 1.8vw, 2.3rem)',
    '--text-2xl': 'clamp(2.2rem, 1.5rem + 2.5vw, 3.2rem)',
  },
  layoutId: 'inkwash',
  metadata: {
    author: 'AI',
    description: '水墨国风，宣纸留白配朱砂印，云雾缭绕山水间，笔触入画意悠远',
  },
};

registerTheme(inkwashTheme);
