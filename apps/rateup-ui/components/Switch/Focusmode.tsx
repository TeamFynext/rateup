"use client";

import { usePathname, useRouter } from "next/navigation";

import { Paper } from "@mantine/core";
import { IconMaximize, IconMaximizeOff } from "@tabler/icons-react";

import styles from "./Focusmode.module.css";

interface focusmodeInterface {
  focus: boolean;
  toggleFocus: (focus: boolean) => void;
}

export default function FocusMode({ focus, toggleFocus }: focusmodeInterface) {
  const pathname = usePathname();

  if (
    pathname
      .split("/")
      .filter((x) => x)
      .includes("surveys")
  ) {
    return (
      <Paper
        className={styles["focus-mode-div"]}
        pos={"fixed"}
        p={10}
        bottom={5}
        right={5}
        w="50px"
        h={"50px"}
        withBorder
        radius={"50%"}
        shadow={"sm"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
        }}
        onClick={() => toggleFocus(!focus)}
        bg="var(--tertiary-color)"
      >
        {focus ? (
          <IconMaximizeOff style={{ color: "var(--primary-color)" }} />
        ) : (
          <IconMaximize style={{ color: "var(--primary-color)" }} />
        )}
      </Paper>
    );
  } else {
    return null;
  }
}
