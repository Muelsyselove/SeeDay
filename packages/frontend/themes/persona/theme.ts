import { registerTheme, ThemeDefinition } from '../types';

const personaTheme: ThemeDefinition = {
  id: 'persona',
  name: 'Persona',
  css: {
    '--bg': '#0a0a0a',
    '--bg-surface': '#111111',
    '--border': '#333333',
    '--border-soft': '#222222',
    '--ink': '#ffffff',
    '--ink-secondary': '#cccccc',
    '--ink-muted': '#888888',
    '--ink-faint': '#555555',
    '--sakura': '#e80000',
    '--sakura-soft': '#ff4444',
    '--sakura-bg': '#1a0000',
    '--sage': '#ffffff',
    '--sage-soft': '#eeeeee',
    '--sage-bg': '#1a1a1a',
    '--gold': '#ffcc00',
    '--gold-soft': '#ffe066',
  },
  layoutId: 'persona',
  metadata: {
    author: 'AI',
    description: '女神异闻录风格，红黑撞色搭配大胆斜切几何，快速入场动画与半色调纹理',
  },
};

registerTheme(personaTheme);
