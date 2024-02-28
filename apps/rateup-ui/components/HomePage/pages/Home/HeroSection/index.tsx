import { Flex, Title, Text } from "@mantine/core";
import styles from "./HeroSection.module.css";
import BookDemoContactForm from "../../../components/BookDemoContactForm";
import Header from "../../../components/Header";
import Image from "next/image";
import { imagePath } from "../../constants";

function HeroSection() {
  return (
    <div className={`${styles["hero-section-wrapper"]}`}>
      <Flex
        direction={"column"}
        justify={"center"}
        align={"center"}
        className={styles["hero-section-container"]}
      >
        <h1 className={styles["hero-section-heading"]}>
          <span>
            Let's Start This Transformational Journey Today With RateUp,
          </span>
          <span>The Customer Experience Platform!</span>
        </h1>
        <p className={styles["hero-section-para"]}>
          <span>
            It's about creating a lasting impact on your customers and making
          </span>
          <span>
            them feel valued. Let's start this transformational journey today!
          </span>
        </p>
        <BookDemoContactForm
          buttonProps={{
            whiteBackgroundGradientText: true,
          }}
        />
      </Flex>

      <div className={styles["image-container"]}>
        <Image
          priority
          className={styles["dashboard-screens-UI-img"]}
          alt="Dashboard screens UI"
          src={`${imagePath}/homepage/hero-section-dashboard-screens-ui.png`}
          width={2619}
          height={774}
        />
      </div>
    </div>
  );
}

export default HeroSection;
