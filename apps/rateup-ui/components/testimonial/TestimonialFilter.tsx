import { useEffect, useState } from "react";

import {
  ActionIcon,
  Button,
  Divider,
  Group,
  MultiSelect,
  Paper,
  Radio,
  Rating,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { IconRestore } from "@tabler/icons-react";
import { produce } from "immer";
import { useTranslations } from "next-intl";

import { useTeamsByUser } from "../../backend/team/team.query";
import { useGetAllTestimonialsByOrg } from "../../backend/testimonials/testimonial.query";
import {
  filterType,
  TestimonialTabs,
} from "../../pages/dashboard/testimonial/[collectionId]";

const TestimonialFilter = ({
  filters,
  setFilters,
  activeTab,
  setType,
}: {
  filters: filterType;
  setFilters: React.Dispatch<React.SetStateAction<filterType>>;
  activeTab: TestimonialTabs;
  setType: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data: testimonials } = useGetAllTestimonialsByOrg();
  const { data: teams } = useTeamsByUser();
  const teamMultiSelectOptions = teams?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const surveyMultiSelectOptions = testimonials
    ?.filter(({ teamId }) =>
      filters?.teams?.length > 0 ? filters?.teams?.includes(teamId) : true,
    )
    .map(({ survey }) => ({ label: survey?.name, value: survey?.id }));
  const translations = useTranslations();
  function removeDuplicates(surveyMultiSelectOptions) {
    const uniqueArray = [];
    const encounteredIds = [];
    for (let i = 0; i < surveyMultiSelectOptions?.length; i++) {
      const obj = surveyMultiSelectOptions[i];
      if (!encounteredIds.includes(obj.value)) {
        encounteredIds.push(obj.value);
        uniqueArray.push(obj);
      }
    }
    return uniqueArray;
  }

  const [allRatings, setAllRatings] = useState(true);
  const filterData = (
    type: "date" | "rating" | "surveys" | "teams" | "length",
    newValue,
  ) => {
    setFilters(
      produce((draft: filterType) => {
        draft[type as string] = newValue;
      }),
    );
    setType(type);
  };
  useEffect(() => {
    if (allRatings) {
      setFilters({ ...filters, rating: null });
    }
  }, [allRatings]);

  return (
    <ScrollAreaAutosize scrollbarSize={5}>
      <Paper radius="md" withBorder p="sm" maw={200} miw={200}>
        <Group justify="space-between" mb={2}>
          <Text size="sm" c="dimmed" fw={500}>
            {translations("Filters")}
          </Text>
          <ActionIcon
            size="sm"
            variant="light"
            onClick={() => {
              setFilters({
                date: null,
                length: null,
                rating: null,
                surveys: [],
                teams: [],
              });
              setType(null);
            }}
          >
            <IconRestore size={15} />
          </ActionIcon>
        </Group>
        <Divider />
        <Stack gap={2}>
          {activeTab == TestimonialTabs.Select && (
            <>
              <MultiSelect
                radius={"10px"}
                searchable
                clearable
                label={translations("Select Team")}
                styles={{ label: { fontSize: 12 } }}
                data={teamMultiSelectOptions}
                value={filters?.teams}
                onChange={(value) => filterData("teams", value)}
                placeholder={
                  filters?.teams?.length > 0 ? "" : translations("All Teams")
                }
              />
              <MultiSelect
                radius={"10px"}
                searchable
                clearable
                label={translations("Select survey")}
                styles={{ label: { fontSize: 12 } }}
                data={removeDuplicates(
                  surveyMultiSelectOptions as {
                    label: string;
                    value: string;
                  }[],
                )}
                value={filters?.surveys}
                onChange={(value) => filterData("surveys", value)}
                placeholder={
                  filters?.teams?.length > 0 ? "" : translations("All Surveys")
                }
              />
            </>
          )}
          <Stack gap={"sm"}>
            {activeTab != TestimonialTabs.Share && (
              <>
                <Divider label={translations("Date")} labelPosition="left" />
                <Radio.Group
                  onChange={(value) => filterData("date", value)}
                  value={filters?.date}
                >
                  <Group>
                    <Radio
                      label={translations("newest")}
                      value="new"
                      size="xs"
                      styles={{ label: { fontSize: 12 } }}
                    />
                    <Radio
                      label={translations("older")}
                      value="old"
                      size="xs"
                      styles={{ label: { fontSize: 12 } }}
                    />
                  </Group>
                </Radio.Group>
                <Divider label={translations("Length")} labelPosition="left" />
                <Radio.Group
                  onChange={(value) => filterData("length", value)}
                  value={filters?.length}
                >
                  <Group>
                    <Radio
                      label={translations("longest")}
                      value="longest"
                      size="xs"
                      styles={{ label: { fontSize: 12 } }}
                    />
                    <Radio
                      label={translations("shortest")}
                      value="shortest"
                      size="xs"
                      styles={{ label: { fontSize: 12 } }}
                    />
                  </Group>
                </Radio.Group>
                <Divider
                  label={
                    <Group gap={"xs"}>
                      <Text size="xs" c="dimmed">
                        {translations("Rating")}
                      </Text>
                      <Button
                        size="compact-xs"
                        onClick={() => filterData("rating", null)}
                        variant="light"
                      >
                        {translations("All")}
                      </Button>
                    </Group>
                  }
                  labelPosition="left"
                />
                <Group gap={2}>
                  <Rating
                    value={filters?.rating}
                    onChange={(value) => filterData("rating", value)}
                    size={"lg"}
                  />
                </Group>
              </>
            )}
          </Stack>
        </Stack>
      </Paper>
    </ScrollAreaAutosize>
  );
};

export default TestimonialFilter;
