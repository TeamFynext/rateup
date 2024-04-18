import { Stack, Title } from "@mantine/core";
import { solutionsList } from "./constants";
import styles from "./OurSolutionsSection.module.css";
import InteractiveSolutionDescriptions from "../../../components/InteractiveSolutionDescriptions";
import Banner from "./Banner";
import { lexend600 } from "../../../../../utils/fonts";
import { useMediaQuery } from "@mantine/hooks";
import MobileInteractiveSolutionDescriptions from "../../../components/MobileInteractiveSolutionDescriptions";
import SparklesIconWithText from "../../../components/SparklesIconWithText";
import Image from "next/image";
import { imagesPath } from "../../../constants";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";

function OurSolutionsSection() {
  return (
    <Stack id="our-solutions" className={styles["our-solutions-container"]}>
      <Title className={`${styles["section-heading"]}`}>
        <SparklesIconWithText text={"Our Solutions"} />
      </Title>

      <div className={styles["solutions-img-container"]}>
        <Image
          priority
          src={`${imagesPath}/homepage/our-solutions/our-solutions.png`}
          alt="our solutions"
          width={2376}
          height={946}
        />
      </div>

      <Banner
        className={styles["reputation-know-more-banner"]}
        text={"Ready to Elevate Your Brand? Sign Up with RateUp Today"}
      />

      <div className={styles["solution-description-and-image-list-container"]}>
        {solutionsList.map((solution) => {
          return (
            <div
              key={solution.id}
              className={`${
                styles["solution-description-and-image-container"]
              } ${
                solution.imageAsFirstElement
                  ? `${styles["image-as-first-element"]}`
                  : ""
              }`}
            >
              <div className={styles["solution-description-container"]}>
                <h1 className={styles["section-heading"]}>
                  <SparklesIconWithText text={solution.heading.badgeText} />
                  <span>{solution.heading.text}</span>
                </h1>
                <p className={styles["solution-desription-para"]}>
                  {solution.description}
                </p>
              </div>
              <div className={styles["solution-image-container"]}>
                <Image {...solution.img} />
              </div>
            </div>
          );
        })}
      </div>
      {/* <InteractiveSolutionDescriptions solutions={solutionsList} /> */}
      {/* <TrustedBy /> */}
      {/* <Banner text={"Boost Up Your Google Reviews"} /> */}
    </Stack>
  );
}

export default OurSolutionsSection;
