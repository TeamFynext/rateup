import { IconMoon, IconSun } from "@tabler/icons-react";

import { Button } from "@/components/ui/button.tsx";

import { useTheme } from "./theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    const switchTheme = () => {
      setTheme(newTheme);
    };
    if (document.startViewTransition) {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      className="rounded-full h-8 w-8 mx-auto"
      onClick={handleToggleTheme}
    >
      <IconSun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <IconMoon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
