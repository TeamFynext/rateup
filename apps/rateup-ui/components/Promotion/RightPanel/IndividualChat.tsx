import { Flex, Divider, useMantineTheme, Box, Button, Group, Text, ActionIcon, Center, Avatar, TextInput, Stack } from "@mantine/core"
import dayjs from "dayjs"
import { useState, useRef, useEffect, useContext } from "react"
import { useRespondents, useRespondentSurveySendHistory, useRespondentResponseHistory, useSendSurveyToRespondentMutation, useRGroupsByRespondent } from "../../../backend/respondent/respondent/respondent.query"
import { ResponseComponent, SurveySendDetailComponent, SendSurveyComponent } from "../ChatComponents"
import ImportRespondents from "../ImportRespondents"
import { SideBar } from "../Sidebar"
import { MainWindowHeader } from "./ChatHeader"
import { IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { updateRespondent } from "../../../backend/respondent/respondent/respondent.api"
import { useDeleteRespondentFromRGroupMutation } from "../../../backend/respondent/rgroup/rgroup.query"
import SelectedTeamContext from "../../../context/SelectedTeam"


export function IndividualsPanel() {
  const [selected, setSelected] = useState(0)
  const {selectedTeamId} = useContext(SelectedTeamContext)

  const { isLoading, data: respondents, error } = useRespondents(selectedTeamId)
  if (isLoading || !respondents) return <div>Loading...</div>
  if (error) {
    // console.log(error)
    return <div>Error</div>
  }

  const selectedRespondent = respondents.find((r) => r.id === selected)

  return (
    <Flex sx={{ height: "100%" }}>
      <SideBar items={respondents.map(r => ({ id: r.id, name: r.phone }))} selected={selected} setSelected={setSelected} >
        <ImportRespondents />
      </SideBar>
      <Divider orientation="vertical" />
      <IndividualMainWindow respondent={selectedRespondent} />
    </Flex>
  )
}

function IndividualMainWindow({ respondent }) {
  const { colors } = useMantineTheme();
  const [showDetails, { open, close }] = useDisclosure(false)

  useEffect(() => {
    close()
  }, [respondent])

  if (!respondent) return <div></div>

  if (showDetails) {
    return <DetailsWindow respondent={respondent} onClose={close} />
  } else {
    return (<ChatWindow respondent={respondent} openDetails={open} />)
  }
}



function ChatWindow({ respondent, openDetails }) {
  const { colors } = useMantineTheme();
  const bottomRef = useRef(null);

  // TODO: BUG: below fetch not refetching immediately after mutation
  const { isLoading, error, data: respondentSurveySendHistory } = useRespondentSurveySendHistory(respondent.id);
  const { isLoading: isResLoading, error: isResError, data: respondentResponseHistory } = useRespondentResponseHistory(respondent.id)
  const sendSurveyMutation = useSendSurveyToRespondentMutation({ respondentId: respondent.id })

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (respondentResponseHistory && respondentSurveySendHistory) {
      scrollToBottom()
    }
  }, [respondentResponseHistory, respondentSurveySendHistory])

  if (isLoading || isResLoading) return <div>Loading...</div>
  if (error || !respondentSurveySendHistory || isResError || !respondentResponseHistory) {
    // console.log(error)
    return <div>Error</div>
  }
  const timeline = [
    ...respondentResponseHistory.map(r => ({ ...r, type: "response" })),
    ...respondentSurveySendHistory.map(r => ({ ...r, type: "send" }))
  ].sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)))


  const sendHandler = (surveyId) => {
    sendSurveyMutation.mutate(surveyId)
  }


  return (
    <Flex direction={"column"} sx={{ height: "fill", flex: 3 }}>
      <MainWindowHeader image={null} title={respondent.phone} onClick={openDetails} />
      <Box sx={{
        flex: "1 1 0",
        backgroundColor: "white",
        overflowY: "scroll",
      }}
      >
        <Button onClick={scrollToBottom} variant="light" color="gray" fullWidth>Scroll to bottom</Button>
        {
          timeline.map(({ type, survey, id, createdAt }, index) => {
            if (type === "response") {
              return <ResponseComponent createdAt={createdAt} key={id} surveyTitle={survey.title} />
            } else {
              return <SurveySendDetailComponent key={id} name={survey.title} createdAt={createdAt} />
            }
          })
        }
        <div ref={bottomRef}></div>
      </Box>
      <SendSurveyComponent sendHandler={sendHandler} />
    </Flex>
  )
}

function DetailsWindow({ respondent, onClose }) {
  const { isLoading, isError, data: groups } = useRGroupsByRespondent(respondent.id);
  const deleteFromGroupMutation = useDeleteRespondentFromRGroupMutation()
  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error</div>

  return (
    <Flex direction={"column"} sx={{ height: "fill", flex: 3 }}>
      <DetailsHeader title={respondent.phone} onClose={onClose} />
      <Box sx={{
        flex: "1 1 0",
        backgroundColor: "whitesmoke",
        overflowY: "scroll",
      }}
      >
        <Stack spacing={"xs"} >
          <Center sx={{ display: "flex", flexDirection: "column", backgroundColor: "white" }} p="sm">
            <Avatar size={"xl"} radius="xl" />
            <NameEditor name={respondent.name} onEdit={(name: string) => updateRespondent(respondent.id, { name })} />
          </Center>
          <Flex direction={"column"} sx={{ backgroundColor: "white" }} p="xs">
            <Text weight={"bolder"} variant="heading" size="lg">Groups</Text>
            <Stack>
              {
                groups.length === 0 ? <Text p="lg">No groups</Text> : (
                  groups.map((g) => (
                    <Group position="apart" p="lg">
                      <Group>
                        <Avatar size={"md"} radius="lg " />
                        <Text>{g.name}</Text>
                      </Group>
                      <ActionIcon color="red" onClick={() => { deleteFromGroupMutation.mutate({respondentId: respondent.id, rgroupId: g.id}) }} >
                        <IconTrash />
                      </ActionIcon>
                    </Group>
                  ))
                )
              }
            </Stack>
          </Flex>
        </Stack>
      </Box>
    </Flex>
  );
}

export function NameEditor({ name, onEdit }) {
  const [editName, { open, close }] = useDisclosure(false)
  const [nameValue, setNameValue] = useState(name ? name : "")

  const handleEdit = () => {
    // TODO: create mutation?
    // Currently not invalidating query since we dont want to refetch all respondents just for a name change
    onEdit(nameValue)
      .then(
        () => {
          notifications.show({ message: "Name updated", color: "green", autoClose: 2000 })
          close()
        })
      .catch((e) => {
        console.error(e)
        notifications.show({ message: "Error updating name", color: "red", autoClose: 2000 })
      })
  }

  if (editName) {
    return (
      <Group>
        <TextInput
          value={name}
          onChange={(e) => setNameValue(e.currentTarget.value)}
        />
        <Button onClick={close}>Cancel</Button>
        <Button onClick={handleEdit}>Save</Button>
        <ActionIcon onClick={open}>
          <IconPencil />
        </ActionIcon>
      </Group>)
  }

  return (
    <Group>
      <Text>{nameValue ? nameValue : "Name_Not_Set"}</Text>
      <ActionIcon onClick={open}>
        <IconPencil />
      </ActionIcon>
    </Group>
  )
}

export function DetailsHeader({ title, onClose }) {
  const { colors } = useMantineTheme();
  return (
    <Group sx={{ backgroundColor: colors.dark[7], color: "white" }} p={"sm"} >
      <ActionIcon
        onClick={onClose}
      >
        <IconX />
      </ActionIcon>
      <Text>{title}</Text>
    </Group>
  )
}