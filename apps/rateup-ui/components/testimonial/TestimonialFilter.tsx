import {
  Button,
  Chip,
  Combobox,
  Group,
  Input,
  InputBase,
  MultiSelect,
  Popover,
  Rating,
  ScrollArea,
  Select,
  Stack,
  Title,
  useCombobox,
} from "@mantine/core";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { useRouter } from "next/router";
import { useGetAllCollections } from "../../backend/testimonials/testimonial.query";
import { useContext, useEffect, useState } from "react";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import {
  IconArrowDown,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { RateupButtonSecondary } from "../Button/RateupButtons";

const TestimonialFilter = ({
  surveyId,
  selectedCollectionId,
  setSelectedCollection,
  filters,
  setFilters,
}) => {
  const { data: allCollections } = useGetAllCollections(surveyId);
  const collections = allCollections?.map((c) => ({
    value: c?.id,
    label: c?.name,
  }));
  const [allRatings, setAllRatings] = useState(true);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (allRatings) {
      setFilters({ ...filters, rating: null });
    }
  }, [allRatings]);

  return (
    <Stack>
      <ContainedSelection
        data={collections}
        value={selectedCollectionId}
        onChange={setSelectedCollection}
        placeholder="Your Collections"
      />

      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom"
        width={"target"}
      >
        <Popover.Target>
          <Button
            onClick={() => setOpened((o) => !o)}
            radius={"md"}
            variant="outline"
            justify="space-between"
            rightSection={opened ? <IconChevronUp /> : <IconChevronDown />}
          >
            Filter
          </Button>
        </Popover.Target>

        <Popover.Dropdown>
          <ScrollArea h={200}>
            <Stack>
              <Stack>
                <Title order={5}>Date</Title>
                <Chip.Group
                  value={filters?.date}
                  onChange={(value) => setFilters({ ...filters, date: value })}
                  multiple={false}
                >
                  <Chip value="new">Newest First</Chip>
                  <Chip value="old">Oldest First</Chip>
                </Chip.Group>
              </Stack>
              <Stack>
                <Stack>
                  <Group>
                    <Title order={5}>Rating</Title>
                    <Chip checked={allRatings} onChange={setAllRatings}>
                      All
                    </Chip>
                  </Group>

                  <Rating
                    value={filters.rating}
                    onChange={(value) => {
                      setFilters({ ...filters, rating: value });
                      setAllRatings(false);
                    }}
                    size={"xl"}
                    color="var(--tertiary-color)"
                  />
                </Stack>
                <Title order={5}>Testimonial Length</Title>
                <Chip.Group
                  value={filters.testimonialLength}
                  onChange={(value) =>
                    setFilters({ ...filters, testimonialLength: value })
                  }
                  multiple={false}
                >
                  <Chip value="longest">Longest to shortest</Chip>
                  <Chip value="shortest">Shortest to Longest</Chip>
                </Chip.Group>
              </Stack>
            </Stack>
          </ScrollArea>
        </Popover.Dropdown>
      </Popover>
    </Stack>
  );
};

export default TestimonialFilter;
