import { IconChevronDown } from "@tabler/icons-react";
import { Menu, Button } from "@mantine/core";
import { SurveyTypeFilters } from "../../../types/enums";

export function SurveyTypeFilter({ filterParam, setFilterParam }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Button
          variant="outline"
          color="rgba(13, 13, 13, 1)"
          radius="xl"
          rightSection={<IconChevronDown size="1rem" />}
        >
          Filter
        </Button>
      </Menu.Target>

      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          color={filterParam === SurveyTypeFilters.All && "blue"}
          onClick={() => setFilterParam(SurveyTypeFilters.All)}
        >
          {SurveyTypeFilters.All}
        </Menu.Item>

        <Menu.Item
          color={filterParam === SurveyTypeFilters.Web && "blue"}
          onClick={() => setFilterParam(SurveyTypeFilters.Web)}
        >
          {SurveyTypeFilters.Web}
        </Menu.Item>

        <Menu.Item
          color={filterParam === SurveyTypeFilters.WhatsApp && "blue"}
          onClick={() => setFilterParam(SurveyTypeFilters.WhatsApp)}
        >
          {SurveyTypeFilters.WhatsApp}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
