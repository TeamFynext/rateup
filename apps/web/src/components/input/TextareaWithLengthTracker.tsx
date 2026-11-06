import * as React from "react";

import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group.tsx";
import { cn } from "@/lib/utils";

export interface TextareaWithLengthTrackerProps extends Omit<
  React.ComponentProps<"textarea">,
  "value"
> {
  value?: string;
  maxValue: number;
  /** Class applied to the outer InputGroup wrapper. */
  className?: string;
  /** Class applied to the textarea control. */
  textareaClassName?: string;
  /** Style applied to the textarea control (not the wrapper). */
  inputStyle?: React.CSSProperties;
}

/**
 * shadcn replacement for the former Mantine-based `TextareaWithLengthTracker`.
 * Auto-grows with content and shows a live character counter.
 */
export function TextareaWithLengthTracker({
  maxValue,
  value,
  className,
  textareaClassName,
  inputStyle,
  ...props
}: TextareaWithLengthTrackerProps) {
  const length = value?.length ?? 0;
  return (
    <InputGroup className={cn("rounded-xl", className)}>
      <InputGroupTextarea
        value={value ?? ""}
        className={cn("field-sizing-content min-h-16", textareaClassName)}
        style={inputStyle}
        {...props}
      />
      <InputGroupAddon align="block-end">
        <LengthTracker length={length} maxValue={maxValue} />
      </InputGroupAddon>
    </InputGroup>
  );
}
