import { Image } from "@unpic/react";

import { Badge } from "../../../ui/badge.tsx";
import { menuLabelWithText } from "../../util/menuLabelData.ts";

type MenuFoodLabelBadgeProps = {
  readonly foodLabels: string[];
  readonly label?: boolean;
};

const MenuFoodLabelBadge = ({ foodLabels = [], label = true }: MenuFoodLabelBadgeProps) => (
  <>
    {foodLabels.map((data) => {
      const icon = menuLabelWithText?.find((gr) => gr.label === data)?.image;
      return (
        <Badge key={data} variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-normal">
          {icon && <Image src={icon} alt={data} width={14} height={14} className="shrink-0" />}
          {label && data}
        </Badge>
      );
    })}
  </>
);

export default MenuFoodLabelBadge;
