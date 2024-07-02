import React, { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const WelcomeTour = ({ steps }) => {
  const tourInstance = useRef(null);

  useEffect(() => {
    tourInstance.current = driver({
      showProgress: true,
      steps: steps,
    });

    // Start the tour
    tourInstance.current.drive();

    // Cleanup function to reset the tour
    return () => {
      if (tourInstance.current) {
        tourInstance.current.destroy();
      }
    };
  }, [steps]);

  return null;
};

export default WelcomeTour;
