import React, { useRef } from "react";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { driver } from "driver.js";

import "driver.js/dist/driver.css";

import styles from "./Welcome.module.css";

const WelcomeTour = ({ steps }) => {
  const tourInstance = useRef(null);

  const startTour = () => {
    tourInstance.current = driver({
      showProgress: true,
      steps: steps,
      popoverClass: styles["driverjs-theme"],
    });

    // Start the tour
    tourInstance.current.drive();

    // Cleanup function to reset the tour
    return () => {
      if (tourInstance.current) {
        tourInstance.current.destroy();
      }
    };
  };

  return (
    <Tooltip label="Start Tour" position="top" withArrow>
      <ActionIcon onClick={startTour} variant="light">
        <IconInfoCircle size={24} />
      </ActionIcon>
    </Tooltip>
  );
};

export default WelcomeTour;
