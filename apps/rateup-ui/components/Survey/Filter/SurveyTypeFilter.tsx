import { Button, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import { SurveyTypeFilters } from "../../../types/enums";

export function SurveyTypeFilter({ filterParam, setFilterParam }) {
  return (
    <Menu shadow="md" width={120}>
      <Menu.Target>
        <Button
          variant="outline"
          color="#3F5BA9"
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
          style={{
            fontWeight:
              filterParam === SurveyTypeFilters.All ? "bold" : "normal",
          }}
          color={filterParam === SurveyTypeFilters.All && "blue"}
          onClick={() => setFilterParam(SurveyTypeFilters.All)}
        >
          {SurveyTypeFilters.All}
        </Menu.Item>

        <Menu.Item
          style={{
            fontWeight:
              filterParam === SurveyTypeFilters.Web ? "bold" : "normal",
          }}
          color={filterParam === SurveyTypeFilters.Web && "blue"}
          onClick={() => setFilterParam(SurveyTypeFilters.Web)}
        >
          {SurveyTypeFilters.Web}
        </Menu.Item>

        {/* <Menu.Item
          color={filterParam === SurveyTypeFilters.WhatsApp && "blue"}
          onClick={() => setFilterParam(SurveyTypeFilters.WhatsApp)}
        >
          {SurveyTypeFilters.WhatsApp}
        </Menu.Item> */}

        <Menu.Item
          style={{
            fontWeight:
              filterParam === SurveyTypeFilters.WhatsAppFlow
                ? "bold"
                : "normal",
          }}
          color={filterParam === SurveyTypeFilters.WhatsAppFlow && "green"}
          onClick={() => setFilterParam(SurveyTypeFilters.WhatsAppFlow)}
        >
          {SurveyTypeFilters.WhatsAppFlow}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
