import { registerTheme, ThemeDefinition } from '../types';

const artisticTheme: ThemeDefinition = {
  id: 'artistic',
  name: '艺境',
  css: {
    '--bg': 'oklch(18% 0.03 290)',
    '--bg-surface': 'oklch(24% 0.04 285)',
    '--border': 'oklch(40% 0.08 280)',
    '--border-soft': 'oklch(32% 0.05 282)',
    '--ink': 'oklch(96% 0.01 85)',
    '--ink-secondary': 'oklch(82% 0.02 80)',
    '--ink-muted': 'oklch(68% 0.03 75)',
    '--ink-faint': 'oklch(52% 0.04 70)',
    '--sakura': 'oklch(65% 0.22 300)',
    '--sakura-soft': 'oklch(72% 0.15 305)',
    '--sakura-bg': 'oklch(30% 0.08 295)',
    '--sage': 'oklch(75% 0.18 175)',
    '--sage-soft': 'oklch(82% 0.12 170)',
    '--sage-bg': 'oklch(28% 0.06 172)',
    '--gold': 'oklch(72% 0.16 65)',
    '--gold-soft': 'oklch(85% 0.08 70)',
  },
  layoutId: 'default',
  metadata: {
    description: '大胆的艺术风格配色，深邃紫罗兰与电光青',
  },
};

registerTheme(artisticTheme);
