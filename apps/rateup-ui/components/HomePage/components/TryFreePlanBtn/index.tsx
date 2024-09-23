import { useRouter } from "next/router";

import { Button } from "@mantine/core";
import classNames from "classnames/bind";

import { gAnalyticsAndFbEvent } from "@/utils/gtag";

import MotionButtonGesture from "../MotionButtonGesture";
import styles from "./TryFreePlanBtn.module.css";

const cx = classNames.bind(styles);

function TryFreePlanBtn({
  className = "",
  gACategory = null,
  fbEventName = null,
  gALabel = null,
  onClick = null,
}) {
  const router = useRouter();

  const handleClick = () => {
    onClick?.();
    if (gACategory && fbEventName && gALabel) {
      gAnalyticsAndFbEvent(gACategory, fbEventName, gALabel);
    }
    router.push("/signup");
  };

  return (
    <MotionButtonGesture>
      <Button
        className={`${cx("try-free-plan-btn")} ${className}`}
        variant="subtle"
        onClick={handleClick}
      >
        Try free plan!
      </Button>
    </MotionButtonGesture>
  );
}

export default TryFreePlanBtn;
