import { Container, Flex } from "@mantine/core";
import Header from "../components/Header";
import BookADemoSection from "../components/BookADemoSection";
import Footer from "../components/Footer";
import styles from "./LandingPageLayout.module.css";
import { lexend } from "../../../utils/fonts";
import { useRouter } from "next/router";

function LandingPageLayout({ children, className = "" }) {
  const router = useRouter();
  const { pathname } = router;
  const requiredClassName = `${styles["home-page-container"]} ${className} ${lexend.variable}`;
  return (
    <div className={requiredClassName}>
      {/* The header will be rendered in Herosection of /components/Hompage/Home.tsx component for "/" path */}
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
