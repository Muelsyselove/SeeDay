import { registerTheme, ThemeDefinition } from '../types';

const infernoTheme: ThemeDefinition = {
  id: 'inferno',
  name: '烈焰',
  css: {
    '--bg': 'oklch(10% 0.04 30)',
    '--bg-surface': 'oklch(16% 0.06 25)',
    '--border': 'oklch(45% 0.15 35)',
    '--border-soft': 'oklch(30% 0.1 30)',
    '--ink': 'oklch(97% 0.01 85)',
    '--ink-secondary': 'oklch(88% 0.03 75)',
    '--ink-muted': 'oklch(70% 0.05 60)',
    '--ink-faint': 'oklch(55% 0.06 45)',
    '--sakura': 'oklch(65% 0.28 25)',
    '--sakura-soft': 'oklch(75% 0.2 30)',
    '--sakura-bg': 'oklch(22% 0.1 28)',
    '--sage': 'oklch(72% 0.22 50)',
    '--sage-soft': 'oklch(85% 0.14 55)',
    '--sage-bg': 'oklch(20% 0.08 45)',
    '--gold': 'oklch(80% 0.2 60)',
    '--gold-soft': 'oklch(90% 0.12 65)',
    '--text-xs': 'clamp(0.75rem, 0.68rem + 0.35vw, 0.88rem)',
    '--text-sm': 'clamp(0.92rem, 0.82rem + 0.4vw, 1.08rem)',
    '--text-base': 'clamp(1.1rem, 0.98rem + 0.5vw, 1.25rem)',
    '--text-lg': 'clamp(1.45rem, 1.15rem + 1.2vw, 1.8rem)',
    '--text-xl': 'clamp(2rem, 1.4rem + 2vw, 2.8rem)',
    '--text-2xl': 'clamp(2.5rem, 1.7rem + 2.8vw, 3.5rem)',
  },
  layoutId: 'default',
  metadata: {
    author: 'AI',
    description: '烈焰风格，深邃炭黑搭配炽热红橙，带有脉冲光晕和渐变流动效果',
  },
};

registerTheme(infernoTheme);
