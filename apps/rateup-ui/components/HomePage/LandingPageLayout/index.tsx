import { Container, Flex } from "@mantine/core";
import Header from "../components/Header";
import BookADemoSection from "../components/BookADemoSection";
import Footer from "../components/Footer";
import styles from "./LandingPageLayout.module.css";

function LandingPageLayout({ children }) {
  return (
    <div className={styles["home-page-container"]}>
      <Container
        className={styles["home-page-mantine-container"]}
        size={"120rem"}
      >
        <Header />
        {children}
        <BookADemoSection />
        <Footer />
      </Container>
    </div>
  );
}

export default LandingPageLayout;
