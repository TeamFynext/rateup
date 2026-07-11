import { IconPencil, IconTrash, IconTrashX } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { useDeleteThemeMutation } from "@/backend/surveyTheme/surveyTheme.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

function RenderOption({
  option,
  surveyActiveThemeId,
  comboboxHandleChange,
  handleOpenRenameThemeModal,
}) {
  const isDefaultOption = option.label === "Default Theme";

  const { value, activeInAnotherSurvey } = option;
  const isSurveyThemeActive = surveyActiveThemeId === value;

  const [isDeletingTheme, setIsDeletingTheme] = useState(false);

  const deleteThemeMutation = useDeleteThemeMutation();

  const handleDeleteBtnClick = async (e) => {
    e.stopPropagation();
    setIsDeletingTheme(true);
    await deleteThemeMutation.mutateAsync(option.value);
    setIsDeletingTheme(false);
    comboboxHandleChange(surveyActiveThemeId);
  };

  const handleEditBtnClick = async (e) => {
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
            className="border-gray-300 bg-transparent text-[var(--tertiary-color)] hover:bg-[var(--tertiary-color)] hover:text-white"
            onClick={handleEditBtnClick}
          >
            <IconPencil size={"1rem"} />
          </Button>
        )}
        {!isDefaultOption &&
          !isSurveyThemeActive &&
          !isDeletingTheme &&
          (activeInAnotherSurvey ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex size-6 cursor-not-allowed items-center justify-center rounded border border-gray-300 bg-transparent text-red-500 opacity-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconTrashX size={"1rem"} />
                </TooltipTrigger>
                <TooltipContent side="right">Active in another survey</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              size="icon-xs"
              variant="outline"
              className="border-gray-300 bg-transparent text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              onClick={handleDeleteBtnClick}
            >
              <IconTrash size={"1rem"} />
            </Button>
          ))}
        {!isSurveyThemeActive && isDeletingTheme && (
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
