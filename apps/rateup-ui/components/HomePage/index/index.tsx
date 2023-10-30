import { Container } from "@mantine/core";
import Header from "../Header";
import HeroSection from "../HeroSection";
import OurSolutionsSection from "../OursolutionsSection";
import OurFeaturesSection from "../OurFeaturesSection";
import Banner from "../Banner";
import TestimonialsSection from "../TestimonialsSection";
import BookADemoSection from "../BookADemoSection";
import Footer from "../Footer";
import styles from "./index.module.css";

export function HomePage() {
  return (
    <div className={styles["home-page-container"]}>
      <Container fluid mx={"7%"} p={0}>
        <Header />
        <HeroSection />
        <OurSolutionsSection />
        <OurFeaturesSection />
        <Banner />
        <TestimonialsSection />
        <BookADemoSection />
        <Footer />
      </Container>
    </div>
  );
}
