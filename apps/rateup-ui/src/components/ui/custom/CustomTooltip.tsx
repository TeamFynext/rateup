import React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip.tsx";

const CustomTooltip = ({
  trigger,
  content,
  side = "top",
}: {
  trigger: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) => {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex items-center" />}>
        {trigger}
      </TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
};

export default CustomTooltip;
