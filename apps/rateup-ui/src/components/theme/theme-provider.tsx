import { ScriptOnce } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function getThemeScript(storageKey: string, defaultTheme: Theme) {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultTheme);

  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system",
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  const prefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
  const systemTheme: "light" | "dark" = prefersDark ? "dark" : "light";
  const resolved = theme === "system" ? systemTheme : theme;

  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: Readonly<ThemeProviderProps>) {
  const [themeState, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setThemeState(
      stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme,
    );
    setMounted(true);
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(themeState);
  }, [themeState, mounted]);

  useEffect(() => {
    if (!mounted || themeState !== "system") return;

    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeState, mounted]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(storageKey, next);
    setThemeState(next);
  };

  // Global dark-mode shortcut (Cmd/Ctrl+Shift+D), registered here so it is available app-wide.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key?.toLowerCase() !== "d") return;
      if (
        !(event.metaKey || event.ctrlKey) ||
        !event.shiftKey ||
        event.altKey ||
        import.meta.env.VITE_EXPERIMENT !== "TRUE"
      )
        return;

      // Never steal the keystroke from a text-entry target.
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      const prefersDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved = themeState === "system" ? (prefersDark ? "dark" : "light") : themeState;
      const next: Theme = resolved === "dark" ? "light" : "dark";
      localStorage.setItem(storageKey, next);
      setThemeState(next);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [themeState, storageKey]);

  return (
    <ThemeProviderContext value={{ theme: themeState, setTheme }}>
      <ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
      {children}
    </ThemeProviderContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}

/**
 * The theme actually in effect — `"system"` resolved against the OS preference.
 * Use this when you need a concrete `"light" | "dark"`, e.g. to pick a class name.
 */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemTheme(media.matches ? "dark" : "light");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return theme === "system" ? systemTheme : theme;
}
