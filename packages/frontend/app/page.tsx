"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { getLayout, LayoutInfo } from "@/layouts/registry";
import { getTheme } from "@/themes/types";

// Import theme definitions to register them
import "@/themes/huaxin/theme";
import "@/themes/artistic/theme";
import "@/themes/bold/theme";
import "@/themes/inferno/theme";
import "@/themes/persona/theme";
import "@/themes/inkwash/theme";

// Import layouts to register them
import "@/layouts/DefaultLayout";
import "@/layouts/PersonaLayout";
import "@/layouts/InkLayout";

export default function HomePage() {
  const { currentTheme, themes, switchTheme } = useTheme();
  const [layout, setLayout] = useState<LayoutInfo | null>(null);

  useEffect(() => {
    const themeDef = getTheme(currentTheme);
    const layoutId = themeDef?.layoutId || "default";
    const layoutInfo = getLayout(layoutId) || getLayout("default");
    if (layoutInfo) {
      setLayout(layoutInfo);
    }
  }, [currentTheme]);

  if (!layout) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  const LayoutComponent = layout.component;

  return (
    <LayoutComponent
      themes={themes}
      currentTheme={currentTheme}
      switchTheme={switchTheme}
    />
  );
}
