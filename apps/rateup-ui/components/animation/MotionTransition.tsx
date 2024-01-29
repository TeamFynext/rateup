import React from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  children: React.ReactNode;
};
export const MotionTransition = ({
  keyValue,
  type = "leftSlideIn",
  apEnable = true,
  duration = 0.2,
  children,
}: MotionTransitionProps) => {
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
  return apEnable ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyValue ? keyValue.id : null}
        {...getAnimationProps(type)}
        transition={{ duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  ) : (
    <motion.div
      key={keyValue ? keyValue.id : null}
      {...getAnimationProps(type)}
      transition={{ duration }}
    >
      {children}
    </motion.div>
  );
};
