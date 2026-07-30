import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";

export const NumberAnimate = ({ value }: { value: string | number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, Number(value));
    controls.speed = 0.5;

    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
};
