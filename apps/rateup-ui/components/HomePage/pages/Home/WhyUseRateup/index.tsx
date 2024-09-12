import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";

import CardsList from "./CardsList";
import styles from "./WhyUseRateup.module.css";

const cx = classNames.bind(styles);

function WhyUseRateup() {
  return (
    <Stack className={cx("why-use-rateup-root-div")}>
      <h1 className={cx("heading")}>
        Why use the RateUp platform for{" "}
        <LightBlueGradientBg className={cx("shape-bg-span")}>
          customer feedback management?
        </LightBlueGradientBg>
      </h1>
      <CardsList />
    </Stack>
  );
}

export default WhyUseRateup;
