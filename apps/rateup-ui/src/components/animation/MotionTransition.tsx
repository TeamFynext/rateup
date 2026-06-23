import React from "react";

import { AnimatePresence, motion } from "motion/react";

type MotionTransitionProps = {
  keyValue: any;
  type?:
    | "fade"
    | "leftSlideIn"
    | "rightSlideIn"
    | "bottomSlideIn"
    | "bottomSlideOut";
  apEnable?: boolean;
  duration?: number;
  layout?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const MotionTransition = ({
  keyValue,
  type = "leftSlideIn",
  apEnable = true,
  duration = 0.2,
  layout = false,
  style,
  children,
}: MotionTransitionProps) => {
  return apEnable ? (
    <AnimatePresence mode="wait" key={keyValue ? keyValue.id : null}>
      <motion.div
        layout={layout}
        {...getAnimationProps(type)}
        transition={{ duration }}
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  ) : (
    <motion.div
      key={keyValue ? keyValue.id : null}
      layout={layout}
      {...getAnimationProps(type)}
      transition={{ duration }}
      style={style}
    >
      {children}
    </motion.div>
  );
};
const getAnimationProps = (type: string) => {
  switch (type) {
    case "fade":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      };
    case "leftSlideIn":
      return {
        initial: { x: -10, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: 10, opacity: 0 },
      };
    case "rightSlideIn":
      return {
        initial: { x: 10, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -10, opacity: 0 },
      };
    case "bottomSlideIn":
      return {
        initial: { y: 10, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -10, opacity: 0 },
      };
    case "bottomSlideOut":
      return {
        initial: { y: -10, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 10, opacity: 0 },
      };
    default:
      return {};
  }
};
