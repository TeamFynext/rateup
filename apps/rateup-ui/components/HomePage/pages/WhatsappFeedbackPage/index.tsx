import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import CompaniesUsingRateup from "../Home/CompaniesUsingRateup";
import HeroSection from "./HeroSection";
import HowRateupCanHelp from "./HowRateupCanHelp";
import styles from "./WhatsappFeedbackPage.module.css";
import WhyTraditionalMethodsDontWork from "./WhyTraditionalMethodsDontWork";

const cx = classNames.bind(styles);

function WhatsappFeedbackPage() {
  return (
    <Stack
      className={cx("whatsapp-feedback-page-root-div")}
      style={{ fontFamily: `var(--font-rubik)` }}
    >
      <HeroSection />
      <CompaniesUsingRateup className={cx("companies-using-rateup-root-div")} />
      <WhyTraditionalMethodsDontWork />
      <HowRateupCanHelp />
    </Stack>
  );
}

export default WhatsappFeedbackPage;
