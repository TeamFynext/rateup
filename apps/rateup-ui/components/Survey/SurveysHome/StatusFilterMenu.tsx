import { Button, Menu, Tooltip } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function StatusFilterMenu({ filterParam, setFilterParam }) {
  const translations = useTranslations();
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Tooltip
          label={translations("Status") ?? "Status"}
          withArrow
          position="top"
        >
          <Button
            variant="outline"
            color="#3F5BA9"
            radius="xl"
            rightSection={<IconChevronDown size="1rem" />}
            tt={"capitalize"}
            style={{ minWidth: 110 }}
          >
            {translations(filterParam) ?? filterParam}
          </Button>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          color={filterParam === "all" && "blue"}
          onClick={() => setFilterParam("all")}
        >
          {translations("All")}
        </Menu.Item>

        <Menu.Item
          color={filterParam === "active" && "green"}
          onClick={() => setFilterParam("active")}
        >
          {translations("Active")}
        </Menu.Item>

        <Menu.Item
          color={filterParam === "paused" && "yellow"}
          onClick={() => setFilterParam("paused")}
        >
          {translations("Paused")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
