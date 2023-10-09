import {
  RateupButtonBlue,
  RateupButtonPrimary,
} from "../../components/Button/RateupButtons";
import {
  Group,
  Title,
  Text,
  Container,
  Paper,
  Stack,
  Modal,
  SimpleGrid,
  Button,
  ActionIcon,
  Center,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import { useState } from "react";
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
} from "@tabler/icons-react";
import { useSurveysSummary } from "../../backend/surveys/surveys.query";
import { IconSpeakerphone } from "@tabler/icons-react";
import ActiveSurveyCard from "../../components/Dashboard/ActiveSurveyCard";
import {
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";
import dayjs from "dayjs";
import { GetServerSidePropsContext } from "next";
import supertokensNode from "supertokens-node";
import { backendConfig } from "../../config/backendConfig";
import { getActiveSurveysSummaryWithCustomToken } from "../../backend/surveys/survey.api";
import { checkTokenExpiry } from "../../utils/supertoken";
import { SurveyTypeFilter } from "../../components/Survey/Filter/SurveyTypeFilter";
import { SurveyTypeFilters } from "../../types/enums";

export default function DashboardHome({ summaryData: initialSummaryData }) {
  const router = useRouter();
  const { user } = useUser();
  const [sort, setSort] = useState(true);
  const [filterParam, setFilterParam] = useState(SurveyTypeFilters.All);
  const [opened, { open, close }] = useDisclosure(false);
  const [timePeriod, setTimePeriod] = useState("weekly");
  const theme = useMantineTheme();

  const {
    isLoading: isLoadingSummary,
    error: isErrorSummary,
    data: surveysSummary,
  } = useSurveysSummary(initialSummaryData) as {
    isLoading: boolean;
    error: any;
    data: SurveySummaryData;
  };

  function prepareData(surveysSummary: SurveySummaryData) {
    let dateResponseCount = {};
    surveysSummary?.surveys?.forEach((survey) => {
      survey?.responses?.forEach((response) => {
        let date = new Date(response?.createdAt).toISOString().split("T")[0];
        if (dateResponseCount[date]) {
          dateResponseCount[date]++;
        } else {
          dateResponseCount[date] = 1;
        }
      });
    });
    let data = Object.keys(dateResponseCount)?.map((date) => ({
      date: date,
      responses: dateResponseCount[date],
    }));

    data.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return data;
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
    switch (timePeriod) {
      case "daily":
        periodStart = now.subtract(1, "day");
        break;
      case "weekly":
        periodStart = now.subtract(1, "week");
        break;
      case "monthly":
        periodStart = now.subtract(1, "month");
        break;
      default:
        periodStart = dayjs(0);
    }
    return date.isAfter(periodStart);
  });

  interface iProps {
    active?: any;
    payload?: any;
    label?: any;
  }
  const CustomTooltip = ({ active, payload, label }: iProps) => {
    if (active && payload && payload?.length) {
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
          <p className="label">{`${dayjs(label).format("MMM DD, YYYY")}`}</p>
          <p className="intro">{`Responses: ${payload[0].value}`}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {user && !isLoadingSummary ? (
        <Container fluid w="100%">
          <Stack>
            <Group>
              <Stack style={{ width: "28%" }}>
                <RateupButtonBlue
                  onClick={open}
                  title={"Create"}
                  leftIcon={<IconPlus size="2.2rem" />}
                  size="xl"
                  py="xl"
                  styles={{
                    root: {
                      height: "130px",
                    },
                    label: {
                      fontSize: "31px",
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
                <Paper
                  style={{ height: "105px", cursor: "pointer" }}
                  radius="md"
                  px="xl"
                  py="sm"
                  shadow="lg"
                  onClick={() => router.push("/dashboard/surveys")}
                >
                  <Title
                    style={{ textAlign: "center", color: "#1C518E" }}
                    order={2}
                    size="36px"
                  >
                    {surveysSummary?.activeSurveysCount
                      ? surveysSummary?.activeSurveysCount
                      : 0}
                  </Title>
                  <Text
                    style={{ textAlign: "center" }}
                    mb="lg"
                    fw={700}
                    fz="xl"
                    c="#595959"
                  >
                    {" "}
                    Active Surveys
                  </Text>
                </Paper>

                <Paper
                  style={{ height: "105px", cursor: "pointer" }}
                  radius="md"
                  px="xl"
                  py="sm"
                  shadow="lg"
                  onClick={() => router.push("/dashboard/surveys")}
                >
                  <Title
                    style={{ textAlign: "center", color: "#1C518E" }}
                    order={2}
                    size="36px"
                  >
                    {surveysSummary?.totalSurveysCount
                      ? surveysSummary?.totalSurveysCount
                      : 0}
                  </Title>
                  <Text
                    style={{ textAlign: "center" }}
                    mb="lg"
                    fw={700}
                    fz="xl"
                    c="#595959"
                  >
                    {" "}
                    Total Surveys
                  </Text>
                </Paper>

                <Paper
                  style={{ height: "105px", cursor: "pointer" }}
                  radius="md"
                  px="xl"
                  py="sm"
                  shadow="lg"
                  onClick={() => router.push("/dashboard/teams")}
                >
                  <Title
                    style={{ textAlign: "center", color: "#1C518E" }}
                    order={2}
                    size="36px"
                  >
                    {surveysSummary?.totalTeamsCount
                      ? surveysSummary?.totalTeamsCount
                      : 0}
                  </Title>
                  <Text
                    style={{ textAlign: "center" }}
                    mb="lg"
                    fw={700}
                    fz="xl"
                    c="#595959"
                  >
                    {" "}
                    Total Teams
                  </Text>
                </Paper>
              </Stack>

              <Paper
                radius="md"
                px="xl"
                py="lg"
                my="xl"
                pt="xl"
                shadow="lg"
                style={{
                  width: "70%",
                  height: "500px",
                  alignContent: "center",
                }}
              >
                <Stack>
                  <Group justify="space-between">
                    <Title order={3} c="gray">
                      Overall Responses
                    </Title>
                    <Group justify="flex-end">
                      <Button
                        variant={timePeriod === "daily" ? "filled" : "subtle"}
                        radius="lg"
                        color={timePeriod === "daily" ? "dark" : "gray"}
                        onClick={() => setTimePeriod("daily")}
                      >
                        Daily
                      </Button>
                      <Button
                        variant={timePeriod === "weekly" ? "filled" : "subtle"}
                        radius="lg"
                        color={timePeriod === "weekly" ? "dark" : "gray"}
                        onClick={() => setTimePeriod("weekly")}
                      >
                        Weekly
                      </Button>
                      <Button
                        variant={timePeriod === "monthly" ? "filled" : "subtle"}
                        radius="lg"
                        color={timePeriod === "monthly" ? "dark" : "gray"}
                        onClick={() => setTimePeriod("monthly")}
                      >
                        Monthly
                      </Button>
                    </Group>
                  </Group>

                  <Group justify="flex-start">
                    <Text
                      mb="md"
                      mt="-15px"
                      ml="md"
                      fw={700}
                      fz="xl"
                      c="#595959"
                    >
                      {" "}
                      {total}
                    </Text>
                  </Group>
                </Stack>

                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart
                    data={filteredData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorCount"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3F5BA9"
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor="#62CBE6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor="#FFFFFF"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(str) => dayjs(str).format("MMM DD")}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    {/* <Legend /> */}
                    <CartesianGrid stroke="#f5f5f5" />
                    <Area
                      type="monotone"
                      dataKey="responses"
                      stroke="#3F5BA9"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>

                  {/* TODO : dots showing only on hover, show dots always in area chart */}
                </ResponsiveContainer>
              </Paper>
            </Group>

            <Modal
              centered
              opened={opened}
              onClose={close}
              title="Create new"
              overlayProps={{
                color: theme.colors.dark[9],
                opacity: 0.55,
                blur: 3,
              }}
              styles={{
                title: {
                  fontSize: "31px",
                  fontWeight: 700,
                  padding: "10px",
                },
              }}
            >
              <Group py="xl" px="sm" mb="md">
                <CardActionButton
                  sx={{
                    width: "160px",
                    height: "100px",
                    alignContent: "center",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    router.push("/dashboard/surveys?action=create")
                  }
                >
                  <Center h="100%">
                    <Stack align="center" gap="0">
                      <ActionIcon size="xl" variant="subtle" color="#F8F8F9">
                        <IconCheckupList size="2rem" color="#595959" />
                      </ActionIcon>
                      <Text
                        style={{ textAlign: "center" }}
                        size="20px"
                        fw={700}
                        c="#595959"
                      >
                        Web Survey
                      </Text>
                    </Stack>
                  </Center>
                </CardActionButton>
                <CardActionButton
                  onClick={() => router.push("/dashboard/teams?action=create")}
                  sx={{
                    width: "170px",
                    height: "100px",
                    alignContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Center h="100%">
                    <Stack align="center" gap="0">
                      <ActionIcon size="xl" variant="subtle" color="#F8F8F9">
                        <IconSocial size="2rem" color="#595959" />
                      </ActionIcon>
                      <Text
                        style={{ textAlign: "center" }}
                        size="20px"
                        fw={700}
                        c="#595959"
                      >
                        Team
                      </Text>
                    </Stack>
                  </Center>
                </CardActionButton>
                <CardActionButton
                  sx={{
                    width: "240px",
                    height: "100px",
                    alignContent: "center",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    router.push("/dashboard/whatsappsurvey?action=create")
                  }
                >
                  <Center h="100%">
                    <Stack align="center" gap="0">
                      <ActionIcon size="xl" variant="subtle" color="#F8F8F9">
                        <IconBrandWhatsapp size="2rem" color="#595959" />
                      </ActionIcon>
                      <Text
                        style={{ textAlign: "center" }}
                        size="20px"
                        fw={700}
                        c="#595959"
                      >
                        WhatsApp Survey
                      </Text>
                    </Stack>
                  </Center>
                </CardActionButton>

                <CardActionButton
                  onClick={() =>
                    router.push("/dashboard/LandingPages?action=create")
                  }
                  sx={{
                    width: "180px",
                    height: "100px",
                    alignContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Center h="100%">
                    <Stack align="center" gap="0">
                      <ActionIcon size="xl" variant="subtle" color="#F8F8F9">
                        <IconPageBreak size="2rem" color="#595959" />
                      </ActionIcon>
                      <Text
                        style={{ textAlign: "center" }}
                        size="20px"
                        fw={700}
                        color="#595959"
                      >
                        Merge Survey
                      </Text>
                    </Stack>
                  </Center>
                </CardActionButton>

                <CardActionButton
                  onClick={() =>
                    router.push("/dashboard/promotion?action=create")
                  }
                  sx={{
                    width: "170px",
                    height: "100px",
                    alignContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Center h="100%">
                    <Stack align="center" gap="0">
                      <ActionIcon size="xl" variant="subtle" color="#F8F8F9">
                        <IconSpeakerphone size="2rem" color="#595959" />
                      </ActionIcon>
                      <Text
                        style={{ textAlign: "center" }}
                        size="20px"
                        fw={700}
                        c="#595959"
                      >
                        Promotion
                      </Text>
                    </Stack>
                  </Center>
                </CardActionButton>
              </Group>
            </Modal>

            <Paper radius="md" px="xl" py="lg" my="xl" pt="xl" shadow="lg">
              <Group justify="space-between">
                <Group align="center">
                  <Title order={2}>Active Surveys</Title>
                  <Text fz="17px" mt="5px" c="gray">
                    ( {filterParam} )
                  </Text>
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
            </Paper>

            <SimpleGrid
              spacing={"lg"}
              mb="xl"
              pb="xl"
              mx="sm"
              cols={{ base: 4, sm: 2, md: 2, lg: 4 }}
              // breakpoints={[  //TODO VERIFY MANTINE
              //   { minWidth: "xl", cols: 4 },
              //   { minWidth: "lg", cols: 4 },
              //   { minWidth: "md", cols: 2 },
              //   { maxWidth: "md", cols: 1 },
              // ]}
            >
              {Array.isArray(surveysSummary?.surveys) &&
                (surveysSummary?.surveys?.length > 0
                  ? surveysSummary?.surveys
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
                  : " No active surveys.")}
            </SimpleGrid>
          </Stack>
        </Container>
      ) : (
        <Loading h={300} />
      )}
    </>
  );
}

function CardActionButton({ children, ...props }) {
  const { hovered, ref } = useHover();
  return (
    <Paper
      shadow={hovered ? "sm" : "xs"}
      radius="lg"
      p="md"
      ref={ref}
      bg={hovered ? "#F8F8F9" : "white"}
      {...props}
    >
      {children}
    </Paper>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    supertokensNode.init(backendConfig());

    let accessToken =
      context.req.cookies["st-access-token"] ||
      context.req.cookies["sAccessToken"];
    if (!accessToken) {
      return { props: { summaryData: {} } };
    }

    const summaryData =
      await getActiveSurveysSummaryWithCustomToken(accessToken);

    const tokenExpiryCheck = checkTokenExpiry([summaryData]);
    if (tokenExpiryCheck) {
      return tokenExpiryCheck;
    }

    return {
      props: {
        summaryData: summaryData || {},
      },
    };
  } catch (err) {
    console.log(err);
    return {
      props: {
        summaryData: {},
      },
    };
  }
}
