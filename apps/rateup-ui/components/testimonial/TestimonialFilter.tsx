import {
  Button,
  Chip,
  Group,
  Popover,
  Rating,
  ScrollArea,
  Stack,
  Title,
  Text,
  Space,
} from "@mantine/core";
import { useGetAllCollectionsByOrg } from "../../backend/testimonials/testimonial.query";
import { useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { TeamSelector } from "../input/TeamSelector";
import { TestimonialTabs } from "../../pages/dashboard/testimonial/[collectionId]";

const TestimonialFilter = ({
  selectedCollectionId,
  setSelectedCollection,
  filters,
  setFilters,
  selectedTeamId,
  setSelectedTeamId,
  activeTab,
}) => {
  const { data: allCollections } = useGetAllCollectionsByOrg();
  const collections = allCollections?.map((c) => ({
    value: c?.id,
    label: c?.name,
  }));
  const [allRatings, setAllRatings] = useState(true);

  useEffect(() => {
    if (allRatings) {
      setFilters({ ...filters, rating: null });
    }
  }, [allRatings]);
  return (
    <Stack gap={"xl"}>
      {activeTab == TestimonialTabs.Select ? (
        <TeamSelector
          value={selectedTeamId}
          onChange={(teamId) => setSelectedTeamId(teamId)}
          enableAll={true}
        />
      ) : (
        <Space h={46} />
      )}

      <Stack gap={170}>
        <Popover opened={true} position="bottom" width={"target"} zIndex={100}>
          <Popover.Target>
            <Button
              radius={"md"}
              variant="outline"
              justify="space-between"
              fw={400}
              rightSection={<IconChevronDown />}
            >
              Your Collections
            </Button>
          </Popover.Target>

          <Popover.Dropdown>
            <ScrollArea h={100}>
              <Stack>
                <Chip.Group
                  value={selectedCollectionId}
                  onChange={(value) => setSelectedCollection(value)}
                  multiple={false}
                >
                  {collections?.map((c) => (
                    <Chip value={c?.value} key={c?.value}>
                      <Text w={200}>{c?.label}</Text>
                    </Chip>
                  ))}
                </Chip.Group>
              </Stack>
            </ScrollArea>
          </Popover.Dropdown>
        </Popover>

        {activeTab != TestimonialTabs.Share && (
          <Popover
            opened={true}
            defaultOpened
            position="bottom"
            width={"target"}
            zIndex={100}
          >
            <Popover.Target>
              <Button
                radius={"md"}
                variant="outline"
                justify="space-between"
                rightSection={<IconChevronDown />}
              >
                Filter
              </Button>
            </Popover.Target>

            <Popover.Dropdown>
              <ScrollArea h={100}>
                <Stack>
                  <Stack>
                    <Title order={5}>Date</Title>
                    <Chip.Group
                      value={filters?.date}
                      onChange={(value) =>
                        setFilters({ ...filters, date: value })
                      }
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
        )}
      </Stack>
    </Stack>
  );
};

export default TestimonialFilter;
