import { Group, GroupProps, Tooltip } from "@mantine/core";
import {
  IconTriangleFilled,
  IconTriangleInvertedFilled,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { SortType } from "../../types/enums";

interface SortableFieldProps {
  sort?: any;
  sortKey: string;
  setSort: any;
}
export function SortableField({
  sort,
  sortKey,
  setSort,
  ...props
}: SortableFieldProps & GroupProps) {
  let icon;
  const { children, style, ...rest } = props;
  const translations = useTranslations();
  if (sort.sortKey === sortKey) {
    switch (sort.sortType) {
      case SortType.ASC:
        icon = <IconTriangleFilled size={14} />;
        break;
      case SortType.DESC:
        icon = <IconTriangleInvertedFilled size={14} />;
        break;
    }
  }
  return (
    <Tooltip label={translations("Click to sort by field")} openDelay={1000}>
      <Group
        wrap="nowrap"
        gap={"xs"}
        onClick={() => {
          setSort({
            sortKey,
            sortType:
              sort.sortType === SortType.ASC ? SortType.DESC : SortType.ASC,
          });
        }}
        style={{
          cursor: "pointer",
          ...style,
        }}
        className="col"
        {...rest}
      >
        {children}
        {icon}
      </Group>
    </Tooltip>
  );
}
