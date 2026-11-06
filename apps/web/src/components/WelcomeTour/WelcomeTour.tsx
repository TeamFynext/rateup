import { Button } from "@rateup/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import { IconInfoCircle } from "@tabler/icons-react";
import type { Driver } from "driver.js";

import "driver.js/dist/driver.css";

import { driver } from "driver.js";
import type { DriveStep } from "driver.js";
import { useRef } from "react";

import styles from "./Welcome.module.css";

const WelcomeTour = ({ steps }: { steps: DriveStep[] }) => {
  const tourInstance = useRef<Driver | null>(null);

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
      <TooltipTrigger
        render={
          <Button
            aria-label="More information"
            onClick={startTour}
            variant="outline"
            size="icon-sm"
          />
        }
      >
        <IconInfoCircle size={24} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Start Tour</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default WelcomeTour;
