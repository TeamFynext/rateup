import React from "react";

import { Badge, Flex, Image } from "@mantine/core";

import { menuLabelWithText } from "../../util/menuLabelData";

type MenuFoodLabelBadgeProps = {
  foodLabels: string[];
  p?: string | number;
  label?: boolean;
  fz?: string | number;
};
const MenuFoodLabelBadge = ({
  foodLabels = [],
  p = "xs",
  label = true,
  fz = 11,
}: MenuFoodLabelBadgeProps) => {
  const response = foodLabels?.map((data: string) => (
    <Badge variant="light" key={data} p={p}>
      <Flex align={"center"} h={"100%"} columnGap={5} fz={fz}>
        <Image
          src={menuLabelWithText?.find((gr) => gr.label === data)?.image}
          alt="it's menu label icon"
          h={15}
          w={15}
        />
        {label && data}
      </Flex>
    </Badge>
  ));

  return <>{response}</>;
};

export default MenuFoodLabelBadge;
