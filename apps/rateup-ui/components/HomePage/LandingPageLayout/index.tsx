import { ActionIcon, Container, Flex } from "@mantine/core";
import Header from "../components/Header";
import BookADemoSection from "../components/BookADemoSection";
import Footer from "../components/Footer";
import styles from "./LandingPageLayout.module.css";
import { lexend, rubik } from "../../../utils/fonts";
import classNames from "classnames/bind";
import { useWindowScroll } from "@mantine/hooks";
import { IconArrowUp } from "@tabler/icons-react";
import CookieConsentBanner from "../../Analytics/CookieConsentBanner";
import { isProduction } from "../../../utils/constants";

const cx = classNames.bind(styles);

function LandingPageLayout({ children, className = "" }) {
  const requiredClassName = cx(
    className,
    "home-page-container",
    lexend.variable,
    rubik.variable,
  );

  const [scroll, scrollTo] = useWindowScroll();
  const maxScrollY =
    typeof window !== "undefined"
      ? document.documentElement.scrollHeight -
        document.documentElement.clientHeight
      : 0;

  return (
    <div className={requiredClassName}>
      {/* The header will be rendered in Herosection of /components/Hompage/Home.tsx component for "/" path */}
      <Header />

      <Container
        className={`${cx("home-page-mantine-container")} home-page-mantine-container`}
        size={"120rem"}
      >
        {children}
      </Container>

      <BookADemoSection />
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
      {isProduction ? <CookieConsentBanner /> : null}
    </div>
  );
}

export default LandingPageLayout;
