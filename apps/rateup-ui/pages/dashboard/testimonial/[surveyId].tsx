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
import TestimonialSelect from "../../../components/testimonial/testimonialSelect";
import TestimonialEdit from "../../../components/testimonial/testimonialEdit";
import TestimonialShare from "../../../components/testimonial/TestimonialShare";
import TestimonialFilter from "../../../components/testimonial/TestimonialFilter";

enum TestimonialTabs {
  Select = "Select",
  Edit = "Edit",
  Share = "Share",
}
export default function () {
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(
    TestimonialTabs.Select,
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
              <Heading
                title={"Testimonials"}
                titleprops={{ tt: "capitalize" }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Tabs.List>
                <Tabs.Tab value={TestimonialTabs.Select}>Select</Tabs.Tab>
                <Tabs.Tab value={TestimonialTabs.Edit}>Edit</Tabs.Tab>
                <Tabs.Tab value={TestimonialTabs.Share}>Share</Tabs.Tab>
              </Tabs.List>
            </Grid.Col>
            <Grid.Col span={3}></Grid.Col>
          </Grid>
          <Group justify="space-between">
            <TestimonialFilter />
            <>
              <Tabs.Panel value={TestimonialTabs.Select} p={"md"}>
                <TestimonialSelect />
              </Tabs.Panel>
              <Tabs.Panel value={TestimonialTabs.Edit}>
                <TestimonialEdit />
              </Tabs.Panel>
              <Tabs.Panel value={TestimonialTabs.Share}>
                <TestimonialShare />
              </Tabs.Panel>
            </>
          </Group>
        </StyledTabs>
      </Stack>
    </>
  );
}
