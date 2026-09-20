import { IconCode } from "@tabler/icons-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useToolbar } from "./toolbar-provider";

const CodeBlockToolbar = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, onClick, children, ...props }, ref) => {
    const { editor } = useToolbar();
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Code block"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 sm:h-9 sm:w-9",
                editor?.isActive("codeBlock") && "bg-accent",
                className,
              )}
              onClick={(e) => {
                editor?.chain().focus().toggleCodeBlock().run();
                onClick?.(e);
              }}
              disabled={!editor?.can().chain().focus().toggleCodeBlock().run()}
              ref={ref}
              {...props}
            />
          }
        >
          {children ?? <IconCode className="h-4 w-4" />}
        </TooltipTrigger>
        <TooltipContent>
          <span>Code Block</span>
        </TooltipContent>
      </Tooltip>
    );
  },
);

CodeBlockToolbar.displayName = "CodeBlockToolbar";

export { CodeBlockToolbar };
