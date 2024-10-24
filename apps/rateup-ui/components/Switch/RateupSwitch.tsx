import React, { useEffect, useState } from "react";

import { Switch, SwitchProps, Tooltip } from "@mantine/core";

interface RateupSwitchProps extends SwitchProps {
  offMessage: string;
  onMessage: string;
}

const RateupSwitch = ({
  offMessage,
  onMessage,
  onChange,
  checked,
  ...rest
}: RateupSwitchProps) => {
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
    >
      <Switch checked={isOn} onChange={handleToggle} {...rest} />
    </Tooltip>
  );
};

export default RateupSwitch;
