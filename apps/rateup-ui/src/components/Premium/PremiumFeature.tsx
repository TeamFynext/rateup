import { IconLockSquareRounded } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

const PremiumFeature = ({ isSubscribed, children }) => {
  const { t: translations } = useTranslation();

  const content = (
    <div className="relative rounded-[2px] p-4">
      {children}

      {!isSubscribed && (
        <div className="absolute inset-0 z-5 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-[1px] dark:bg-neutral-800/90">
          <IconLockSquareRounded size={50} stroke={1.5} className="text-amber-400" />
        </div>
      )}
    </div>
  );

  if (isSubscribed) return content;

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{content}</TooltipTrigger>
      <TooltipContent className="bg-amber-400 text-amber-950">
        {translations("Upgrade Your Plan")}
      </TooltipContent>
    </Tooltip>
  );
};

export default PremiumFeature;
