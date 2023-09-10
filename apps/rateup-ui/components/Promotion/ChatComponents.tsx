import { useMantineTheme, Flex, Box, Container, Text, Autocomplete, Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSend } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useContext, useState } from "react";
import { useSurveysByTeam } from "../../backend/surveys/surveys.query";
import SelectedTeamContext from "../../context/SelectedTeam";

export function SurveySendDetailComponent({ name, createdAt }) {
  const { colors } = useMantineTheme();
  return (
    <Flex justify={"end"} m="sm">
      <Box
        p="md"
        sx={{
          background: "linear-gradient(270deg, #3F5BA9 -18.1%, #49C8E9 416.79%);",
          color: "white",
          height: "80px",
          width: "250px",
          borderRadius: "20px",
          boxShadow: "0 2px 2px 0 rgba(0, 0, 0, 0.2), 0 2px 5px 0 rgba(0, 0, 0, 0.19)",
          borderBottomRightRadius: "0px",
          position: "relative",
        }}

      >
        <Text>{name}</Text>
        <Text sx={{
          fontSize: "0.8rem",
          position: "absolute",
          bottom: "10px",
          right: "10px",
        }}>{dayjs(createdAt).format("DD-MM-YYYY")}</Text>
        <Text sx={{
          fontSize: "0.8rem",
          position: "absolute",
          bottom: "10px",
          left: "10px",
        }}>{dayjs(createdAt).format("hh:mm A")}</Text>

      </Box>
    </Flex>
  )
}

export function ResponseComponent({ createdAt, surveyTitle }) {
  // TODO: add a way to view response or redirect to response with row of respondent highlighted
  const { colors } = useMantineTheme();
  return (
    <Container fluid m="sm">
      <Box
        p="md"
        sx={{
          backgroundColor: "white",
          height: "80px",
          width: "250px",
          borderRadius: "20px",
          boxShadow: "0 2px 2px 0 rgba(0, 0, 0, 0.2), 0 2px 5px 0 rgba(0, 0, 0, 0.19)",
          borderTopLeftRadius: "0px",
          position: "relative",
        }}

      >
        <Text align="end">
          {`Filled: ${surveyTitle}`}
        </Text>
        <Text sx={{
          color: colors.dark[2],
          fontSize: "0.8rem",
          position: "absolute",
          bottom: "10px",
          left: "10px",
        }}>{dayjs(createdAt).format("DD-MM-YYYY")}</Text>
        <Text sx={{
          color: colors.dark[2],
          fontSize: "0.8rem",
          position: "absolute",
          bottom: "10px",
          right: "10px",
        }}>{dayjs(createdAt).format("hh:mm A")}</Text>
      </Box>
    </Container>
  )
}

export function SendSurveyComponent({ sendHandler }) {
  const { colors } = useMantineTheme();
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const { isLoading, error, data: res } = useSurveysByTeam(selectedTeamId, !!selectedTeamId)
  const [selectedSurvey, setSelectedSurvey] = useState("")
  const surveys = res?.data

  if (isLoading) return <div>Loading...</div>
  if (error || !Array.isArray(surveys)) {
    // console.log(error)
    //console.log(surveys)
    return <div>Error</div>
  }
  const handleSend = () => {
    const survey = surveys.find(({ title }) => title === selectedSurvey)
    if (survey) {
      sendHandler(survey.id)
    } else {
      notifications.show({
        message: "Please select a survey to send",
        color: "red",
      })
    }
  }
  return (
    <Flex gap={"md"} p="xs" sx={{ width: "100%" }} align={"center"}>
      <Autocomplete
        radius={"xl"}
        placeholder="Search for survey to send"
        data={surveys.map(({ title }) => title)}
        sx={{ flexGrow: 1 }}
        size="md"
        onChange={setSelectedSurvey}
      />
      <Button
        radius={"xl"}
        rightIcon={<IconSend size="1.1rem" />}
        onClick={handleSend}
        sx={{
          flexGrow: 0
        }}
      >
        Send
      </Button>
    </Flex >
  )
}