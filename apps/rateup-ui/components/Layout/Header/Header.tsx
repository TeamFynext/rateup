import { CSSProperties } from "react";
import { useRouter } from "next/router";

import { Navbar } from "../Navbar/Navbar";
import classes from "./Header.module.css";

interface iHeaderTabProps {
  opened?: boolean;
  style?: CSSProperties;
}

export function HeaderTabs({}: iHeaderTabProps) {
  const path = useRouter().pathname;
  if (["/dashboard/whatsapp/inbox"].includes(path)) return null;
  return (
    <div className={classes.header}>
      <Navbar />
    </div>
  );
}
