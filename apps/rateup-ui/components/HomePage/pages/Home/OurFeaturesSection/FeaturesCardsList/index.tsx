import { Grid } from "@mantine/core";
import FeatureCard from "../FetaureCard";
import { features } from "./features";
import styles from "./FeaturesCardsList.module.css";

function FeaturesCardsList() {
  return (
    <Grid
      gutter={{ base: "1.2rem", md: "1.5rem", xl: "2rem" }}
      className={styles["featues-cards-list-div"]}
    >
      {features.map(({ id, ...remainingProps }) => {
        return <FeatureCard key={id} {...remainingProps} />;
      })}
    </Grid>
  );
}

export default FeaturesCardsList;
