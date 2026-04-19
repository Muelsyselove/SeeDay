import type React from "react";

export interface ThemeInfo {
  id: string;
  name: string;
}

export interface LayoutProps {
  themes: ThemeInfo[];
  currentTheme: string;
  switchTheme: (id: string) => void;
}

export interface LayoutInfo {
  id: string;
  name: string;
  component: React.ComponentType<LayoutProps>;
}

const layouts = new Map<string, LayoutInfo>();

export function registerLayout(layout: LayoutInfo): void {
  layouts.set(layout.id, layout);
}

export function getLayouts(): LayoutInfo[] {
  return Array.from(layouts.values());
}

export function getLayout(id: string): LayoutInfo | undefined {
  return layouts.get(id);
}
