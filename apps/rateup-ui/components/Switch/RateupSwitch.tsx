import React, { useState } from "react";

import { Switch, Tooltip } from "@mantine/core";

const RateupSwitch = ({ offMessage, onMessage, onChange, checked }) => {
  const [isOn, setIsOn] = useState(checked);

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    if (onChange) {
      onChange(newState);
    }
  };

  // Update local state based on the checked prop
  React.useEffect(() => {
    setIsOn(checked);
  }, [checked]);

  return (
    <Tooltip label={isOn ? onMessage : offMessage} position="top" withArrow>
      <div>
        <Switch checked={isOn} onChange={handleToggle} />
      </div>
    </Tooltip>
  );
};

export default RateupSwitch;
