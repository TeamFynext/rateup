import {
  Space,
} from "@mantine/core";

import classes from "./Header.module.css";
import { Navbar } from "../Navbar/Navbar";

interface iProps {
  opened?: boolean;
}

export function HeaderTabs({ opened }: iProps) {
  return (
    <div
      className={classes.header}
      style={{ paddingLeft: opened ? "30px" : "30px" }}
    >

      <Space h="lg" />
      <Navbar />
    </div>
  );
}
