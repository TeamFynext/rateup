"use client";

import { useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";

import { useTheme } from "./theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { setColorScheme } = useMantineColorScheme();

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    const switchTheme = () => {
      setColorScheme(newTheme);
      setTheme(newTheme);
    };
    if (document.startViewTransition) {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  };

  if (import.meta.env.VITE_EXPERIMENT !== "TRUE") return null;

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="rounded-full h-8 w-8 mx-auto"
      onClick={handleToggleTheme}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
