import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Blockquote,
  Box,
  Group,
  Portal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAppWindow,
  IconBrandWhatsapp,
  IconCheckupList,
  IconCloudExclamation,
  IconLink,
  IconPlus,
  IconQrcode,
  IconReload,
  IconShoppingCart,
  IconSocial,
  IconSquareRoundedPlusFilled,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useAllResponseForGraph,
  useAllSurveysSummary,
  useSurveysSummary,
} from "../../backend/surveys/surveys.query";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../components/Button/RateupButtons";
import RefreshButton from "../../components/Button/RefreshButton";
import ActiveSurveyCard from "../../components/Dashboard/ActiveSurveyCard";
import SortDropdown, {
  sortData,
} from "../../components/Dashboard/SortDropDown";
import OverallResponseGraph from "../../components/Graph/OverallResponseGraph";
import FormModalLayout from "../../components/Modal/FormModalLayout";
import NothingFound from "../../components/NothingFound/NothingFound";
import Loading from "../../components/Page/Loading";
import Heading from "../../components/styled/Heading/Heading";
import PaperLayout from "../../components/styled/Layouts/PaperLayout";
import { SurveyTypeFilter } from "../../components/Survey/Filter/SurveyTypeFilter";
import DashboardTourSteps from "../../components/WelcomeTour/components/DashboardTourSteps";
import styles from "../../components/WelcomeTour/components/Tour.module.css";
import WelcomeTour from "../../components/WelcomeTour/WelcomeTour";
import { useUser } from "../../context/UserContext";
import { getDictionary } from "../../dictionaries/dictionaries";
import { SurveyType, SurveyTypeFilters } from "../../types/enums";
import { getFormattedResponseForAreaGraph } from "../../utils/response";
import classes from "./dashboard.module.css";

export default function DashboardHome() {
  const router = useRouter();
  const { translations, loadingTranslations } = useTranslations();

  const { user } = useUser();
  const [filterParam, setFilterParam] = useState(SurveyTypeFilters.All);
  const [opened, { open, close }] = useDisclosure(false);
  const [timePeriod, setTimePeriod] = useState("daily");
  const [sortOption, setSortOption] = useState("latest");
  const {
    data: allSurveysSummary,
    isError,
    error: summaryError,
    refetch,
    isLoading,
  } = useAllSurveysSummary();
  const queryClient = useQueryClient();
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: graphData, isLoading: isResponseLoading } =
    useAllResponseForGraph(timePeriod, userTimeZone);

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
      routerPath: "/dashboard/whatsapp/flows?action=create",
    },
    {
      Icon: IconQrcode,
      title: "QR Creator",
      routerPath: "/dashboard/qrCreator?action=create",
    },
    {
      Icon: IconLink,
      title: "Quick Access Links",
      routerPath: "/dashboard/quickAccessLinks?action=create",
    },
    {
      Icon: IconAppWindow,
      title: "Landing Page",
      routerPath: "/dashboard/landingPages?action=create",
    },
  ];

  const summaryArray: Array<{
    summaryname: string;
    summaryvalue: number;
    route: string;
  }> = [
    {
      summaryname: "Active Surveys",
      summaryvalue: allSurveysSummary?.activeSurveysCount ?? 0,
      route: "/dashboard/surveys",
    },
    {
      summaryname: "Total Surveys",
      summaryvalue: allSurveysSummary?.totalSurveysCount ?? 0,
      route: "/dashboard/surveys",
    },
    {
      summaryname: "Total Teams",
      summaryvalue: allSurveysSummary?.totalTeamsCount ?? 0,
      route: "/dashboard/teams",
    },
  ];

  const onSortChange = (value) => {
    setSortOption(value);
  };
  const tourSteps = DashboardTourSteps({ styles });

  // Filtering surveys based on the filterParam state
  const filteredSurveys =
    allSurveysSummary?.surveys
      ?.filter(
        (s) =>
          s.active === true &&
          (s.type === SurveyType.WaFlow || s.isPublished === true),
      )
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
      }) || [];

  // Sort the surveys based on the sortOption
  const sortedSurveys = sortData(
    SurveyTypeFilters.Web
      ? filteredSurveys.map((s) => ({ ...s, data: { name: s.title } }))
      : filteredSurveys,
    sortOption,
  );

  // Function to get class name based on summaryname
  const getClassName = (summaryname) => {
    if (summaryname === "Active Surveys") {
      return styles["active-survey-count"];
    } else if (summaryname === "Total Surveys") {
      return styles["total-survey-count"];
    } else if (summaryname === "Total Teams") {
      return styles["total-team-count"];
    }
    return "";
  };
  if (isLoading) {
    return <Loading h={300} />;
  }

  return (
    <Box m={"xs"}>
      {user && !isError ? (
        <Stack>
          <Portal target={"#navbar"}>
            <WelcomeTour steps={tourSteps} />
          </Portal>
          <Stack gap={"4rem"}>
            <Group
              className={classes["summary-cards-and-responses-graph-container"]}
            >
              <Stack style={{ flex: 0.3 }} miw={300} w={"100%"}>
                <RateupButtonBlue
                  onClick={open}
                  title={translations["Create"]}
                  leftIcon={<IconPlus size="2.2rem" />}
                  size="xl"
                  py="xl"
                  className={`${styles["create-button"]} `}
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
                      className={getClassName(summaryname)}
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
                          style={{ textAlign: "center" }}
                          fz="xl"
                          c="#595959"
                        >
                          {translations[summaryname]}
                        </Text>
                      </Stack>
                    </PaperLayout>
                  ),
                )}
              </Stack>
              <OverallResponseGraph
                className={styles["overall-responses-graph"]}
                timePeriod={timePeriod}
                setTimePeriod={setTimePeriod}
                data={graphData}
                onRefresh={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: [
                      ["reponse", "graph", timePeriod, userTimeZone, "", []],
                    ],
                  });
                }}
                translations={translations}
                isLoading={isResponseLoading}
              />
            </Group>
            <FormModalLayout
              centered
              opened={opened}
              onClose={close}
              title={translations["Create new"]}
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
                    <div className={styles["active-flow-page"]}>
                      <Heading
                        subtitle={translations["Active Surveys / Flows"]}
                      />
                    </div>
                    <Text fz="17px" mt="5px" c="gray">
                      ( {filterParam} )
                    </Text>
                    <RefreshButton queryKeys={["surveysSummary"]} />
                  </Group>

                  <Group>
                    <Group className={styles["survey-type-filter-button"]}>
                      <SurveyTypeFilter
                        filterParam={filterParam}
                        setFilterParam={setFilterParam}
                      />{" "}
                    </Group>
                    <Group className={styles["sort-dropdown"]}>
                      <SortDropdown
                        onSortChange={onSortChange}
                        defaultSortOption={sortOption}
                      />
                    </Group>
                  </Group>
                </Group>
              </PaperLayout>

              <div
                className={`${classes["filtered-survey-cards-container"]} cards-grid-global-class`}
              >
                {sortedSurveys.length > 0 ? (
                  sortedSurveys.map((s) => (
                    <ActiveSurveyCard key={s.id} survey={s} />
                  ))
                ) : (
                  <NothingFound text={translations["No data found"]} />
                )}
              </div>
            </Stack>
          </Stack>
        </Stack>
      ) : !isError ? (
        <Loading h={300} />
      ) : (
        <Stack p="xl">
          {(summaryError as any)?.response?.data?.message ===
          "Subscription expired" ? (
            <>
              <Blockquote color="red" icon={<IconCloudExclamation />}>
                {translations["You don't have an active Subscription..!"]}
              </Blockquote>
              <Text mb="lg"> </Text>
              <RateupButtonSecondary
                size="md"
                leftIcon={<IconShoppingCart />}
                title={translations["Go to Billing Section"]}
                onClick={() => {
                  router.push("/dashboard/settings?tab=account&view=billing");
                }}
              />
            </>
          ) : (
            <>
              <Text mb="lg"> {translations["An error occured..!"]}</Text>
              <RateupButtonSecondary
                size="md"
                leftIcon={<IconReload />}
                title={translations["Try again"]}
                onClick={refetch}
              />
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}
