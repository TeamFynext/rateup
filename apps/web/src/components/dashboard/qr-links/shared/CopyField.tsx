import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";

import { CopyButton } from "./CopyButton.tsx";

/** A read-only URL with a copy button, for links that are made here rather than typed. */
export function CopyField({
  id,
  value,
  copyLabel,
  disabled,
}: Readonly<{ id?: string; value: string; copyLabel: string; disabled?: boolean }>) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        value={value}
        readOnly
        disabled={disabled}
        onFocus={(e) => e.currentTarget.select()}
      />
      <InputGroupAddon align="inline-end">
        <CopyButton value={value} label={copyLabel} disabled={disabled} />
      </InputGroupAddon>
    </InputGroup>
  );
}
