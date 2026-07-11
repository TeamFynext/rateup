"use client";

import { Trash2, X } from "lucide-react";
import React, { type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getUrlFromString } from "@/lib/tiptap-utils";
import { cn } from "@/lib/utils";

import { useToolbar } from "./toolbar-provider";

const LinkToolbar = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, ...props }, ref) => {
    const { editor } = useToolbar();
    const [link, setLink] = React.useState("");
    const [open, setOpen] = React.useState(false);

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      const url = getUrlFromString(link);
      if (url) editor?.chain().focus().setLink({ href: url }).run();
    };

    React.useEffect(() => {
      setLink(editor?.getAttributes("link").href ?? "");
    }, [editor]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                disabled={!editor?.can().chain().setLink({ href: "" }).run()}
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-max px-3 font-normal",
                      editor?.isActive("link") && "bg-accent",
                      className,
                    )}
                    ref={ref}
                    {...props}
                  />
                }
              />
            }
          >
            <p className="mr-2 text-base">↗</p>
            <p className={"underline decoration-gray-7 underline-offset-4"}>Link</p>
          </TooltipTrigger>
          <TooltipContent>
            <span>Link</span>
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="relative px-3 py-2.5" render={<div className="relative" />}>
          <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3">
            <X className="h-4 w-4" />
          </button>
          <form onSubmit={handleSubmit}>
            <Label>Link</Label>
            <p className="text-sm text-gray-11">Attach a link to the selected text</p>
            <div className="mt-3 flex flex-col items-end justify-end gap-3">
              <Input
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                }}
                className="w-full"
                placeholder="https://example.com"
              />
              <div className="flex items-center gap-3">
                {editor?.getAttributes("link").href && (
                  <Button
                    type="reset"
                    size="sm"
                    className="h-8 text-gray-11"
                    variant="ghost"
                    onClick={() => {
                      editor?.chain().focus().unsetLink().run();
                      setLink("");
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
                <Button size="sm" className="h-8">
                  {editor?.getAttributes("link").href ? "Update" : "Confirm"}
                </Button>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    );
  },
);

LinkToolbar.displayName = "LinkToolbar";

export { LinkToolbar };
