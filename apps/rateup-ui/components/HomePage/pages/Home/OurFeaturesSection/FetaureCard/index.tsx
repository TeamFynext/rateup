import Image from "next/image";
import styles from "./FeatureCard.module.css";
import { Grid } from "@mantine/core";

function FeatureCard({
  imgSrc,
  imgAlt,
  imgBgColor = "#f0f0f0",
  heading,
  description,
}) {
  return (
    <Grid.Col
      span={{ base: 12, xs: 6, lg: 4 }}
      className={styles["feature-card-div"]}
    >
      <div
        className={styles["img-container"]}
        style={{
          backgroundColor: imgBgColor,
          border: `2px solid ${imgBgColor}`,
        }}
      >
        <Image src={imgSrc} alt={imgAlt} width={100} height={100} />
      </div>
      <div
        className={styles["desc-container"]}
        style={{ border: `2px solid ${imgBgColor}` }}
      >
        <h2 className={styles["feature-heading"]}>{heading}</h2>
        <p className={styles["desc-para"]}>{description}</p>
      </div>
    </Grid.Col>
  );
}

export default FeatureCard;
