import { registerTheme, ThemeDefinition } from '../types';

const boldTheme: ThemeDefinition = {
  id: 'bold',
  name: '极光',
  css: {
    '--bg': 'oklch(12% 0.06 180)',
    '--bg-surface': 'oklch(18% 0.08 175)',
    '--border': 'oklch(35% 0.12 170)',
    '--border-soft': 'oklch(26% 0.09 172)',
    '--ink': 'oklch(95% 0.02 180)',
    '--ink-secondary': 'oklch(80% 0.03 175)',
    '--ink-muted': 'oklch(65% 0.04 170)',
    '--ink-faint': 'oklch(48% 0.05 165)',
    '--sakura': 'oklch(78% 0.2 150)',
    '--sakura-soft': 'oklch(85% 0.14 145)',
    '--sakura-bg': 'oklch(25% 0.1 155)',
    '--sage': 'oklch(82% 0.16 120)',
    '--sage-soft': 'oklch(90% 0.1 115)',
    '--sage-bg': 'oklch(22% 0.08 125)',
    '--gold': 'oklch(80% 0.18 80)',
    '--gold-soft': 'oklch(88% 0.1 75)',
    '--text-xs': 'clamp(0.72rem, 0.66rem + 0.3vw, 0.82rem)',
    '--text-sm': 'clamp(0.88rem, 0.8rem + 0.35vw, 1rem)',
    '--text-base': 'clamp(1.05rem, 0.95rem + 0.45vw, 1.15rem)',
    '--text-lg': 'clamp(1.35rem, 1.1rem + 1vw, 1.65rem)',
    '--text-xl': 'clamp(1.8rem, 1.3rem + 1.8vw, 2.5rem)',
    '--text-2xl': 'clamp(2.3rem, 1.6rem + 2.5vw, 3.2rem)',
  },
  layoutId: 'default',
  metadata: {
    author: 'AI',
    description: '极光风格，深色极光色调搭配荧光绿，极具视觉冲击力',
  },
};

registerTheme(boldTheme);
