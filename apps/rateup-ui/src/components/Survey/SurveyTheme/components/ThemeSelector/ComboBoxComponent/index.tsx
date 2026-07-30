import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn } from "@/lib/utils.ts";

import RenderOption from "../RenderOption.tsx";

function ComboBoxComponent({
  className = "",
  classNames = {} as { option?: string },
  value,
  data = [],
  onChange,
  renderOptionProps = {} as Record<string, unknown>,
  isLoading = false,
}: {
  className?: string;
  classNames?: { option?: string };
  value: string;
  data?: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  renderOptionProps?: Record<string, unknown>;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedOption = data.find((obj) => obj.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border border-input bg-background px-3 py-2 text-left text-sm",
          className,
        )}
      >
        <span className="flex-1 truncate">
          {selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-muted-foreground">Pick value</span>
          )}
        </span>
        {isLoading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent className="min-w-[18.75rem] overflow-hidden p-0" align="start" side="bottom">
        <ScrollArea className="max-h-[45vh]">
          <div className="p-1">
            {data.map((optionObj) => (
              <div
                key={optionObj.value}
                data-combobox-active={String(optionObj.value === value)}
                className={cn("cursor-pointer rounded-sm px-2 py-1.5", classNames.option)}
                onClick={() => {
                  onChange(optionObj.value);
                  setOpen(false);
                }}
              >
                <RenderOption option={optionObj} {...renderOptionProps} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default ComboBoxComponent;
