import {
  Center,
  Flex,
  Grid,
  Group,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Tabs,
} from "@mantine/core";
import { useGetAllCollectionsByOrg } from "../../../backend/testimonials/testimonial.query";
import TestimonialSurveyCard from "../../../components/testimonial/TestimonialSurveyCard";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { useState } from "react";
import Heading from "../../../components/styled/Heading/Heading";
import { useSurveysWithQuestions } from "../../../backend/surveys/surveys.query";
import { QuestionType } from "../../../types/enums";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../../components/Button/RateupButtons";
import { IconCheck, IconPlus, IconSelector } from "@tabler/icons-react";
import { useRouter } from "next/router";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { useDisclosure } from "@mantine/hooks";
import SaveTestimonialCollection from "../../../components/testimonial/SaveTestimonialCollection";
import TestimonialCollectionCard from "../../../components/testimonial/TestimonialCollectionCard";

enum CollectionTabs {
  New = "Create New",
  Update = "Update Existing",
}
export default function () {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const {
    data: allSurveys,
    isLoading,
    isError,
  } = useSurveysWithQuestions(!!selectedTeamId);
  const surveys =
    selectedTeamId === "all" || !selectedTeamId
      ? allSurveys
      : allSurveys?.filter(
          (s: Survey) => s?.teams?.some((team) => team?.id === selectedTeamId),
        );
  let filteredSurveys = surveys?.filter(
    (s) =>
      s?.questions?.some((q: Question) => q?.type == QuestionType.Testimonial),
  );
  const router = useRouter();
  const [enableSelect, { toggle }] = useDisclosure(false);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [activeTab, setActiveTab] = useState<CollectionTabs | null>(
    CollectionTabs.New,
  );
  const [openedSave, { open: openSave, close: closeSave }] =
    useDisclosure(false);

  const { data: collections } = useGetAllCollectionsByOrg();

  let filteredCollections =
    selectedTeamId == "all"
      ? collections
      : collections?.filter((c) => c?.surveyTeamMap?.teamId == selectedTeamId);
  const [sort, { toggle: sortToggle }] = useDisclosure(false);

  filteredSurveys?.sort((a, b) =>
    sort
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  filteredCollections?.sort((a, b) =>
    sort
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <Stack>
      <StyledTabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as CollectionTabs)}
      >
        <Grid columns={12}>
          <Grid.Col span={4}>
            <Heading title="Testimonials" titleprops={{ w: "fit-content" }} />
          </Grid.Col>
          <Grid.Col span={4}>
            <Tabs.List>
              <Tabs.Tab value={CollectionTabs.New}>
                Create New Collection
              </Tabs.Tab>
              <Tabs.Tab value={CollectionTabs.Update}>
                Update your collections
              </Tabs.Tab>
            </Tabs.List>
          </Grid.Col>
          <Grid.Col span={4}>
            <Group justify={"flex-end"}>
              <RateupButtonPrimary
                onClick={sortToggle}
                title={"Sort"}
                variant="subtle"
                rightIcon={<IconSelector size="1rem" />}
              />
              <TeamSelector
                value={selectedTeamId}
                onChange={(teamId) => setSelectedTeamId(teamId)}
                enableAll={true}
              />
            </Group>
          </Grid.Col>
        </Grid>

        <Tabs.Panel value={CollectionTabs.New} p={"xl"}>
          <Stack gap={5}>
            <Center>
              <RateupButtonBlue
                title="Select Survey"
                rightIcon={<IconPlus />}
                onClick={toggle}
              />
            </Center>

            <Flex justify={"flex-end"} h={50}>
              {enableSelect && (
                <RateupButtonBlue
                  title="Next"
                  color="black"
                  onClick={() => {
                    openSave();
                  }}
                />
              )}
            </Flex>
            <RadioGroup value={selectedSurvey} onChange={setSelectedSurvey}>
              <SimpleGrid cols={3}>
                {filteredSurveys?.map((survey) => (
                  <Stack pos={"relative"}>
                    {enableSelect && (
                      <Radio
                        size="lg"
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          transform: "translate(50%, -50%)", // Center the button in the top right corner
                        }}
                        icon={IconCheck}
                        value={survey?.id}
                      />
                    )}
                    <TestimonialSurveyCard
                      survey={survey}
                      selectedTeamId={selectedTeamId}
                    />
                  </Stack>
                ))}
              </SimpleGrid>
            </RadioGroup>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value={CollectionTabs.Update} p={"xl"}>
          <Stack gap={"sm"}>
            <Center>
              <RateupButtonBlue
                title="Select Collections"
                rightIcon={<IconPlus />}
                onClick={toggle}
              />
            </Center>
            <Flex justify={"flex-end"} h={50}>
              {enableSelect && (
                <RateupButtonBlue
                  title="Next"
                  color="black"
                  onClick={() => {
                    router.push(`${router.pathname}/${selectedCollectionId}`);
                  }}
                />
              )}
            </Flex>
            <RadioGroup
              value={selectedCollectionId}
              onChange={setSelectedCollectionId}
            >
              <SimpleGrid cols={3}>
                {filteredCollections?.map((collection) => (
                  <Stack pos={"relative"}>
                    {enableSelect && (
                      <Radio
                        size="lg"
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          transform: "translate(50%, -50%)", // Center the button in the top right corner
                        }}
                        icon={IconCheck}
                        value={collection?.id}
                      />
                    )}
                    <TestimonialCollectionCard collection={collection} />
                  </Stack>
                ))}
              </SimpleGrid>
            </RadioGroup>
          </Stack>
        </Tabs.Panel>
        <SaveTestimonialCollection
          opened={openedSave}
          close={closeSave}
          selectedSurvey={selectedSurvey}
        />
      </StyledTabs>
    </Stack>
  );
}
