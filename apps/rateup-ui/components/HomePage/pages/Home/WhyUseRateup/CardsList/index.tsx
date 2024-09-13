import { Flex } from "@mantine/core";
import classNames from "classnames/bind";

import Card from "../Card";
import styles from "./CardsList.module.css";

const cx = classNames.bind(styles);

type Card = {
  id: string;
  heading: string;
  description: string;
  imageUrl: string;
  width: number;
  height: number;
  alt: string;
};

type CardsListProps = {
  cardsData: Card[];
  className?: string;
};

function CardsList({ cardsData, className = "" }: CardsListProps) {
  return (
    <Flex className={cx("cards-list", "cards-list", className)}>
      {cardsData.map(({ id, ...rest }) => {
        return <Card key={id} {...rest} />;
      })}
    </Flex>
  );
}

export default CardsList;
