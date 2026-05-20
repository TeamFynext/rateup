"use client";

import { IconBook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

const InfoButton = ({ docUrl, className = "" }) => {
  const { t: translations } = useTranslation();
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
