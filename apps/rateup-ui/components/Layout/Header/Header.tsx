import { Space } from "@mantine/core";

import classes from "./Header.module.css";
import { Navbar } from "../Navbar/Navbar";

interface iProps {
  opened?: boolean;
  style?: any;
}

export function HeaderTabs({ opened, style }: iProps) {
  return (
    <div className={classes.header} style={style}>
      <Navbar />
    </div>
  );
}
