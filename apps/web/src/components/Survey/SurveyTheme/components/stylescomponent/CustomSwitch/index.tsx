import { FieldTitle } from "@rateup/ui/components/field";
import { Switch } from "@rateup/ui/components/switch";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function CustomSwitch({
  className = "",
  checked,
  onChange,
  label,
}: {
  className?: string;
  checked: boolean;
  onChange?: (event: { target: { checked: boolean } }) => void;
  label: ReactNode;
}) {
  return (
    <FieldTitle className={cn("flex w-fit cursor-pointer items-center gap-2.5", className)}>
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(value) => onChange?.({ target: { checked: value } })}
      />
    </FieldTitle>
  );
}

export default CustomSwitch;
