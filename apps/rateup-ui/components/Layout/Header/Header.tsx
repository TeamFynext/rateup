import { CSSProperties } from "react";
import classes from "./Header.module.css";
import { Navbar } from "../Navbar/Navbar";
interface iHeaderTabProps {
  opened?: boolean;
  style?: CSSProperties;
}

export function HeaderTabs({}: iHeaderTabProps) {
  return (
    <div className={classes.header}>
      <Navbar />
    </div>
  );
}
