"use client";

import { useState, useEffect, useCallback } from "react";
import { getThemes } from "../../themes/types";

export interface ThemeInfo {
  id: string;
  name: string;
}

const THEME_KEY = "live-dashboard-theme";

export function useTheme() {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>("huaxin");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Get themes from registry (themes should be registered by their theme.ts files)
    const registeredThemes = getThemes();
    const themeList: ThemeInfo[] = registeredThemes.map(t => ({ id: t.id, name: t.name }));
    setThemes(themeList.length > 0 ? themeList : [{ id: "huaxin", name: "花信" }]);

    const saved = localStorage.getItem(THEME_KEY);
    if (saved && themeList.some(t => t.id === saved)) {
      setCurrentTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
    setLoaded(true);
  }, []);

  const switchTheme = useCallback((themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem(THEME_KEY, themeId);
  }, []);

  return { currentTheme, themes, switchTheme, loaded };
}
