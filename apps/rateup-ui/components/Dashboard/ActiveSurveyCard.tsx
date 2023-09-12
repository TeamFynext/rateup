import React from 'react'
import {
  Paper,
  Text,
  Flex,
  Title,
  Badge,
  Group,
  Stack
} from "@mantine/core";
import { useRouter } from "next/router";
import { useUser } from '../../context/UserContext';
import { RateupButtonBlue } from '../Button/RateupButtons';


interface SurveyCardProps {
  survey: SurveySummary;
}
export default function ActiveSurveyCard({
  survey
}: SurveyCardProps): JSX.Element {
  const { user, setUser } = useUser();

  const responsesCount = survey?.responses?.length;
  const visitedCount = survey?.surveyStats?.visited;
  const router = useRouter();

  return (
    <Paper
      shadow="lg"
      radius="lg"
      sx={{ cursor: "pointer", paddingBottom: 0, }}
      onClick={(e) => {
        e.stopPropagation(),
          user?.role === "MEMBER"
            ? router.push(
                `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/results/${survey?.id}`
              )
            : router.push(
                `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/results/${survey?.id}`
              );
      }}
    >
      <Stack >
          <Flex justify={"space-between"} align={"center"} px="lg">
            <Text mr={"sm"} truncate size="xl" mt="md"  fw={700}>
              {survey?.title}
            </Text>
          </Flex>
    
          <Group position='apart'  spacing="xs" px="lg">
            <Text align="center"  color="#595959"> {survey?.team?.name}</Text>
            <Badge color={survey?.type == "web" ? "blue" : "green"}>
              {survey?.type}
            </Badge>
          </Group>

          <Group position='apart'spacing="xs"  px="lg">
            <Stack align="center" sx={{width: '45%', height:"105px"}}  px="xl" pb="sm" >
                <Title align="center" order={2} size="30px" color="#3F5BA9">{responsesCount ? responsesCount : 0}</Title>
                <Text align="center"  mt="-15px"  fw={700} fz="lg" color="#595959"> Responses</Text>
            </Stack>
            <Stack align="center" sx={{width: '45%', height:"105px"}} px="xl" pb="sm" >
                <Title align="center" order={2} size="30px" color="#3F5BA9">{visitedCount ? visitedCount : 0}</Title>
                <Text align="center" mt="-15px"  fw={700} fz="lg" color="#595959"> Visited</Text>
            </Stack>
          </Group>

          <RateupButtonBlue
                        title={"View"}
                        size="xl"
                        styles={{
                          root: {
                            height: '70px', 
                            padding: 0,
                            margin: 0,
                            borderRadius:"0 0 20px 20px",
                            marginTop:'-20px'
                          },
                          label: {
                            fontSize: '19px',
                            paddingLeft: '0px',
                            paddingBottom: '0px', 
                            display: 'flex',
                            alignItems: 'center', 
                          },
                        }}
                      />
      </Stack>
    </Paper>
  );
}