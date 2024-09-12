import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import HeroSection from "./HeroSection";
import styles from "./QrStudioPage.module.css";
import WhatCanOrganizationsDo from "./WhatCanOrganizationsDo";

const cx = classNames.bind(styles);

function QrStudioPage() {
  return (
    <Stack
      className={`${cx("qr-studio-page-root-div")}`}
      style={{ fontFamily: `var(--font-rubik)` }}
    >
      <HeroSection />
      <WhatCanOrganizationsDo />
    </Stack>
  );
}

export default QrStudioPage;
