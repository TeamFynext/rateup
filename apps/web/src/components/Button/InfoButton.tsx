import { Button } from "@rateup/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import { IconBook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const InfoButton = ({ docUrl, className = "" }: { docUrl: string; className?: string }) => {
  const { t: translations } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={className}
            variant="outline"
            size="icon-sm"
            aria-label={translations("Visit documentation")}
            onClick={() => {
              window.open(docUrl, "_blank", "noopener,noreferrer");
            }}
          />
        }
      >
        <IconBook className="h-4 w-4" stroke={1.5} />
      </TooltipTrigger>
      <TooltipContent side="top">{translations("Visit documentation")}</TooltipContent>
    </Tooltip>
  );
};

export default InfoButton;
