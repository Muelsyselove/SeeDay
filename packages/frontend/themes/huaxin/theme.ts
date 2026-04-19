import { registerTheme, ThemeDefinition } from '../types';

const huaxinTheme: ThemeDefinition = {
  id: 'huaxin',
  name: '花信',
  css: {
    '--bg': 'oklch(96.5% 0.012 65)',
    '--bg-surface': 'oklch(94% 0.015 58)',
    '--border': 'oklch(87% 0.02 55)',
    '--border-soft': 'oklch(91% 0.015 55)',
    '--ink': 'oklch(22% 0.02 50)',
    '--ink-secondary': 'oklch(45% 0.025 50)',
    '--ink-muted': 'oklch(62% 0.02 55)',
    '--ink-faint': 'oklch(75% 0.015 55)',
    '--sakura': 'oklch(68% 0.13 12)',
    '--sakura-soft': 'oklch(78% 0.08 12)',
    '--sakura-bg': 'oklch(94% 0.03 12)',
    '--sage': 'oklch(68% 0.08 155)',
    '--sage-soft': 'oklch(78% 0.05 155)',
    '--sage-bg': 'oklch(94% 0.02 155)',
    '--gold': 'oklch(62% 0.11 70)',
    '--gold-soft': 'oklch(85% 0.05 70)',
  },
  layoutId: 'default',
  metadata: {
    description: '淡雅的花信风格主题，灵感来自中国传统花卉文化',
  },
};

registerTheme(huaxinTheme);
