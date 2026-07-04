import type { JSX } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

interface ActionIconCommonProps {
  handleClick: (e: any) => void;
  disabled?: boolean;
  label: string;
  children: JSX.Element;
}
export const ActionIconCommon = ({
  handleClick,
  label,
  children,
  disabled,
}: ActionIconCommonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full bg-white"
            onClick={handleClick}
            disabled={disabled}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
