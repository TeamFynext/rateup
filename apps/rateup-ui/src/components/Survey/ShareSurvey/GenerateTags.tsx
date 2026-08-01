import { IconArrowsShuffle, IconX } from "@tabler/icons-react";
import { useState, type KeyboardEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

const GenerateTags = ({
  tagSelectData,
  setTagSelectData,
  disabled,
}: {
  tagSelectData: string[];
  setTagSelectData: Dispatch<SetStateAction<string[]>>;
  disabled?: boolean;
}) => {
  const [inputValue, setInputValue] = useState("");
  const { t: translations } = useTranslation();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      setTagSelectData((prev) => [...prev, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setTagSelectData((prev: string[]) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateTag = () => {
    setTagSelectData((prev: string[]) => [...prev, generateRandomString(6)]);
  };

  return (
    <TooltipProvider>
      <Field>
        <FieldTitle>{translations("tags")}</FieldTitle>
        {tagSelectData?.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1">
            {tagSelectData.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="gap-1 pr-1">
                {tag}
                {!disabled && (
                  <button
                    onClick={() => handleRemoveTag(index)}
                    className="rounded-full hover:opacity-75"
                    aria-label={`Remove ${tag}`}
                  >
                    <IconX className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            placeholder={translations("Type and enter")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="max-w-[300px]"
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleGenerateTag}
                  disabled={disabled}
                />
              }
            >
              <IconArrowsShuffle />
            </TooltipTrigger>
            <TooltipContent>{translations("generate random tag")}</TooltipContent>
          </Tooltip>
        </div>
      </Field>
    </TooltipProvider>
  );
};

export default GenerateTags;

function generateRandomString(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
