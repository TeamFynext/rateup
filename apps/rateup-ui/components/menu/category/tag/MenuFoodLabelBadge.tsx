import React from "react";
import { Badge, Flex, Image } from "@mantine/core";
import { menuLabelWithText } from "../../util/menuLabelData";

type MenuFoodLabelBadgeProps = {
  foodLabels: string[];
  p?: string | number;
};
const MenuFoodLabelBadge = ({
  foodLabels = [],
  p = "xs",
}: MenuFoodLabelBadgeProps) => {
  const response = foodLabels?.map((data: string) => (
    <Badge variant="light" color="blue" key={data} p={p}>
      <Flex align={"center"} h={"100%"} columnGap={5}>
        <Image
          src={menuLabelWithText?.find((gr) => gr.label === data)?.image}
          alt="it's me"
          h={15}
          w={15}
        />
        {data}
      </Flex>
    </Badge>
  ));

  return <>{response}</>;
};

export default MenuFoodLabelBadge;
