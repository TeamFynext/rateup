import { IconCheck, IconCopy } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group.tsx";

interface LinkCopyElementProps extends Omit<ComponentProps<"input">, "value"> {
  link: string;
  label?: ReactNode;
  value?: string;
  /**
   * Renders a textarea instead of a single-line input, for values that are read
   * rather than glanced at — a JSON snippet someone copies into another product,
   * where seeing the whole thing is the point.
   */
  multiline?: boolean;
  rows?: number;
}

export function LinkCopyElement({
  link,
  label,
  className,
  style,
  value: _value,
  multiline = false,
  rows = 8,
  ...props
}: LinkCopyElementProps) {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    // Absent over plain http and in older browsers, where an unhandled rejection
    // would leave the button looking broken.
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Field className={className} style={style}>
      <FieldLabel htmlFor={`${uid}-field`}>{label ?? translations("Register URL")}</FieldLabel>
      <InputGroup>
        {multiline ? (
          <InputGroupTextarea
            id={`${uid}-field`}
            readOnly
            value={link}
            rows={rows}
            className="font-mono text-xs"
            {...(props as ComponentProps<"textarea">)}
          />
        ) : (
          <InputGroupInput id={`${uid}-field`} readOnly value={link} {...props} />
        )}
        <InputGroupAddon align="inline-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={copy}
            disabled={props.disabled}
            aria-label={translations("Copy")}
          >
            {copied ? <IconCheck className="text-teal-600" /> : <IconCopy />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
