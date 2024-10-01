import { Flex, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import CardsList from "./CardsList";
import styles from "./WhyUseSmartQrCode.module.css";

const cx = classNames.bind(styles);

function WhyUseSmartQRCode() {
  return (
    <Stack
      className={cx(
        "why-use-smart-qr-section-div",
        "landing-page-section-root-common-styles",
      )}
      component={"section"}
    >
      <h1 className={cx("heading", "landing-page-s-h-c")}>
        Why use smart QR codes for product packaging?
      </h1>

      <CardsList />
    </Stack>
  );
}

export default WhyUseSmartQRCode;
