"use client";

import { IconDatabasePlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ContainedTagInput } from "../../input/ContainedInput/ContainedInput";

const GenerateTags = ({ tagSelectData, setTagSelectData, disabled }) => {
  const handleGenerateTag = () => {
    setTagSelectData((prev) => [...prev, generateRandomString(6)]);
  };
  const translations = useTranslations();
  return (
    <div className="flex items-center gap-1">
      <ContainedTagInput
        onChange={setTagSelectData}
        value={tagSelectData}
        label={translations("tags")}
        placeholder={translations("Type and enter")}
        maw={300}
        disabled={disabled}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={handleGenerateTag}
            disabled={disabled}
            className="mt-6"
          >
            <IconDatabasePlus />
          </Button>
        </TooltipTrigger>

        <TooltipContent>{translations("generate random tag")}</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default GenerateTags;

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}
