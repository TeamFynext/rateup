import { lexend500 } from "../../../../../utils/fonts";
import styles from "./OurMissionSection.module.css";

function OurMissionSection() {
  return (
    <div className={styles["our-mission-section-container"]}>
      <div className={styles["text1-container"]}>
        <h1>Our Mission</h1>
        <p>
          We are on a mission to empower businesses of all sizes with the
          insights they need to create exceptional, unforgettable{" "}
          <span>customer experiences.</span>
        </p>
      </div>
      <div className={styles["text2-container"]}>
        <p>
          <span className={`${styles["gradient-span"]} ${lexend500.className}`}>
            Empowering Businesses
          </span>
          <span>with insights to</span>
          <span>create exceptional</span>
          <span className={`${styles["gradient-span"]} ${lexend500.className}`}>
            customer experiences
          </span>
        </p>
      </div>
    </div>
  );
}

export default OurMissionSection;
