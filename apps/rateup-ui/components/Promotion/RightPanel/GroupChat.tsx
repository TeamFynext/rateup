import { Flex, useMantineTheme, Text, Box, Button, ActionIcon, Avatar, Center, Group, Stack, Tooltip } from "@mantine/core"
import { useRef, useEffect } from "react"
import { useDeleteRespondentFromRGroupMutation, useDeleteRGroupMutation, useRespondentsByRGroup, useRGroupSurveySendHistory, useSendSurveyToRGroupMutation, useUpdateRGroupMutation } from "../../../backend/respondent/rgroup/rgroup.query"
import { SurveySendDetailComponent, SendSurveyComponent } from "../ChatComponents"
import { MainWindowHeader } from "./ChatHeader"
import { IconTrash } from "@tabler/icons-react"
import { DetailsHeader, NameEditor } from "./IndividualChat"
import { useDisclosure } from "@mantine/hooks"
import { AddRespondents, AddRespondentsPanel } from "./AddRespondentsModal"
import CenteredSpinner from "../../Loaders/CenteredSpinner"
import RightPanelRoot from "."

function ChatWindow({ rgroup, openDetails }) {
  const { colors } = useMantineTheme();
  const bottomRef = useRef(null);

  // TODO: BUG: below fetch not refetching immediately after mutation
  const {
    isLoading,
    error,
    data: rGroupSurveySendHistory
  } = useRGroupSurveySendHistory(rgroup.id);
  const sendSurveyMutation = useSendSurveyToRGroupMutation({ rgroupId: rgroup.id })

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (rGroupSurveySendHistory) {
      scrollToBottom()
    }
  }, [rGroupSurveySendHistory])

  if (isLoading || !rGroupSurveySendHistory) return (
    <RightPanelRoot>
      <CenteredSpinner />
    </RightPanelRoot>
  )
  if (error) {
    // console.log(error)
    return <div>Error</div>
  }

  const sendHandler = (surveyId: string, templateId: string) => {
    sendSurveyMutation.mutate({surveyId, templateId})
  }

  return (
    <Flex direction={"column"} sx={{ height: "100%" }}>
      <MainWindowHeader title={rgroup.name} onClick={openDetails} />
      <Box sx={{
        flex: "1 1 0",
        backgroundColor: "white",
        overflowY: "scroll",
      }}
      >
        {
          rGroupSurveySendHistory.map(({ survey, id, createdAt }) => {
            return <SurveySendDetailComponent key={id} name={survey.title} createdAt={createdAt} />
          })
        }
        <div ref={bottomRef}></div>
      </Box>
      <SendSurveyComponent sendHandler={sendHandler} />
    </Flex>
  )
}


interface DetailsWindowProps {
  rgroup: RGroup,
  onClose: () => void
}
function DetailsWindow({ rgroup, onClose }: DetailsWindowProps) {
  const { isLoading, isError, data: respondents } = useRespondentsByRGroup(rgroup.id)
  const deleteRespFromGroupMutation = useDeleteRespondentFromRGroupMutation()
  const deleteRGroup = useDeleteRGroupMutation()
  const updateRGroupMutation = useUpdateRGroupMutation(rgroup.id)
  if (isLoading) return (
    <RightPanelRoot>
      <CenteredSpinner />
    </RightPanelRoot>
  )
  if (isError) return <div>Error</div>

  return (
    <Flex direction={"column"} sx={{ height: "100%", flex: 3, backgroundColor: "#f0f0f0" }}>
      <DetailsHeader title={rgroup.name} onClose={onClose} />
      <Box sx={{
        flex: "1 1 0",
        overflowY: "scroll",
      }}
      >
        <Stack
          py="sm"
          px="xs"
          spacing={"xs"}
          sx={{
            '> *': {
              borderRadius: "8px"
            }
          }}
        >
          <Center sx={{ display: "flex", flexDirection: "column", backgroundColor: "white" }} p="sm">
            <Avatar size={"xl"} radius="xl" />
            <NameEditor name={rgroup.name} onEdit={(name: string) => updateRGroupMutation.mutate({ name })} />
          </Center>
          <Flex direction={"column"} sx={{ backgroundColor: "white" }} p="xs">
            <Text weight={"bolder"} variant="heading" size="lg">Members</Text>
            <Stack>
              {
                respondents.length === 0 ? <Text p="lg">No Members</Text> : (
                  respondents.map((r) => (
                    <Group position="apart">
                      <Group>
                        <Avatar size={"md"} radius="lg " />
                        <Text>{r.name ? r.name : r.phone}</Text>
                      </Group>
                      <Tooltip label={"Remove from group"}>
                        <ActionIcon
                          color="red"
                          onClick={() => {
                            deleteRespFromGroupMutation.mutate({ respondentId: r.id, rgroupId: rgroup.id })
                          }}
                        >
                          <IconTrash />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))
                )
              }
            </Stack>
          </Flex>
          <Stack
           p="sm"
           sx={{ 
            backgroundColor: "inherit",
            '> button': {
              borderRadius: "100px"
            }
         }}>
            <AddRespondents rgroupId={rgroup.id} />
            <Button
              color="red"
              onClick={() => {
                deleteRGroup.mutate(rgroup.id)
              }}
            >
              <Text >Delete Group</Text>
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Flex>
  );
}

export function GroupMainWindow({ rgroup, openCreateGroup }) {
  const { colors } = useMantineTheme();
  const [showDetails, { open, close }] = useDisclosure(false)

  useEffect(() => {
    close()
  }, [rgroup])

  if (!rgroup) return <AddRespondentsPanel placeholder={"Add Group"} onClick={openCreateGroup} />

  if (showDetails) {
    return <DetailsWindow rgroup={rgroup} onClose={close} />
  } else {
    return (<ChatWindow rgroup={rgroup} openDetails={open} />)
  }
}