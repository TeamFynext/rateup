import {
  RateupButtonBlue
} from "../../components/Button/RateupButtons";
import { Group, Title, Text, Container, Paper, Stack, Modal, SimpleGrid, Button,
     ActionIcon, Center, useMantineTheme } from "@mantine/core";
import { useDisclosure, useHover } from '@mantine/hooks';

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import Loading from "../../components/Page/Loading";
import { useUser } from "../../context/UserContext";
import { IconBrandWhatsapp, IconCheckupList, IconPageBreak, IconPlus, IconSocial } from "@tabler/icons-react";
import { useSurveys, useSurveysSummary } from "../../backend/surveys/surveys.query";
import { IconSpeakerphone } from "@tabler/icons-react";
import ActiveSurveyCard from "../../components/Dashboard/ActiveSurveyCard";
import { useTeamsByUser } from "../../backend/team/team.query";
import { AreaChart , XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import dayjs from 'dayjs';

export default function DashboardHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [opened, { open, close }] = useDisclosure(false);
  const [timePeriod, setTimePeriod] = useState('weekly');
  const theme = useMantineTheme();

  const {
    isLoading,
    error,
    data: surveys,
  } = useSurveys(false);

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser(queryClient);

  //TODO avoid above two api calls, merge required datas into surveysSummary

  const {
    isLoading : isLoadingSummary,
    error: isErrorSummary,
    data: surveysSummary,
  } = useSurveysSummary() as { isLoading: boolean; error: any; data: SurveySummary[] };

  useEffect(() => {
    if (!user?.role) {
      queryClient.invalidateQueries(["userInfoQuery"]);
    }
  }, []);

function prepareData(surveysSummary: SurveySummary[] ) {
  let dateResponseCount = {};
  surveysSummary?.forEach(survey => {
    survey?.responses?.forEach(response => {
      let date = new Date(response?.createdAt).toISOString().split('T')[0];
      if (dateResponseCount[date]) {
        dateResponseCount[date]++;
      } else {
        dateResponseCount[date] = 1;
      }
    });
  });
  let data = Object.keys(dateResponseCount)?.map(date => ({
    date: date,
    responses: dateResponseCount[date]
  }));

  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

const filteredData = data?.filter(datum => {
  const date = dayjs(datum.date);
  const now = dayjs();
  let periodStart;
  switch (timePeriod) {
    case 'daily':
      periodStart = now.subtract(1, 'day');
      break;
    case 'weekly':
      periodStart = now.subtract(1, 'week');
      break;
    case 'monthly':
      periodStart = now.subtract(1, 'month');
      break;
    default:
      periodStart = dayjs(0);
  }
  return date.isAfter(periodStart);
});

interface iProps{
  active?: any;
  payload?: any;
  label?: any
}
const CustomTooltip = ({ active, payload, label } : iProps) => {
  if (active && payload && payload?.length) {
    return (
      <div className="custom-tooltip" 
          style={{
            background: '#fff',
            padding: '2px 15px',
            border: '1px solid #3F5BA9',
            boxSizing: 'border-box',
            borderRadius: '10px'
          }}>
        <p className="label">{`${dayjs(label).format('MMM DD, YYYY')}`}</p>
        <p className="intro">{`Responses: ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

  return (
    <>
      {user && !isLoadingSummary ? (
        <Container fluid>

          <Stack>
            <Group>

            <Stack  sx={{width: '28%'}}>

                <Paper sx={{height:"105px", cursor:'pointer'}} radius="md" px="xl" py="sm"  shadow="lg" 
                    onClick={() => router.push("/dashboard/surveys")}>
                    <Title align="center" order={2} size="36px" color="#3F5BA9">
                       {(Array.isArray(surveys) && surveys.length) ? surveys.filter(s => s.active === true).length : 0}
                      </Title>
                    <Text align="center" mb="lg"  fw={700} fz="xl" color="#595959"> Active Surveys</Text>
                </Paper>

                <Paper sx={{ height:"105px", cursor:'pointer'}} radius="md" px="xl" py="sm"  shadow="lg"
                onClick={() => router.push("/dashboard/surveys")}>
                    <Title align="center" order={2} size="36px" color="#3F5BA9">
                       {Array.isArray(surveys) && surveys.length ? surveys.length : 0}
                      </Title>
                    <Text align="center" mb="lg" fw={700} fz="xl" color="#595959"> Total Surveys</Text>
                </Paper>

                <Paper sx={{ height:"105px", cursor:'pointer'}} radius="md" px="xl" py="sm"  shadow="lg"
                onClick={() => router.push("/dashboard/teams")}>
                    <Title align="center" order={2} size="36px" color="#3F5BA9">{teamsDataUser?.data?.data?.length}</Title>
                    <Text align="center" mb="lg" fw={700} fz="xl" color="#595959"> Total Teams</Text>
                </Paper>

           
                  <RateupButtonBlue
                    onClick={open}
                    title={"Create"}
                    leftIcon={<IconPlus size="2.2rem" />}
                    size="xl"
                    py="xl"
                    styles={{
                      root: {
                        height: '130px', 
                      },
                      label: {
                        fontSize: '31px',
                        paddingLeft: '5px',
                        paddingBottom: '4px', 
                        display: 'flex',
                        alignItems: 'center', 
                      },
                      leftIcon: {
                        display: 'flex',
                        alignItems: 'center', 
                      },
                    
                    }}
                  />

              </Stack>

              <Paper radius="md" px="xl" py="lg" my="xl" pt="xl" shadow="lg"
              sx={{ width: "70%", height: "500px", alignContent: 'center'}}
              >
                <Stack>
                  <Group position="apart">
                  <Title order={3}  color="gray">Overall Responses</Title>
                      <Group  position="right"> 
                      <Button variant={timePeriod === 'daily' ? "filled" :"subtle"}   radius="lg"
                              color={timePeriod === 'daily' ? "dark" :"gray"}
                              onClick={() => setTimePeriod('daily')}>
                          Daily
                      </Button>
                      <Button  variant={timePeriod === 'weekly' ? "filled" :"subtle"} radius="lg"
                                color={timePeriod === 'weekly' ? "dark" :"gray"}   onClick={() => setTimePeriod('weekly')}>
                           Weekly
                      </Button>
                      <Button  variant={timePeriod === 'monthly' ? "filled" :"subtle"} radius="lg"
                                color={timePeriod === 'monthly' ? "dark" :"gray"}   onClick={() => setTimePeriod('monthly')}>
                           Monthly
                      </Button>
                      </Group>
                  </Group>

                  <Text align="left" mb="md" mt="-15px" ml="md" fw={700} fz="xl" color="#595959"> {total}</Text>

                </Stack>
                
                <ResponsiveContainer width="100%" height={380}>
                <AreaChart  data={filteredData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3F5BA9" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#62CBE6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(str) => dayjs(str).format('MMM DD')} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  {/* <Legend /> */}
                  <CartesianGrid stroke="#f5f5f5" />
                  <Area type="monotone" dataKey="responses" stroke="#3F5BA9" fillOpacity={1} fill="url(#colorCount)" />
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
                  color: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
                  opacity: 0.55,
                  blur: 3,
                }}
                styles={{
                    title: {
                    fontSize: '31px',
                    fontWeight: 700,
                    padding: "10px"
                  }}}
              >

              <Group py="xl" px="sm" mb="md" >
              <CardActionButton 
                    sx={{ width: "160px", height: "100px", alignContent: 'center', cursor: 'pointer'}}
                    onClick={() => router.push("/dashboard/surveys?action=create")}>
                <Center h="100%">
                  <Stack align="center" spacing="0">
                    <ActionIcon size="xl">
                      <IconCheckupList size="2rem"  color="#595959"/>
                    </ActionIcon>
                    <Text align="center"  size="20px" fw={700} color="#595959">Web Survey</Text>
                  </Stack>
                </Center>
              </CardActionButton>
              <CardActionButton  onClick={() => router.push("/dashboard/teams?action=create")}
                      sx={{ width: "170px", height: "100px", alignContent: 'center', cursor: 'pointer'}}>
                      <Center h="100%">
                          <Stack align="center" spacing="0">
                            <ActionIcon size="xl">
                              <IconSocial size="2rem" color="#595959"  />
                            </ActionIcon>
                            <Text align="center"  size="20px" fw={700} color="#595959">Team</Text>
                        </Stack>
                      </Center>
                </CardActionButton>
              <CardActionButton 
                    sx={{ width: "240px", height: "100px", alignContent: 'center', cursor: 'pointer'}}
                    onClick={() => router.push("/dashboard/whatsappsurvey?action=create")}>
                <Center h="100%">
                  <Stack align="center" spacing="0">
                    <ActionIcon size="xl">
                      <IconBrandWhatsapp size="2rem"  color="#595959"/>
                    </ActionIcon>
                    <Text align="center"  size="20px" fw={700} color="#595959">WhatsApp Survey</Text>
                  </Stack>
                </Center>
              </CardActionButton>
                
                
                <CardActionButton  onClick={() => router.push("/dashboard/LandingPages?action=create")}
                sx={{ width: "180px", height: "100px", alignContent: 'center', cursor: 'pointer'}}>
                      <Center h="100%">
                          <Stack align="center" spacing="0">
                            <ActionIcon size="xl">
                              <IconPageBreak size="2rem"  color="#595959" />
                            </ActionIcon>
                            <Text align="center"  size="20px" fw={700} color="#595959">Landing Page</Text>
                        </Stack>
                      </Center>
                </CardActionButton>

                <CardActionButton   onClick={() => router.push("/dashboard/promotion?action=create")}
                    sx={{ width: "170px", height: "100px", alignContent: 'center', cursor: 'pointer'}}>
                      <Center h="100%">
                          <Stack align="center" spacing="0">
                            <ActionIcon size="xl">
                              <IconSpeakerphone size="2rem"  color="#595959"/>
                            </ActionIcon>
                            <Text align="center"  size="20px" fw={700} color="#595959">Promotion</Text>
                        </Stack>
                      </Center>
                </CardActionButton>


              </Group>


              </Modal>

            

           <Paper radius="md" px="xl" py="lg" my="xl" pt="xl" shadow="lg">
                <Title order={2}>Active Surveys</Title>
            </Paper>

              <SimpleGrid
                cols={4}
                spacing={"lg"}
                mb="xl" pb="xl" mx="sm"
                breakpoints={[
                  { minWidth: "xl", cols: 4 },
                  { minWidth: "lg", cols: 4 },
                  { minWidth: "md", cols: 2 },
                  { maxWidth: "md", cols: 1 },
                ]}
              >
                      {(Array.isArray(surveysSummary) && (surveysSummary.length > 0 ? 
                        (surveysSummary.filter(s => s.active === true).map((s) => (
                          <ActiveSurveyCard
                            key={s.id}
                            survey={s}
                          />
                      ) )):  " No active surveys."
                        
                      
                      )
                      )}

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
      p='md'
      ref={ref}
      bg={hovered ? "#F8F8F9" : "white"}
      {...props}
      >
        {children}
      </Paper>
  )
}
