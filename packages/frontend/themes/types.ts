export interface ThemeDefinition {
  id: string;
  name: string;
  css: Record<string, string>;
  layoutId: string;
  metadata?: {
    author?: string;
    description?: string;
    previewImage?: string;
  };
}

const themes = new Map<string, ThemeDefinition>();

export function registerTheme(theme: ThemeDefinition): void {
  themes.set(theme.id, theme);
}

export function getThemes(): ThemeDefinition[] {
  return Array.from(themes.values());
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.get(id);
}
