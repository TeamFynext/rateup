import { Button as MantineButton, Text } from "@mantine/core";
import styles from "./Button.module.css";
import commonStyles from "../../index/index.module.css";
import React from "react";

type ButtonProps = {
  whiteBackgroundGradientText?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
};

function Button({ whiteBackgroundGradientText, children, type }: ButtonProps) {
  return (
    <MantineButton
      className={`${styles["button"]} ${
        whiteBackgroundGradientText
          ? styles["white-background-gradient-text-btn"]
          : styles["gradient-background-white-text-btn"]
      }`}
      type={type ? type : "button"}
    >
      <Text
        inherit
        span
        className={`${
          whiteBackgroundGradientText ? commonStyles["gradient-text"] : ""
        }`}
      >
        {children}
      </Text>
    </MantineButton>
  );
}

export default Button;
