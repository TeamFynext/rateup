import { Container, Flex } from "@mantine/core";
import Header from "../components/Header";
import BookADemoSection from "../components/BookADemoSection";
import Footer from "../components/Footer";
import styles from "./LandingPageLayout.module.css";
import { lexend, rubik } from "../../../utils/fonts";
import classNames from "classnames/bind";
const cx = classNames.bind(styles);

function LandingPageLayout({ children, className = "" }) {
  const requiredClassName = cx(
    className,
    "home-page-container",
    lexend.variable,
    rubik.variable,
  );

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
    </div>
  );
}

export default LandingPageLayout;
