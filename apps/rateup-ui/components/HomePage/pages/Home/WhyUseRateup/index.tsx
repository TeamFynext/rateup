import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import CardsList from "./CardsList";
import styles from "./WhyUseRateup.module.css";

const cx = classNames.bind(styles);

function WhyUseRateup() {
  return (
    <Stack className={cx("why-use-rateup-root-div")}>
      <h1 className={cx("heading")}>
        Why use the RateUp platform for customer feedback management?
      </h1>
      <CardsList />
    </Stack>
  );
}

export default WhyUseRateup;
