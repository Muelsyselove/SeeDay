import { registerTheme, ThemeDefinition } from '../types';

const arknightsTheme: ThemeDefinition = {
  id: 'arknights',
  name: '明日方舟',
  css: {
    '--bg': '#0a0a0f',
    '--bg-surface': 'rgba(20, 25, 35, 0.9)',
    '--border': 'rgba(100, 120, 140, 0.3)',
    '--border-soft': 'rgba(100, 120, 140, 0.15)',
    '--ink': '#ffffff',
    '--ink-secondary': 'rgba(255, 255, 255, 0.7)',
    '--ink-muted': 'rgba(255, 255, 255, 0.5)',
    '--ink-faint': 'rgba(255, 255, 255, 0.3)',
    '--sakura': '#00d4ff',
    '--sakura-soft': 'rgba(0, 212, 255, 0.5)',
    '--sakura-bg': 'rgba(0, 212, 255, 0.08)',
    '--sage': '#4ade80',
    '--sage-soft': 'rgba(74, 222, 128, 0.5)',
    '--sage-bg': 'rgba(74, 222, 128, 0.08)',
    '--gold': '#ffd700',
    '--gold-soft': 'rgba(255, 215, 0, 0.5)',
  },
  layoutId: 'arknights',
  metadata: {
    author: 'AI',
    description: '明日方舟战术终端风格，深蓝科技底色搭配霓虹蓝橙强调色，粒子网格背景与毛玻璃面板',
  },
};

registerTheme(arknightsTheme);
