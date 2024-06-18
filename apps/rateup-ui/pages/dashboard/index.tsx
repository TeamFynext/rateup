import {
  RateupButtonBlue,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../components/Button/RateupButtons";
import {
  Group,
  Title,
  Text,
  Container,
  Stack,
  SimpleGrid,
  ActionIcon,
  Blockquote,
  Flex,
  Box,
} from "@mantine/core";
import { Tooltip as MantineTooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Loading from "../../components/Page/Loading";
import { useUser } from "../../context/UserContext";
import {
  IconBrandWhatsapp,
  IconCheckupList,
  IconPageBreak,
  IconPlus,
  IconSelector,
  IconSocial,
  IconReload,
  IconSquareRoundedPlusFilled,
  IconShoppingCart,
  IconCloudExclamation,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import {
  useAllSurveysSummary,
  useSurveysSummary,
} from "../../backend/surveys/surveys.query";
import ActiveSurveyCard from "../../components/Dashboard/ActiveSurveyCard";
import { SurveyTypeFilter } from "../../components/Survey/Filter/SurveyTypeFilter";
import { SurveyTypeFilters } from "../../types/enums";
import { IconRefresh } from "@tabler/icons-react";
import classes from "./dashboard.module.css";
import { notifications } from "@mantine/notifications";
import FormModalLayout from "../../components/Modal/FormModalLayout";
import PaperLayout from "../../components/styled/Layouts/PaperLayout";
import NothingFound from "../../components/NothingFound/NothingFound";
import Heading from "../../components/styled/Heading/Heading";
import { lexend400, lexend500 } from "../../utils/fonts";
import { getFormattedResponseForAreaGraph } from "../../utils/response";
import OverallResponseGraph from "../../components/Graph/OverallResponseGraph";

export default function DashboardHome() {
  const router = useRouter();
  const { user } = useUser();
  const [sort, setSort] = useState(true);
  const [filterParam, setFilterParam] = useState(SurveyTypeFilters.All);
  const [opened, { open, close }] = useDisclosure(false);
  const [timePeriod, setTimePeriod] = useState("daily");
  const {
    isLoading: isLoadingSummary,
    error: summaryError,
    data: surveysSummary,
    refetch,
    fetchStatus,
    isError,
    isRefetching,
    isInitialLoading,
    isRefetchError,
  } = useSurveysSummary() as {
    isLoading: boolean;
    error: any;
    data: SurveySummaryData | any;
    refetch: any;
    fetchStatus: any;
    isError: boolean;
    isRefetching: boolean;
    isInitialLoading: boolean;
    isRefetchError: boolean;
  };
  const { data: allSurveysSummary } = useAllSurveysSummary();
  useEffect(() => {
    if (isRefetching) {
      notifications.show({
        id: "refetch-data",
        loading: true,
        title: "Refreshing data",
        message: "Hold on, your data is getting updated..",
        autoClose: 2000,
        withCloseButton: true,
      });
    }
  }, [isRefetching]);

  useEffect(() => {
    if (fetchStatus === "idle" && !isRefetching) {
      notifications.update({
        id: "refetch-data",
        title: "Data Refreshed",
        message: "Your data has been successfully updated.",
        color: "teal",
        icon: <IconCheck size={16} />,
        autoClose: 2000,
      });
    } else if (isRefetchError) {
      notifications.update({
        id: "refetch-data",
        title: "Error",
        message: "There was an issue updating your data. Please try again.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
        autoClose: 4000,
      });
    }
  }, [fetchStatus, isRefetching, isRefetchError]);

  const allResponses = [];
  allSurveysSummary?.surveys?.forEach((survey) => {
    survey?.teams?.forEach((team) => {
      allResponses.push(...team?.responses);
    });
  });

  const filteredData = getFormattedResponseForAreaGraph(
    allResponses,
    timePeriod,
  );

  const createModalContent: Array<{
    Icon: any;
    title: string;
    routerPath: string;
  }> = [
    {
      Icon: IconCheckupList,
      title: "Web Survey",
      routerPath: "/dashboard/surveys?action=create",
    },
    {
      Icon: IconSocial,
      title: "Team",
      routerPath: "/dashboard/teams?action=create",
    },
    {
      Icon: IconBrandWhatsapp,
      title: "WhatsApp Flows",
      routerPath: "/dashboard/whatsapp?action=create",
    },
    {
      Icon: IconPageBreak,
      title: "Landing Page",
      routerPath: "/dashboard/landingPages?action=create",
    },
  ];

  const summaryArray: Array<{
    summaryname: string;
    summaryvalue: string;
    route: string;
  }> = [
    {
      summaryname: "Active Surveys",
      summaryvalue: surveysSummary?.activeSurveysCount ?? 0,
      route: "/dashboard/surveys",
    },
    {
      summaryname: "Total Surveys",
      summaryvalue: surveysSummary?.totalSurveysCount ?? 0,
      route: "/dashboard/surveys",
    },
    {
      summaryname: "Total Teams",
      summaryvalue: surveysSummary?.totalTeamsCount ?? 0,
      route: "/dashboard/teams",
    },
  ];

  // Filtering surveys based on the filterParam state
  const filteredSurveys = surveysSummary?.surveys
    ?.filter((s) => s.active === true && s.isPublished === true)
    ?.filter((s) => {
      if (filterParam === SurveyTypeFilters.Web) {
        return s.type === "web";
      } else if (filterParam === SurveyTypeFilters.WhatsApp) {
        return s.type === "whatsapp";
      } else if (filterParam === SurveyTypeFilters.WhatsAppFlow) {
        return s.type === "waFlow";
      } else {
        return true;
      }
    })
    ?.sort((a, b) =>
      sort
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return (
    <>
      {user && !isLoadingSummary && !isError && !surveysSummary?.error ? (
        <Stack gap={"4rem"}>
          <Group
            className={classes["summary-cards-and-responses-graph-container"]}
          >
            <Stack style={{ flex: 0.3 }} miw={300} w={"100%"}>
              <RateupButtonBlue
                onClick={open}
                title={"Create"}
                leftIcon={<IconPlus size="2.2rem" />}
                size="xl"
                py="xl"
                className={lexend500.className}
                styles={{
                  root: {
                    height: "130px",
                  },
                  label: {
                    fontSize: "32px",
                    paddingLeft: "5px",
                    paddingBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                  },
                  leftIcon: {
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              />
              {summaryArray.map(
                ({ summaryname, summaryvalue, route }, index) => (
                  <PaperLayout
                    hoveractive
                    style={{ height: "105px", cursor: "pointer" }}
                    py={"xl"}
                    key={index}
                    onClick={() => router.push(route)}
                  >
                    <Stack gap={0} justify="center" h={"100%"}>
                      <Title
                        style={{ textAlign: "center", color: "#1C518E" }}
                        order={2}
                        size="36px"
                      >
                        {summaryvalue ? summaryvalue : 0}
                      </Title>
                      <Text
                        className={lexend400.className}
                        style={{ textAlign: "center" }}
                        fz="xl"
                        c="#595959"
                      >
                        {summaryname}
                      </Text>
                    </Stack>
                  </PaperLayout>
                ),
              )}
            </Stack>
            <OverallResponseGraph
              timePeriod={timePeriod}
              setTimePeriod={setTimePeriod}
              data={filteredData}
              isFetching={isRefetching}
              refetch={refetch}
            />
          </Group>
          <FormModalLayout
            centered
            opened={opened}
            onClose={close}
            title="Create new"
          >
            <Stack p={"md"}>
              {createModalContent.map(({ Icon, routerPath, title }) => (
                <PaperLayout
                  hoveractive
                  key={routerPath}
                  onClick={() => router.push(routerPath)}
                >
                  <Group align="center" gap="10">
                    <ActionIcon variant="subtle">
                      <Icon size={30} color="#595959" />
                    </ActionIcon>
                    <Text
                      style={{ textAlign: "center" }}
                      size="20px"
                      className={lexend400.className}
                      c="#595959"
                    >
                      {title}
                    </Text>
                    <Group ml={"auto"}>
                      <IconSquareRoundedPlusFilled fillOpacity={0.4} />
                    </Group>
                  </Group>
                </PaperLayout>
              ))}
            </Stack>
          </FormModalLayout>

          <Stack className={classes["surveys-filter-and-cards-container"]}>
            <PaperLayout className={classes["surveys-filter-container"]}>
              <Group justify="space-between">
                <Group align="center">
                  <Heading subtitle="Active Surveys / Flows" />
                  <Text fz="17px" mt="5px" c="gray">
                    ( {filterParam} )
                  </Text>
                  <MantineTooltip label="Refresh data">
                    <ActionIcon
                      variant="light"
                      aria-label="Settings"
                      onClick={refetch}
                    >
                      <IconRefresh
                        className={
                          fetchStatus === "!fetching" &&
                          classes.rotateInfinitely
                        }
                        style={{ width: "90%", height: "90%" }}
                        stroke={1.5}
                      />
                    </ActionIcon>
                  </MantineTooltip>
                </Group>

                <Group>
                  <SurveyTypeFilter
                    filterParam={filterParam}
                    setFilterParam={setFilterParam}
                  />

                  <RateupButtonPrimary
                    onClick={() => setSort(!sort)}
                    title={"Sort"}
                    variant="subtle"
                    rightIcon={<IconSelector size="1rem" />}
                  />
                </Group>
              </Group>
            </PaperLayout>

            <div className={classes["filtered-survey-cards-container"]}>
              {filteredSurveys.length > 0 ? (
                filteredSurveys.map((s) => (
                  <ActiveSurveyCard key={s.id} survey={s} />
                ))
              ) : (
                <NothingFound text="No data found" />
              )}
            </div>
          </Stack>
        </Stack>
      ) : !summaryError ? (
        <Loading h={300} />
      ) : (
        <Stack p="xl">
          {summaryError?.response?.data?.message === "Subscription expired" ? (
            <>
              <Blockquote color="red" icon={<IconCloudExclamation />}>
                Your don't have an active Subscription..!
              </Blockquote>
              <Text mb="lg"> </Text>
              <RateupButtonSecondary
                size="md"
                leftIcon={<IconShoppingCart />}
                title="Go to Billing Section"
                onClick={() => {
                  router.push("/dashboard/settings?activeTab=account");
                }}
              />
            </>
          ) : (
            <>
              <Text mb="lg"> An error occured..!</Text>
              <RateupButtonSecondary
                size="md"
                leftIcon={<IconReload />}
                title="Try again"
                onClick={refetch}
              />
            </>
          )}
        </Stack>
      )}
    </>
  );
}
