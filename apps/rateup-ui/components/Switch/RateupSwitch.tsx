import React, { useState } from "react";

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

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    if (onChange) {
      onChange(newState as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  // Update local state based on the checked prop
  React.useEffect(() => {
    setIsOn(checked);
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
