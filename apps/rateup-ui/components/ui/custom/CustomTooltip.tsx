import React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

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
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
};

export default CustomTooltip;
