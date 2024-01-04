import React from "react";
import { Badge } from "@mantine/core";
import { menuLabel } from "../../util/menuLabelData";

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
      {menuLabel.find((item) => item.value === data)?.label}
    </Badge>
  ));

  return <>{response}</>;
};

export default MenuFoodLabelBadge;
