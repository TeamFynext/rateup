import { IconInfoCircle } from "@tabler/icons-react";
import { driver } from "driver.js";
import { useRef } from "react";

import "driver.js/dist/driver.css";

import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

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
    <Tooltip>
      <TooltipTrigger render={<Button onClick={startTour} variant="outline" size="icon-sm" />}>
        <IconInfoCircle size={24} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Start Tour</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default WelcomeTour;
