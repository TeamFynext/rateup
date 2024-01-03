import HeroSection from "./HeroSection";
import styles from "./About.module.css";

function AboutUs() {
  return (
    <div className={styles["about-us-container"]}>
      <HeroSection />
    </div>
  );
}

export default AboutUs;
