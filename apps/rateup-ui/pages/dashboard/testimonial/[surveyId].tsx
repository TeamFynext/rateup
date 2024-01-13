import { useEffect, useState } from "react";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import {
  Button,
  Container,
  Flex,
  Grid,
  Group,
  MultiSelect,
  SimpleGrid,
  Stack,
  Tabs,
  UnstyledButton,
} from "@mantine/core";
import Heading from "../../../components/styled/Heading/Heading";
import {
  RateupButtonBlue,
  RateupIconButton,
} from "../../../components/Button/RateupButtons";
import {
  IconEdit,
  IconHtml,
  IconPencil,
  IconRestore,
  IconTrash,
} from "@tabler/icons-react";
import { IconSwipe } from "@tabler/icons";
import TestimonialCard from "../../../components/testimonial/TestimonialCard";
import { ContainedSelection } from "../../../components/input/ContainedInput/ContainedInput";
import {
  useSurvey,
  useSurveys,
  useSurveysByTeam,
} from "../../../backend/surveys/surveys.query";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import {
  getFilteredResponsesUsingTeam,
  mergeResponsesFromTeams,
} from "../../../utils/team/surveyTeam";
import { QuestionType } from "../../../types/enums";
import { useTestimonialSurveys } from "../../../backend/testimonials/testimonial.query";
import { useRouter } from "next/router";

enum TestimonialTabs {
  Review = "Review",
  Published = "Published",
}
export default function () {
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(
    TestimonialTabs.Review,
  );
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [filterTeams, setFilterTeams] = useState([]);
  const {
    data: teamWiseResponses,
    error: responseFetchError,
    isLoading: isLoading,
  } = useAllResponses(surveyId);
  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);
  const teamsData = survey?.teams?.map((team) => ({
    value: team.id,
    label: team.name,
  }));
  console.log("teamWiseResponses", teamWiseResponses);
  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );
  const { mergedResponses, noofResponses } = mergeResponsesFromTeams(
    filteredResponsesByTeam,
  );
  console.log("mergedResponses", mergedResponses);
  const filteredResponses = mergedResponses?.map((response) => {
    const responseArray = response.responses.filter(
      (res) => res.type == QuestionType.Testimonial,
    );
    console.log("response", response);
  });
  return (
    <>
      <Stack p={"lg"}>
        <StyledTabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as TestimonialTabs)}
        >
          <Grid columns={12}>
            <Grid.Col span={3}>
              <MultiSelect
                radius={"10px"}
                searchable
                clearable
                data={teamsData}
                onChange={setFilterTeams}
                placeholder={filterTeams.length > 0 ? "" : "All Teams"}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Tabs.List>
                <Tabs.Tab value={TestimonialTabs.Review}>Review</Tabs.Tab>
                <Tabs.Tab value={TestimonialTabs.Published}>Published</Tabs.Tab>
              </Tabs.List>
            </Grid.Col>
            <Grid.Col span={3}></Grid.Col>
          </Grid>

          <Tabs.Panel value={TestimonialTabs.Review} p={"md"}>
            <Stack>
              <Flex justify={"space-between"}>
                <Heading
                  title={"Testimonials"}
                  titleprops={{ tt: "capitalize" }}
                />
                <Group gap={"xs"}>
                  <RateupButtonBlue
                    title="Edit"
                    leftIcon={<IconPencil size={18} />}
                    variant={"subtle"}
                    onClick={() => {}}
                    pl="xs"
                    pr="xs"
                  />
                  <RateupButtonBlue
                    title="Embed"
                    leftIcon={<IconHtml size={18} />}
                    variant={"subtle"}
                    onClick={() => {}}
                    pl="xs"
                    pr="xs"
                  />
                  <RateupButtonBlue
                    title="Delete"
                    leftIcon={<IconTrash size={18} />}
                    variant={"subtle"}
                    onClick={() => {}}
                    pl="xs"
                    pr="xs"
                  />
                  <RateupButtonBlue
                    title="Restore"
                    leftIcon={<IconRestore size={18} />}
                    variant={"subtle"}
                    onClick={() => {}}
                    pl="xs"
                    pr="xs"
                  />
                  <RateupButtonBlue
                    title="Swap"
                    leftIcon={<IconSwipe size={18} />}
                    variant={"subtle"}
                    onClick={() => {}}
                    pl="xs"
                    pr="xs"
                  />
                </Group>
              </Flex>
            </Stack>
            <SimpleGrid cols={3} spacing={"xl"} mt={"lg"}>
              <TestimonialCard />
              <TestimonialCard />
              <TestimonialCard />
              <TestimonialCard />
            </SimpleGrid>
          </Tabs.Panel>
          <Tabs.Panel value={TestimonialTabs.Published}>
            <>published</>
          </Tabs.Panel>
        </StyledTabs>
      </Stack>
    </>
  );
}
