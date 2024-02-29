import Image from "next/image";
import { lexend700, lexend500 } from "../../../../../utils/fonts";
import styles from "./HeroSection.module.css";
import { imagesPath } from "../../../constants";

function HeroSection() {
  return (
    <div className={styles["hero-section-container"]}>
      <div className={styles["text-container"]}>
        <h1 className={`${lexend700.className} ${styles["about-us-h1"]}`}>
          We&#8217;re Rateup
        </h1>
        <p
          className={`${styles["empowering-business-text"]} ${lexend500.className}`}
        >
          <span>Empowering businesses with insights to create</span>
          <span>exceptional customer experiences.</span>
        </p>
      </div>

      <div className={styles["image-container"]}>
        <picture>
          <source
            srcSet={`${imagesPath}/about-us-page/hero-section/about-us-hero-section-photo.webp`}
            type="image/webp"
          />
          <Image
            src={`${imagesPath}/about-us-page/hero-section/about-us-hero-section-photo.png`}
            alt="Team Group Photograph"
            width={3693}
            height={1368}
            priority={true}
          />
        </picture>
      </div>
    </div>
  );
}

export default HeroSection;
