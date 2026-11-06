import { IconCalendarEvent } from "@tabler/icons-react";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

import { Calendar } from "@/components/ui/calendar.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { asAnswerText } from "@/utils/response.ts";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { luminance } from "./isLightColor.ts";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

export function DateForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [value, setValue] = useState<Date | null>(null);
  const themePrimaryColor = useThemePrimaryColor();
  const primaryColor = luminance(themePrimaryColor) > 0.8 ? "var(--foreground)" : themePrimaryColor;

  const selectedPreview = useSelectedPreview();
  const isMobile = useIsMobile() || selectedPreview === "mobile";
  const [open, setOpen] = useState(false);
  const { t: translations } = useTranslation();

  const selectedDate: string = isPreview ? String(value ?? "") : asAnswerText(response);

  const handleSelect = (date: Date | undefined) => {
    if (isPreview) {
      setValue(date ?? null);
    } else {
      updateResponse(date);
    }
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      className="flex w-full items-center gap-2 text-base"
      style={{ color: primaryColor }}
    >
      <IconCalendarEvent size="1.2rem" />
      <span>
        {selectedDate ? new Date(selectedDate).toLocaleDateString() : translations("Select date")}
      </span>
    </button>
  );

  const calendar = (
    <Calendar
      mode="single"
      selected={selectedDate ? new Date(selectedDate) : undefined}
      defaultMonth={selectedDate ? new Date(selectedDate) : undefined}
      captionLayout="dropdown"
      onSelect={handleSelect}
    />
  );

  return (
    <FormPaperLayout>
      {isMobile ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={trigger} />
          <DialogContent className="w-auto p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{translations("Select date")}</DialogTitle>
            </DialogHeader>
            {calendar}
          </DialogContent>
        </Dialog>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={trigger} />
          <PopoverContent className="w-auto p-0" align="start">
            {calendar}
          </PopoverContent>
        </Popover>
      )}
    </FormPaperLayout>
  );
}
