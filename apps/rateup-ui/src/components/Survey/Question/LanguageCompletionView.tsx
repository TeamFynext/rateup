import { IconLanguage } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const LanguageCompletionView = ({
  languages,
  notCompletedLanguages,
  selectedLanguage,
  setSelectedLanguage,
}: {
  languages: string[];
  notCompletedLanguages: string[];
  selectedLanguage?: string;
  setSelectedLanguage?: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const hasIncomplete = notCompletedLanguages.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0",
              hasIncomplete
                ? "border-red-300 text-red-500 hover:border-red-400 hover:text-red-600"
                : "border-green-300 text-green-600 hover:border-green-400 hover:text-green-700",
            )}
          />
        }
      >
        <IconLanguage className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages?.map((language) => {
          const isComplete = !notCompletedLanguages.includes(language);
          const isSelected = selectedLanguage === language;
          return (
            <DropdownMenuItem
              key={language}
              onClick={() => setSelectedLanguage?.(language)}
              className={cn("gap-2", isSelected && "bg-accent")}
            >
              <span
                className={cn("size-2 rounded-full", isComplete ? "bg-green-500" : "bg-red-500")}
              />
              {language}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
