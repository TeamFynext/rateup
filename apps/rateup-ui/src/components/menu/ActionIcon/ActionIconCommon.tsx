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
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full bg-white"
          onClick={handleClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};
