"use client";

import { Paper, useMantineTheme } from "@mantine/core";

import classes from "../../TakeSurvey.module.css";

export default function FormPaperLayout(props: any) {
  const theme = useMantineTheme();
  return (
    <Paper
      {...props}
      h={"fit-content"}
      shadow="sm"
      className={classes.inputBox}
      style={{
        borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
      }}
    >
      {props.children}
    </Paper>
  );
}
