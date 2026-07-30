import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
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
    comboboxHandleChange(surveyActiveThemeId);
  };

  const handleEditBtnClick = async (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    handleOpenRenameThemeModal(option.value);
  };

  return (
    <div className="flex items-center justify-between gap-2 overflow-hidden">
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{option.label}</span>
      <div className="flex shrink-0 flex-nowrap items-center gap-2.5">
        {!isDefaultOption && (
          <Button
            size="icon-xs"
            variant="outline"
            className="border-gray-300 bg-transparent text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            onClick={handleEditBtnClick}
          >
            <IconPencil size={"1rem"} />
          </Button>
        )}
        {!isDefaultOption && !isDeletingTheme && (
          <Button
            size="icon-xs"
            variant="outline"
            className="border-gray-300 bg-transparent text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            onClick={handleDeleteBtnClick}
          >
            <IconTrash size={"1rem"} />
          </Button>
        )}
        {!isDefaultOption && isDeletingTheme && (
          <Button
            size="icon-xs"
            variant="outline"
            className="border-gray-300 bg-transparent"
            disabled
            onClick={(e) => e.stopPropagation()}
          >
            <Loader2 className="size-3 animate-spin" />
          </Button>
        )}
        {isSurveyThemeActive && (
          <Badge className="border border-gray-300 bg-white text-green-600">Active</Badge>
        )}
      </div>
    </div>
  );
}

export default RenderOption;
