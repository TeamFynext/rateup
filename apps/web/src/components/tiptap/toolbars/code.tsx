import { IconCode } from "@tabler/icons-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useToolbar } from "./toolbar-provider";

const CodeToolbar = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, onClick, children, ...props }, ref) => {
    const { editor } = useToolbar();
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Inline code"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 sm:h-9 sm:w-9",
                editor?.isActive("code") && "bg-accent",
                className,
              )}
              onClick={(e) => {
                editor?.chain().focus().toggleCode().run();
                onClick?.(e);
              }}
              disabled={!editor?.can().chain().focus().toggleCode().run()}
              ref={ref}
              {...props}
            />
          }
        >
          {children ?? <IconCode className="h-4 w-4" />}
        </TooltipTrigger>
        <TooltipContent>
          <span>Code</span>
        </TooltipContent>
      </Tooltip>
    );
  },
);

CodeToolbar.displayName = "CodeToolbar";

export { CodeToolbar };
