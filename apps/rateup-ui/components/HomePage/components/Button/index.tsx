import React from "react";
import { Button as MantineButton, Text } from "@mantine/core";
import MotionButtonGesture from "../MotionButtonGesture";
import styles from "./Button.module.css";
import commonStyles from "../../index.module.css";

type ButtonProps = {
  whiteBackgroundGradientText?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
  leftSection?: React.ReactNode;
};

function Button({
  whiteBackgroundGradientText,
  children,
  type,
  style,
  onClick,
  className,
  leftSection,
}: ButtonProps) {
  return (
    <MotionButtonGesture>
      <MantineButton
        className={`${styles["button"]} ${
          whiteBackgroundGradientText
            ? styles["white-background-gradient-text-btn"]
            : styles["gradient-background-white-text-btn"]
        } ${className}`}
        type={type ? type : "button"}
        style={style}
        onClick={onClick}
        leftSection={leftSection}
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
    </MotionButtonGesture>
  );
}

export default Button;
