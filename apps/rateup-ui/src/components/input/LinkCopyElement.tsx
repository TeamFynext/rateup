import { IconCheck, IconCopy } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";

interface LinkCopyElementProps extends Omit<ComponentProps<"input">, "value"> {
  link: string;
  label?: ReactNode;
  value?: string;
}

export function LinkCopyElement({
  link,
  label,
  className,
  style,
  value: _value,
  ...props
}: LinkCopyElementProps) {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Field className={className} style={style}>
      <FieldLabel htmlFor={`${uid}-field`}>{label ?? translations("Register URL")}</FieldLabel>
      <InputGroup>
        <InputGroupInput id={`${uid}-field`} readOnly value={link} {...props} />
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
