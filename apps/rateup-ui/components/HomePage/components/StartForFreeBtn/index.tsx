"use client";

import { useRouter } from "next/navigation";

import { Button } from "@mantine/core";
import classNames from "classnames/bind";

import { gAnalyticsAndFbEvent } from "@/utils/gtag";

import MotionButtonGesture from "../MotionButtonGesture";
import styles from "./StartForFreeBtn.module.css";

const cx = classNames.bind(styles);

function StartForFreeBtn({
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
        className={`${cx("start-for-free-btn")} ${className}`}
        variant="subtle"
        onClick={handleClick}
      >
        Start for free
      </Button>
    </MotionButtonGesture>
  );
}

export default StartForFreeBtn;
