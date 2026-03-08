"use client";

import { IconBook } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const InfoButton = ({ docUrl, className = "" }) => {
  const translations = useTranslations();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={className}
          variant="outline"
          size="icon-sm"
          aria-label={translations("Visit documentation")}
          onClick={() => {
            window.open(docUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <IconBook className="h-4 w-4" stroke={1.5} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {translations("Visit documentation")}
      </TooltipContent>
    </Tooltip>
  );
};

export default InfoButton;
