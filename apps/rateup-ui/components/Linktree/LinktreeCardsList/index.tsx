import { Box, Grid, GridCol } from "@mantine/core";

import LinktreeCard from "../LinktreeCard";
import styles from "./LinktreesList.module.css";

function LinktreeCardsList({ linktrees }) {
  const jsxElementsArray = linktrees.map((linktreeObj) => {
    return <LinktreeCard key={linktreeObj?.id} {...linktreeObj} />;
  });

  return <Box className="cards-grid-global-class">{jsxElementsArray}</Box>;
}

export default LinktreeCardsList;
