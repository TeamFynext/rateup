import { IconLoader2, IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { MouseEvent } from "react";

import { useDeleteThemeMutation } from "@/backend/surveyTheme/surveyTheme.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

function RenderOption({
  option,
  surveyActiveThemeId,
  comboboxHandleChange,
  handleOpenRenameThemeModal,
}: {
  option: { value: string; label: string };
  surveyActiveThemeId?: string;
  comboboxHandleChange?: (value: string) => void;
  handleOpenRenameThemeModal?: (themeId: string, oldName?: string) => void;
}) {
  const isDefaultOption = option.label === "Default Theme";

  const { value } = option;
  const isSurveyThemeActive = surveyActiveThemeId === value;

  const [isDeletingTheme, setIsDeletingTheme] = useState(false);

  const deleteThemeMutation = useDeleteThemeMutation();

  const handleDeleteBtnClick = async (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setIsDeletingTheme(true);
    await deleteThemeMutation.mutateAsync(option.value);
    setIsDeletingTheme(false);
    comboboxHandleChange?.(surveyActiveThemeId ?? "");
  };

  const handleEditBtnClick = async (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    handleOpenRenameThemeModal?.(option.value);
  };

  return (
    <div className="flex items-center justify-between gap-2 overflow-hidden">
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{option.label}</span>
      <div className="flex shrink-0 flex-nowrap items-center gap-2.5">
        {!isDefaultOption && (
          <Button
            aria-label="Edit"
            size="icon-xs"
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:border-blue-300 hover:bg-ru-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600"
            onClick={handleEditBtnClick}
          >
            <IconPencil size={"1rem"} />
          </Button>
        )}
        {!isDefaultOption && !isDeletingTheme && (
          <Button
            aria-label="Delete"
            size="icon-xs"
            variant="outline"
            className="border-border bg-transparent text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDeleteBtnClick}
          >
            <IconTrash size={"1rem"} />
          </Button>
        )}
        {!isDefaultOption && isDeletingTheme && (
          <Button
            size="icon-xs"
            variant="outline"
            className="border-border bg-transparent"
            disabled
            onClick={(e) => e.stopPropagation()}
          >
            <IconLoader2 className="size-3 animate-spin" />
          </Button>
        )}
        {isSurveyThemeActive && (
          <Badge className="border bg-card text-green-600 dark:text-green-400">Active</Badge>
        )}
      </div>
    </div>
  );
}

export default RenderOption;
