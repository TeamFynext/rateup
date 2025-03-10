import Image from "next/image";

import { imagesPath } from "../../../constants";
import styles from "./HeroSection.module.css";

function HeroSection() {
  return (
    <div className={styles["hero-section-container"]}>
      <div className={styles["text-container"]}>
        <h1
          className={`${styles["about-us-h1"]}`}
          style={{
            fontWeight: 700,
          }}
        >
          We&#8217;re Rateup
        </h1>
        <p
          className={`${styles["empowering-business-text"]}`}
          style={{
            fontWeight: 500,
          }}
        >
          <span>Empowering businesses with insights to create</span>
          <span>exceptional customer experiences.</span>
        </p>
      </div>
    </div>
  );
}

export default HeroSection;
