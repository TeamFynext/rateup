import { Grid, GridCol } from "@mantine/core";
import styles from "./LandingPagesList.module.css";
import LandingPageCard from "../LandingPageCard";

function LandingPageCardsList({ landingPages }) {
  const jsxElementsArray = landingPages.map((landingPageObj) => {
    return (
      <Grid.Col key={landingPageObj?.id} span={{ base: 12, sm: 6, md: 4 }}>
        <LandingPageCard {...landingPageObj} />
      </Grid.Col>
    );
  });

  return <Grid>{jsxElementsArray}</Grid>;
}

export default LandingPageCardsList;
