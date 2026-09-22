import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "theme";

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system",
  setTheme: () => {},
});

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Storage blocked: fall through to the system preference.
  }
  return "system";
}

function applyTheme(theme: Theme) {
  const prefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/**
 * Client-only counterpart of rateup-ui's ThemeProvider. The console is a static SPA, so there is
 * no SSR flash to guard against with an inline script; the theme is applied on first render.
 */
export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;

    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted; still applies for this session.
    }
    setThemeState(next);
  };

  return <ThemeProviderContext value={{ theme, setTheme }}>{children}</ThemeProviderContext>;
}

export const useTheme = () => useContext(ThemeProviderContext);
