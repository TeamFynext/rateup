import { Container, Flex } from "@mantine/core";
import Header from "../components/Header";
import BookADemoSection from "../components/BookADemoSection";
import Footer from "../components/Footer";
import styles from "./LandingPageLayout.module.css";

function LandingPageLayout({ children, className = "" }) {
  return (
    <div className={`${styles["home-page-container"]} ${className}`}>
      <Header />

      <Container
        className={`${styles["home-page-mantine-container"]} home-page-mantine-container`}
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
