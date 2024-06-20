import { Box, Grid, GridCol } from "@mantine/core";
import styles from "./LandingPagesList.module.css";
import LandingPageCard from "../LandingPageCard";

function LandingPageCardsList({ landingPages }) {
  const jsxElementsArray = landingPages.map((landingPageObj) => {
    return <LandingPageCard {...landingPageObj} />;
  });

  return <Box className="cards-grid-global-class">{jsxElementsArray}</Box>;
}

export default LandingPageCardsList;
