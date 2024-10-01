import { Box } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./LightBlueGradientBg.module.css";

const cx = classNames.bind(styles);

function LightBlueGradientBg({
  children,
  className = "",
  displayInline = false,
  withoutGradientForMobile = true,
}) {
  return (
    <span
      className={`${cx("light-blue-gradient-bg-div", { displayInline }, { withoutGradientForMobile })} ${className}`}
    >
      {children}
    </span>
  );
}

export default LightBlueGradientBg;
