import { List, rem } from "@mantine/core";
import { IconCircleCheck, IconX } from "@tabler/icons-react";

export const generateListItems = (listData: string[] = []) => (
  <List
    spacing="xs"
    size="md"
    center
    icon={<IconCircleCheck style={{ width: rem(16), height: rem(16), color: "green" }} />}
  >
    {listData.map((item) => {
      const isNegative = item.startsWith("-");
      const displayName = isNegative ? item.substring(1) : item;
      return (
        <List.Item
          key={item}
          icon={isNegative && <IconX style={{ width: rem(16), height: rem(16), color: "red" }} />}
        >
          {displayName}
        </List.Item>
      );
    })}
  </List>
);
