import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export const MotionTransition = ({ keyValue, children }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyValue ? keyValue.id : null}
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: +10, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
