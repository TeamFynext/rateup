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
} from "@tabler/icons-react";
import { useSurveysSummary } from "../../backend/surveys/surveys.query";
import ActiveSurveyCard from "../../components/Dashboard/ActiveSurveyCard";
import {
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Brush,
} from "recharts";
import dayjs from "dayjs";
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

export default function DashboardHome() {
  const router = useRouter();
  const { user } = useUser();
  const [sort, setSort] = useState(true);
  const [filterParam, setFilterParam] = useState(SurveyTypeFilters.All);
  const [opened, { open, close }] = useDisclosure(false);
  const [timePeriod, setTimePeriod] = useState("weekly");
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
  useEffect(() => {
    if (!isInitialLoading)
      notifications.show({
        id: "refetch-data",
        loading: true,
        title: "Refreshing data",
        message: "Hold on, your data is getting updated..",
        autoClose: 2000,
        withCloseButton: true,
      });
  }, [isRefetching]);

  useEffect(() => {
    fetchStatus === "idle" && notifications.clean();
  }, [fetchStatus]);

  function dateToISOButLocal(date) {
    return dayjs(new Date(date)).format();
  }

  function prepareData(surveysSummary: SurveySummaryData) {
    let dateResponseCount = {};
    let dayResponseCount = {};
    surveysSummary?.surveys?.forEach((survey) => {
      survey?.teams?.forEach((team) => {
        team?.responses?.forEach((response) => {
          let date = dateToISOButLocal(response?.createdAt).split("T")[0];
          if (dateResponseCount[date]) {
            dateResponseCount[date]++;
          } else {
            dateResponseCount[date] = 1;
          }
          let dateWithHour = dateToISOButLocal(response?.createdAt).slice(
            0,
            13,
          );
          if (dayResponseCount[dateWithHour]) dayResponseCount[dateWithHour]++;
          else dayResponseCount[dateWithHour] = 1;
        });
      });
    });

    const allDates = [];
    const currentYear = dayjs().year();
    const currentMonth = dayjs().month();
    for (var i = 1; i <= dayjs().daysInMonth(); i++)
      allDates.push(
        dayjs(new Date(currentYear, currentMonth, i))
          .format()
          .split("T")[0],
      );
    const remainingDates = allDates.filter(
      (d) => !Object.keys(dateResponseCount).some((dt) => dt == d),
    );
    remainingDates.map((rd) => {
      dateResponseCount[rd] = 0;
    });

    const dayWithAllTimes = [];
    for (var i = 0; i <= 23; i++) {
      const now = new Date();
      now.setHours(i);
      dayWithAllTimes.push(dayjs(now).format().slice(0, 13));
    }
    const remainingTimes = dayWithAllTimes.filter(
      (dt) => !Object.keys(dayResponseCount).some((d) => dt === d),
    );
    remainingTimes.map((rd) => {
      dayResponseCount[rd] = 0;
    });
    let data = Object.keys(
      timePeriod === "daily" ? dayResponseCount : dateResponseCount,
    )?.map((date) => ({
      date: date,
      responses:
        timePeriod === "daily"
          ? dayResponseCount[date]
          : dateResponseCount[date],
    }));

    const formattedData =
      timePeriod === "daily"
        ? data.sort((a, b) => {
            return a.date.localeCompare(b.date);
          })
        : data.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
    return formattedData;
  }

  const data = prepareData(surveysSummary);
  function getTotalCount(data) {
    let totalCount = 0;
    for (const item of data) {
      totalCount += item?.responses;
    }
    return totalCount;
  }
  const total = getTotalCount(data);

  const filteredData = data?.filter((datum) => {
    const date = dayjs(datum.date);
    const now = dayjs();
    let periodStart;
    let periodEnd;
    switch (timePeriod) {
      case "daily":
        periodStart = now.startOf("day");
        periodEnd = now.endOf("day");
        break;
      case "weekly":
        periodStart = now.startOf("week");
        periodEnd = now.endOf("week");
        break;
      case "monthly":
        periodStart = now.startOf("month");
        periodEnd = now.endOf("month");
        break;
      default:
        periodStart = dayjs(0);
    }
    return (
      (date.isAfter(periodStart) || date.isSame(periodStart)) &&
      (date.isBefore(periodEnd) || date.isSame(periodEnd))
    );
  });

  interface iProps {
    active?: any;
    payload?: any;
    label?: any;
    timePeriod?: any;
  }
  const CustomTooltip = ({ active, payload, label, timePeriod }: iProps) => {
    if (active && payload && payload?.length) {
      label = dayjs(label).format(
        timePeriod === "daily" ? "MMM DD, YYYY H A" : "MMM DD, YYYY",
      );
      return (
        <div
          className="custom-tooltip"
          style={{
            background: "#fff",
            padding: "2px 15px",
            border: "1px solid #3F5BA9",
            boxSizing: "border-box",
            borderRadius: "10px",
          }}
        >
          <p className="label">{label}</p>
          <p className="intro">{`Responses: ${payload[0].value}`}</p>
        </div>
      );
    }

    return null;
  };

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
      title: "WhatsApp Survey",
      routerPath: "/dashboard/whatsapp?action=create",
    },
    {
      Icon: IconPageBreak,
      title: "Group Survey",
      routerPath: "/dashboard/groupsurveys?action=create",
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

  return (
    <>
      {user && !isLoadingSummary && !isError && !surveysSummary?.error ? (
        <Container fluid w="100%">
          <Stack gap={"xl"}>
            <Group>
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

              <PaperLayout
                px="xl"
                py="sm"
                style={{ flex: 0.7 }}
                miw={300}
                w={"100%"}
              >
                <>
                  <Stack>
                    <Group justify="space-between">
                      <Group>
                        <Stack align="center" gap={0}>
                          <Text fz={32} c="#595959">
                            {total}
                          </Text>
                          <Text
                            className={lexend400.className}
                            fz="xl"
                            c="dimmed"
                          >
                            Overall Responses
                          </Text>
                        </Stack>
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

                      <Group justify="flex-end">
                        <RateupButtonBlue
                          variant={timePeriod === "daily" ? "filled" : "subtle"}
                          radius="lg"
                          color={timePeriod !== "daily" && "gray"}
                          onClick={() => setTimePeriod("daily")}
                          title="Day"
                        />

                        <RateupButtonBlue
                          variant={
                            timePeriod === "weekly" ? "filled" : "subtle"
                          }
                          radius="lg"
                          color={timePeriod !== "weekly" && "gray"}
                          onClick={() => setTimePeriod("weekly")}
                          title="Week"
                        />
                        <RateupButtonBlue
                          variant={
                            timePeriod === "monthly" ? "filled" : "subtle"
                          }
                          radius="lg"
                          color={timePeriod !== "monthly" && "gray"}
                          onClick={() => setTimePeriod("monthly")}
                          title="Month"
                        />
                      </Group>
                    </Group>
                  </Stack>
                  <ResponsiveContainer width="100%" height={380}>
                    {filteredData?.length > 0 ? (
                      <AreaChart
                        data={filteredData}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="gradientColor"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--tertiary-color)"
                              stopOpacity={1}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--tertiary-color)"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tickFormatter={(str) =>
                            dayjs(str).format(
                              timePeriod === "daily" ? "H A" : "MMM DD",
                            )
                          }
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          content={<CustomTooltip timePeriod={timePeriod} />}
                        />
                        {/* <Legend /> */}
                        <CartesianGrid stroke="#f5f5f5" />
                        <Area
                          type="monotone"
                          dataKey="responses"
                          fillOpacity={0.7}
                          fill="url(#gradientColor)"
                          dot={{ stroke: "var(--tertary-color" }}
                        />
                        <Brush
                          height={15}
                          dataKey="date"
                          tickFormatter={(str) =>
                            dayjs(str).format(
                              timePeriod === "daily" ? "H A" : "MMM DD",
                            )
                          }
                          fill="var(--light-grey-color-3)"
                        />
                      </AreaChart>
                    ) : (
                      <NothingFound text="No data to display" />
                    )}

                    {/* TODO : dots showing only on hover, show dots always in area chart */}
                  </ResponsiveContainer>
                </>
              </PaperLayout>
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

            <PaperLayout p={"lg"}>
              <Group justify="space-between">
                <Group align="center">
                  <Heading subtitle="Active Surveys" />
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

            {surveysSummary?.surveys?.length > 0 ? (
              <SimpleGrid
                spacing="lg"
                mb="xl"
                pb="xl"
                mx="sm"
                cols={{ xs: 1, sm: 1, md: 2, lg: 3, xl: 4 }}
              >
                {Array.isArray(surveysSummary?.surveys) &&
                  (surveysSummary?.surveys?.length > 0 ? (
                    surveysSummary?.surveys
                      ?.filter((s) => s.active === true)
                      .sort((a, b) =>
                        sort
                          ? new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                          : new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime(),
                      )
                      .filter((s) => {
                        if (filterParam === SurveyTypeFilters.Web) {
                          return s.type === "web";
                        } else if (filterParam === SurveyTypeFilters.WhatsApp) {
                          return s.type === "whatsapp";
                        } else {
                          return true;
                        }
                      })
                      .map((s) => <ActiveSurveyCard key={s.id} survey={s} />)
                  ) : (
                    <NothingFound text="No active surveys at the moment" />
                  ))}
              </SimpleGrid>
            ) : (
              <NothingFound text="No active surveys at the moment" />
            )}
          </Stack>
        </Container>
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
