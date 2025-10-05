"use client";

import { CSSProperties } from "react";
import { usePathname } from "next/navigation";

import { Navbar } from "../Navbar/Navbar";
import classes from "./Header.module.css";

interface iHeaderTabProps {
  opened?: boolean;
  style?: CSSProperties;
}

export function HeaderTabs({}: iHeaderTabProps) {
  const path = usePathname();
  if (["/dashboard/inbox"].includes(path)) return null;
  return (
    <div className={classes.header}>
      <Navbar />
    </div>
  );
}
