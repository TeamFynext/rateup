"use client";

import * as React from "react";

import { useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { setTheme } = useTheme();
  const { setColorScheme } = useMantineColorScheme();

  const handleSetTheme = (theme: string) => {
    const switchTheme = () => {
      setColorScheme(theme === "system" ? "auto" : (theme as "light" | "dark"));
      setTheme(theme);
    };
    if (document.startViewTransition) {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  };
  if (process.env.NEXT_PUBLIC_EXPERIMENT !== "TRUE") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" className="rounded-full">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
