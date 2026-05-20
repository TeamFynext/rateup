"use client";

import React, { useEffect } from "react";

import { animate, motion, useMotionValue, useTransform } from "motion/react";

export const NumberAnimate = ({ value }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value);
    controls.speed = 0.5;

    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
};
