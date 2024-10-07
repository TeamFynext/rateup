import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./BenefitsForBusiness.module.css";
import { cardsData } from "./cardsData";

const cx = classNames.bind(styles);

function BenefitsForBusiness() {
  return (
    <Stack
      component={"section"}
      className={cx(
        "benefits-for-business-root-div",
        "landing-page-section-root-common-styles",
      )}
    >
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        Benefits for Business
      </h1>

      <Box className={cx("cards-container", "cards-grid-global-class")}>
        {cardsData.map(({ id, image, text }) => {
          return (
            <Stack className={cx("card")} key={id}>
              {image}
              {text}
            </Stack>
          );
        })}
      </Box>
    </Stack>
  );
}

export default BenefitsForBusiness;
