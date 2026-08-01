import { IconQuote } from "@tabler/icons-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useToolbar } from "./toolbar-provider";

const BlockquoteToolbar = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, onClick, children, ...props }, ref) => {
    const { editor } = useToolbar();
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 sm:h-9 sm:w-9",
                editor?.isActive("blockquote") && "bg-accent",
                className,
              )}
              onClick={(e) => {
                editor?.chain().focus().toggleBlockquote().run();
                onClick?.(e);
              }}
              disabled={!editor?.can().chain().focus().toggleBlockquote().run()}
              ref={ref}
              {...props}
            />
          }
        >
          {children ?? <IconQuote className="h-4 w-4" />}
        </TooltipTrigger>
        <TooltipContent>
          <span>Blockquote</span>
        </TooltipContent>
      </Tooltip>
    );
  },
);

BlockquoteToolbar.displayName = "BlockquoteToolbar";

export { BlockquoteToolbar };
