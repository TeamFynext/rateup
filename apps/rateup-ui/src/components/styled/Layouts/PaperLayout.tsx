"use client";

import type { JSX } from "react";

import type { PaperProps } from "@mantine/core";
import { Paper } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import clsx from "clsx";
import { motion } from "motion/react";

import styles from "./PaperLayout.module.css";

export interface PaperLayoutProps extends PaperProps {
  hoveractive?: boolean;
  selected?: boolean;
  children?: JSX.Element | JSX.Element[];
  layoutAnimation?: boolean;
  onClick?: (e?: any) => void;
}
export default function PaperLayout({
  hoveractive,
  selected = true,
  className,
  radius = "lg",
  style,
  layoutAnimation,
  ...restProps
}: Readonly<PaperLayoutProps>) {
  const { hovered, ref } = useHover();

  const paperLayoutDivClassName = clsx(styles["paper-layout-div"], className, {
    [styles["selected"]]: selected,
    [styles["hovered-and-hover-active"]]: hovered && hoveractive,
    [styles["hover-active"]]: hoveractive,
  });

  const animateLayout = layoutAnimation
    ? { component: motion.div, layout: true }
    : {};
  return (
    <Paper
      className={paperLayoutDivClassName}
      radius={radius}
      ref={ref}
      {...animateLayout}
      {...restProps}
      style={{
        ...style,
      }}
    />
  );
}
