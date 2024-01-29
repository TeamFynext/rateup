import { Space } from "@mantine/core";

import classes from "./Header.module.css";
import { Navbar } from "../Navbar/Navbar";
import { userAgent } from "next/server";

interface iProps {
  opened?: boolean;
  name: string;
  role: string;
  image: string;
  email: string;
}

export function HeaderTabs({ opened, name, role, image, email }: iProps) {
  return (
    <div className={classes.header}>
      <Navbar name={name} role={role} image={image} email={email} />
    </div>
  );
}
