import { CSSProperties } from "react";

import classes from "./Header.module.css";
import { Navbar } from "../Navbar/Navbar";

interface iHeaderTabProps {
  opened?: boolean;
  name: string;
  role: string;
  image: string;
  email: string;
  style?: CSSProperties;
}

export function HeaderTabs({
  name,
  role,
  image,
  email,
  style,
}: iHeaderTabProps) {
  return (
    <div className={classes.header}>
      <Navbar name={name} role={role} image={image} email={email} />
    </div>
  );
}
