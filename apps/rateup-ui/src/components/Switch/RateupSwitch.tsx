import type { SwitchProps } from "@mantine/core";
import { Switch, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

interface RateupSwitchProps extends SwitchProps {
  offMessage: string;
  onMessage: string;
}

const RateupSwitch = ({ offMessage, onMessage, onChange, checked, ...rest }: RateupSwitchProps) => {
  const [isOn, setIsOn] = useState(checked);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newState = event.currentTarget.checked;
    setIsOn(newState);
    if (onChange) {
      onChange(event); // Forward the change event to the parent handler
    }
  };

  useEffect(() => {
    setIsOn(checked || false);
  }, [checked]);

  return (
    <Tooltip
      label={isOn ? onMessage : offMessage}
      position="top"
      withArrow
      refProp="rootRef"
      disabled={isOn ? !onMessage : !offMessage}
    >
      <Switch checked={isOn} onChange={handleToggle} w={"fit-content"} {...rest} />
    </Tooltip>
  );
};

export default RateupSwitch;
