import { Box } from "@mantine/core";
import classNames from "classnames/bind";

import Card from "../Card";
import { cardsData } from "../cardsData";
import styles from "./CardsList.module.css";

const cx = classNames.bind(styles);

function CardsList() {
  return (
    <Box className={cx("cards-list-div")}>
      {cardsData.map((cardObj, index) => {
        return (
          <Card
            className={cx(`card-${index + 1}`)}
            key={cardObj?.id}
            {...cardObj}
          />
        );
      })}
    </Box>
  );
}

export default CardsList;
