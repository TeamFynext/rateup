import Image from "next/image";

import { imagesPath } from "../../../constants";
import styles from "./OurValuesSection.module.css";

function OurValuesSection() {
  return (
    <div className={styles["our-values-section-container"]}>
      <h1>
        <span>The Rateup Commitment</span>
        <span>Our Values</span>
      </h1>
      <Image
        className={styles["our-values-img"]}
        src={`${imagesPath}/about-us-page/our-values/our-values.png`}
        alt="Our Values"
        width={3313}
        height={2281}
        priority={true}
      />
    </div>
  );
}

export default OurValuesSection;
