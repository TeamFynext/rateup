import { Box, Grid, GridCol } from "@mantine/core";
import styles from "./LandingPagesList.module.css";
import LandingPageCard from "../LandingPageCard";

function LandingPageCardsList({ landingPages }) {
  const jsxElementsArray = landingPages.map((landingPageObj) => {
    return (
      <Box>
        <LandingPageCard {...landingPageObj} />
      </Box>
    );
  });

  return jsxElementsArray;
}

export default LandingPageCardsList;
