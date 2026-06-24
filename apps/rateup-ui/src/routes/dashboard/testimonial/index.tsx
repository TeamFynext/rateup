import {
  Center,
  Container,
  Flex,
  Group,
  Loader,
  ScrollAreaAutosize,
  SimpleGrid,
  Space,
  Stack,
  Tabs,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  useGetAllCollectionsByOrg,
  useGetAllTestimonialsByOrg,
} from "@/backend/testimonials/testimonial.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import SaveTestimonialCollection from "@/components/testimonial/SaveTestimonialCollection.tsx";
import TestimonialCard from "@/components/testimonial/TestimonialCard.tsx";
import TestimonialCollectionCard from "@/components/testimonial/TestimonialCollectionCard.tsx";
import { docsPath } from "@/utils/constants.ts";

import styles from "../../../components/dashboard/contacts/contacts.module.css";

export const Route = createFileRoute("/dashboard/testimonial/")({
  component: Testimonials,
});

enum TestimonailInnerTabEnum {
  TESTIMONIALS = "testimonials",
  COLLECTIONS = "collections",
}

function Testimonials() {
  const [openedSave, { open: openSave, close: closeSave }] = useDisclosure(false);
  const [activeTab, setActiveTab] = useState<TestimonailInnerTabEnum>(
    TestimonailInnerTabEnum.TESTIMONIALS,
  );
  const { data: collections, isLoading: isCollectionLoading } = useGetAllCollectionsByOrg();
  const { data: testimonials, isLoading: isTestimonialLoading } = useGetAllTestimonialsByOrg();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const filteredCollections =
    selectedTeamId == "all" ? collections : collections?.filter((c) => c?.teamId == selectedTeamId);

  const filteredTestimonials =
    selectedTeamId == "all"
      ? testimonials
      : testimonials?.filter((t) => t?.teamId === selectedTeamId);
  return (
    <Stack gap={"lg"} h="100%">
      <Flex mih={50} gap="md" justify="space-between" align="center" direction="row" wrap="wrap">
        <Group gap={"md"}>
          <RateupButtonBlue title="Create Collection" rightIcon={<IconPlus />} onClick={openSave} />
          <InfoButton docUrl={`${docsPath}/testimonial`} />
          <SaveTestimonialCollection close={closeSave} opened={openedSave} />
        </Group>
        <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} enableAll={true} />
      </Flex>
      <Tabs
        value={activeTab}
        onChange={(value: string) => setActiveTab(value as TestimonailInnerTabEnum)}
        color="var(--tertiary-color)"
      >
        <Tabs.List w={"fit-content"}>
          <Tabs.Tab value={TestimonailInnerTabEnum.TESTIMONIALS} className={styles.tabLabel}>
            <Title order={4} fw={400}>
              Testimonials
            </Title>
          </Tabs.Tab>
          <Tabs.Tab value={TestimonailInnerTabEnum.COLLECTIONS} className={styles.tabLabel}>
            <Title order={4} fw={400}>
              Collections
            </Title>
          </Tabs.Tab>
        </Tabs.List>
        <Space h="sm" />
        <ScrollAreaAutosize>
          <Tabs.Panel value={TestimonailInnerTabEnum.TESTIMONIALS} p={"sm"}>
            {isTestimonialLoading ? (
              <Center pt="xl">
                <Loader type="bars" />
              </Center>
            ) : filteredTestimonials?.length > 0 ? (
              <Group>
                {filteredTestimonials.map((testimonial) => (
                  <TestimonialCard testimonial={testimonial} key={testimonial.id} />
                ))}
              </Group>
            ) : (
              <Container mt={"7%"}>
                <NothingFound text="No Testimonials Found" />
              </Container>
            )}
          </Tabs.Panel>

          <Tabs.Panel value={TestimonailInnerTabEnum.COLLECTIONS} p={"sm"}>
            {isCollectionLoading ? (
              <Center pt="xl">
                <Loader type="bars" />
              </Center>
            ) : filteredCollections?.length > 0 ? (
              <SimpleGrid
                cols={{ base: 1, sm: 2, lg: 3 }}
                spacing={{ base: 10, sm: "xl", lg: "xl" }}
                verticalSpacing={{ base: "md", sm: "xl" }}
              >
                {filteredCollections?.map((collection) => (
                  <TestimonialCollectionCard collection={collection} key={collection?.id} />
                ))}
              </SimpleGrid>
            ) : (
              <Container mt={"7%"}>
                <NothingFound text="No Testimonial Collections Found" />
              </Container>
            )}
          </Tabs.Panel>
        </ScrollAreaAutosize>
      </Tabs>
    </Stack>
  );
}
