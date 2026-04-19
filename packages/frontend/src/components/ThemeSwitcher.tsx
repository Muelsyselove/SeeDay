"use client";

import { useState, useCallback } from "react";
import { getThemes } from "../../themes/types";
import { ThemeModal } from "../../components/ThemeModal";
import type { LayoutProps } from "../layouts/registry";

export function ThemeSwitcher({ currentTheme, switchTheme }: LayoutProps) {
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleSwitch = useCallback((themeId: string) => {
    document.documentElement.classList.add("theme-transition");
    switchTheme(themeId);
    setShowThemeModal(false);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 800);
  }, [switchTheme]);

  return (
    <>
      <button
        className="theme-btn"
        onClick={() => setShowThemeModal(v => !v)}
        title="切换主题"
      >
        🎨
      </button>
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        themes={getThemes()}
        currentTheme={currentTheme}
        onSelect={handleSwitch}
      />
    </>
  );
}
