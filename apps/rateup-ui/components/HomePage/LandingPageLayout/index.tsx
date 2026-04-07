"use client";

import { ActionIcon, Container } from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import { IconArrowUp } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { CookieConsent } from "@/components/ui/cookie-consent";
import { fbConsent } from "@/utils/fbpixel";
import { setGAConsent } from "@/utils/gtag";

import { isProduction } from "../../../utils/constants";
import Footer from "../components/Footer";
import Header from "../components/Header";
import styles from "./LandingPageLayout.module.css";

const cx = classNames.bind(styles);

function LandingPageLayout({ children, className = "" }) {
  const requiredClassName = cx(className, "home-page-container");

  const [scroll, scrollTo] = useWindowScroll();
  const maxScrollY =
    typeof window !== "undefined"
      ? document.documentElement.scrollHeight -
        document.documentElement.clientHeight
      : 0;

  return (
    <div className={requiredClassName}>
      <Header />

      <Container
        className={`${cx("home-page-mantine-container")} home-page-mantine-container`}
        size={"120rem"}
      >
        {children}
      </Container>
      <Footer />

      {/* Scroll to top button */}
      {scroll.y > 200 && scroll.y < maxScrollY && (
        <ActionIcon
          className={styles["scroll-to-top-btn"]}
          onClick={() => scrollTo({ y: 0 })}
        >
          <IconArrowUp width={"55%"} height={"55%"} />
        </ActionIcon>
      )}
      {isProduction ? (
        <CookieConsent
          variant="small"
          onAcceptCallback={() => {
            setGAConsent("granted");
            fbConsent("grant");
          }}
          onDeclineCallback={() => {
            setGAConsent("denied");
            fbConsent("revoke");
          }}
        />
      ) : null}
    </div>
  );
}

export default LandingPageLayout;
