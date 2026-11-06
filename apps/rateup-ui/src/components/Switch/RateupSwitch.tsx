import { useId, useEffect, useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

interface RateupSwitchProps {
  offMessage?: string;
  onMessage?: string;
  /** Called with the new checked state. */
  onChange?: (checked: boolean) => void;
  checked?: boolean;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A switch that explains what toggling it will do, via a tooltip whose text
 * depends on the current state.
 *
 * NOTE: currently unreachable — the only consumer is `FieldComponentMap` in
 * `flow-v2/ElementsList/InlineElementEditor.tsx`, whose `renderField` returns
 * `null` for every `type: "checkbox"` field (they are all named `visible`).
 */
const RateupSwitch = ({
  offMessage,
  onMessage,
  onChange,
  checked,
  label,
  disabled,
  className,
}: RateupSwitchProps) => {
  const uid = useId();
  const [isOn, setIsOn] = useState(checked ?? false);

  useEffect(() => {
    setIsOn(checked ?? false);
  }, [checked]);

  const handleToggle = (next: boolean) => {
    setIsOn(next);
    onChange?.(next);
  };

  const message = isOn ? onMessage : offMessage;

  const control = (
    <Field className={className}>
      {label && (
        <FieldLabel htmlFor={`${uid}-field`} className="mb-1 block">
          {label}
        </FieldLabel>
      )}
      <Switch
        id={`${uid}-field`}
        checked={isOn}
        onCheckedChange={handleToggle}
        disabled={disabled}
      />
    </Field>
  );

  if (!message) return control;

  return (
    <Tooltip>
      <TooltipTrigger render={<div className="w-fit" />}>{control}</TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
};

export default RateupSwitch;
