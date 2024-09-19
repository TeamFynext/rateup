import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import CardsList from "../../Home/WhyUseRateup/CardsList";
import cardsData from "./cardsData";
import styles from "./WhyTraditionalMethodsDontWork.module.css";

const cx = classNames.bind(styles);

function WhyTraditionalMethodsDontWork() {
  return (
    <Stack className={cx("why-traditional-methods-dont-work-root-div")}>
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        Why traditional{" "}
        <span className={cx("blue-span")}>
          customer feedback collection methods
        </span>{" "}
        don't work?
      </h1>
      <Stack className={cx("cards-list-container")}>
        <CardsList
          className={cx("why-traditional-methods-dont-work-cards-list")}
          cardsData={cardsData}
        />
      </Stack>
    </Stack>
  );
}

export default WhyTraditionalMethodsDontWork;
