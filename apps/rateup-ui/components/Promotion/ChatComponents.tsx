import { useMantineTheme, Flex, Box, Container, Text, Autocomplete, Button, Group, Select, createTheme, MantineProvider } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconSend } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useContext, useState } from "react";
import { useSurveysByTeam } from "../../backend/surveys/surveys.query";
import SelectedTeamContext from "../../context/SelectedTeam";
import { useWaTemplates } from "../../backend/whatsapp/whatsapp.query";
import { WaTemplateStatus } from "../../types/enums";

export function SurveySendDetailComponent({ name, createdAt }) {
  const { colors } = useMantineTheme();
  return (
    <Flex justify={"end"} m="sm">
      <Box
        p="md"
        style={{
          background: "linear-gradient(270deg, #3F5BA9 -18.1%, #49C8E9 416.79%)",
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
        <Text style={{
          fontSize: "0.8rem",
          position: "absolute",
          bottom: "10px",
          right: "10px",
        }}>{dayjs(createdAt).format("DD-MM-YYYY")}</Text>
        <Text style={{
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
  // TODO: add a way to view response or redirect to response with row of waCustomer highlighted
  const { colors } = useMantineTheme();
  return (
    <Container fluid m="sm">
      <Box
        p="md"
        style={{
          backgroundColor: "white",
          height: "80px",
          width: "250px",
          borderRadius: "20px",
          boxShadow: "0 2px 2px 0 rgba(0, 0, 0, 0.2), 0 2px 5px 0 rgba(0, 0, 0, 0.19)",
          borderTopLeftRadius: "0px",
          position: "relative",
        }}

      >
        <Group justify="flex-end">
          <Text >
            {`Filled: ${surveyTitle}`}
          </Text>
        </Group>

        <Text style={{
          color: colors.dark[2],
          fontSize: "0.8rem",
          position: "absolute",
          bottom: "10px",
          left: "10px",
        }}>{dayjs(createdAt).format("DD-MM-YYYY")}</Text>
        <Text style={{
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

interface SendSurveyComponentProps {
  sendHandler: (surveyId: string, templateId: string) => void
}
export function SendSurveyComponent({ sendHandler }: SendSurveyComponentProps) {
  const { colors } = useMantineTheme();
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const { isLoading, error, data: surveys } = useSurveysByTeam(selectedTeamId, !!selectedTeamId)
  const { data: templates, isLoading: isTemplatesLoading } = useWaTemplates()
  const [selectedSurvey, setSelectedSurvey] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  if (isLoading || isTemplatesLoading) return <div>Loading...</div>
  if (error || !Array.isArray(surveys)) {
    return <div>Error</div>
  }

  const approvedTemplates = templates.filter(({ data }) => data.status === WaTemplateStatus.APPROVED)
  const handleSend = () => {
    const template = approvedTemplates.find(({ data }) => data.name === selectedTemplate)
    const survey = surveys.find(({ id }) => id === selectedSurvey)
    if (!template) {
      notifications.show({
        message: "Please select a template to send",
        color: "red",
      })
      return
    }
    if (survey) {
      sendHandler(survey.id, template.id)
      console.log('resetting')
      setSelectedSurvey("")
      setSelectedTemplate("")
    } else {
      notifications.show({
        message: "Please select a survey to send",
        color: "red",
      })
    }
  }
  return (
    <Flex gap={"4px"} p="xs"
      style={{
        width: "100%",
        backgroundColor: "#f0f2f5",
      }}
      align={"center"}>
      <Select
        radius={"sm"}
        placeholder="Select Template"
        data={approvedTemplates.map(({ data }) => ({ label: data.name, value: data.name }))}
        w="200px"
        size="md"
        onChange={setSelectedTemplate}
      />

      <Select
        radius={"sm"}
        placeholder="Search for survey to send"
        data={surveys.map(({ title, id }) => ({ value: id, label: title }))}
        style={{ flexGrow: 1 }}
        size="md"
        onChange={setSelectedSurvey}
      />
        <Button
          radius={"sm"}
          rightSection={<IconSend size="1.1rem" />}
          onClick={handleSend}
          h="40px"
          style={{
            flexGrow: 0
          }}
        >
          Send
        </Button>
    </Flex >
  )
}
