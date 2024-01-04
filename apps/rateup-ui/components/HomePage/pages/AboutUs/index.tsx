import HeroSection from "./HeroSection";
import OurMissionSection from "./OurMissionSection";
import styles from "./About.module.css";
import OurValuesSection from "./OurValuesSection";

function AboutUs() {
  return (
    <div className={styles["about-us-container"]}>
      <HeroSection />
      <div className={styles["page-content"]}>
        <OurMissionSection />
        <OurValuesSection />
      </div>
    </div>
  );
}

export default AboutUs;
