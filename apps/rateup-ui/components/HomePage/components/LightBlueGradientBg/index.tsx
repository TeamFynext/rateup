import { Box } from "@mantine/core";
import styles from "./LightBlueGradientBg.module.css";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

function LightBlueGradientBg({
  children,
  className = "",
  displayInline = false,
}) {
  return (
    <span
      className={`${cx("light-blue-gradient-bg-div", { displayInline })} ${className}`}
    >
      {children}
    </span>
  );
}

export default LightBlueGradientBg;
