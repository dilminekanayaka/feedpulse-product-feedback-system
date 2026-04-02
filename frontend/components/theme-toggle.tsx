"use client";

import { useEffect, useState } from "react";

const themeStorageKey = "feedpulse_theme";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(themeStorageKey, theme);
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 9 9 0 1 0 20 15.4Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: ThemeMode =
      storedTheme === "dark" || (storedTheme !== "light" && prefersDark) ? "dark" : "light";

    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  function handleToggle() {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  const label = mounted
    ? theme === "light"
      ? "Switch to dark mode"
      : "Switch to light mode"
    : "Toggle theme";

  return (
    <button
      type="button"
      className="icon-button theme-toggle-button"
      onClick={handleToggle}
      aria-label={label}
      aria-pressed={mounted ? theme === "dark" : undefined}
      title={label}
    >
      <span className="theme-toggle-icon">{theme === "light" ? <MoonIcon /> : <SunIcon />}</span>
    </button>
  );
}

