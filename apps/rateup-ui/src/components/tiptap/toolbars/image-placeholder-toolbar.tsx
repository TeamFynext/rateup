import { IconPhoto } from "@tabler/icons-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useToolbar } from "./toolbar-provider";

const ImagePlaceholderToolbar = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, children, ...props }, ref) => {
  const { editor } = useToolbar();

  // Only registered when the ImagePlaceholder extension is on the editor, and not every
  // editor mounting this toolbar registers it (some ship their own image picker instead).
  if (typeof editor?.commands.insertImagePlaceholder !== "function") return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 p-0 sm:h-9 sm:w-9",
              editor?.isActive("image-placeholder") && "bg-accent",
              className,
            )}
            onClick={(e) => {
              e.preventDefault();
              editor?.chain().focus().insertImagePlaceholder().run();
              onClick?.(e);
            }}
            ref={ref}
            {...props}
          />
        }
      >
        {children ?? <IconPhoto className="h-4 w-4" aria-hidden="true" />}
      </TooltipTrigger>
      <TooltipContent>
        <span>Image</span>
      </TooltipContent>
    </Tooltip>
  );
});

ImagePlaceholderToolbar.displayName = "ImagePlaceholderToolbar";

export { ImagePlaceholderToolbar };
