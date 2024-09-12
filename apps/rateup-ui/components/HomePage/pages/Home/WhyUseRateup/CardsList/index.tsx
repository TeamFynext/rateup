import { Flex } from "@mantine/core";
import classNames from "classnames/bind";

import Card from "../Card";
import cardsData from "../cardsData";
import styles from "./CardsList.module.css";

const cx = classNames.bind(styles);

function CardsList() {
  return (
    <Flex className={cx("cards-list")}>
      {cardsData.map(({ id, ...rest }) => {
        return <Card key={id} {...rest} />;
      })}
    </Flex>
  );
}

export default CardsList;
