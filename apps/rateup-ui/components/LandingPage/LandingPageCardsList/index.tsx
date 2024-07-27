import { Box, Grid, GridCol } from "@mantine/core";

import LandingPageCard from "../LandingPageCard";
import styles from "./LandingPagesList.module.css";

function LandingPageCardsList({ landingPages }) {
  const jsxElementsArray = landingPages.map((landingPageObj) => {
    return <LandingPageCard key={landingPageObj?.id} {...landingPageObj} />;
  });

  return <Box className="cards-grid-global-class">{jsxElementsArray}</Box>;
}

export default LandingPageCardsList;
