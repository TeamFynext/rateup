import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export const MotionTransition = ({
  keyValue,
  type = "leftSlideIn",
  children,
}) => {
  const getAnimationProps = (type) => {
    switch (type) {
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
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
      default:
        return {};
    }
  };
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyValue ? keyValue.id : null}
        {...getAnimationProps(type)}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
