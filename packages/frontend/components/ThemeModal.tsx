"use client";

import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { ThemeDefinition } from "@/themes/types";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  themes: ThemeDefinition[];
  currentTheme: string;
  onSelect: (themeId: string) => void;
}

export function ThemeModal({ isOpen, onClose, themes, currentTheme, onSelect }: ThemeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const COLOR_SWATCHES = [
    { label: "背景", var: "--bg" },
    { label: "表面", var: "--bg-surface" },
    { label: "强调", var: "--sakura" },
    { label: "辅助", var: "--sage" },
    { label: "金色", var: "--gold" },
    { label: "文字", var: "--ink" },
  ];

  const modalContent = (
    <div
      className="theme-modal-overlay"
      onClick={onClose}
      ref={modalRef}
    >
      <div className="theme-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="theme-modal-title">选择主题</h2>
        <div className="theme-modal-grid">
          {themes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-card ${theme.id === currentTheme ? "theme-card-active" : ""}`}
              onClick={() => onSelect(theme.id)}
              style={{ "--theme-id": theme.id, ...theme.css } as React.CSSProperties}
            >
              <div className="theme-card-header">
                <span className="theme-card-name">{theme.name}</span>
                {theme.metadata?.description && (
                  <span className="theme-card-desc">{theme.metadata.description}</span>
                )}
              </div>
              <div className="theme-card-colors">
                {COLOR_SWATCHES.map(({ label, var: cssVar }) => (
                  <div key={cssVar} className="theme-card-swatch" title={label}>
                    <div
                      className="theme-card-swatch-color"
                      style={{ backgroundColor: `var(${cssVar})` }}
                    />
                    <span className="theme-card-swatch-label">{label}</span>
                  </div>
                ))}
              </div>
              <div className="theme-card-preview">
                <div className="theme-card-preview-sidebar" />
                <div className="theme-card-preview-content">
                  <div className="theme-card-preview-bar" />
                  <div className="theme-card-preview-blocks">
                    <div className="theme-card-preview-block" />
                    <div className="theme-card-preview-block" />
                  </div>
                </div>
              </div>
              {theme.id === currentTheme && (
                <span className="theme-card-badge">当前</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
