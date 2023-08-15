import { Box, Button, Center, Checkbox, Flex, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import { useRespondents } from "../../../backend/respondent/respondent/respondent.query";
import { useAddRespondentsMutation, useRespondentsByRGroup } from "../../../backend/respondent/rgroup/rgroup.query";
import { useContext } from "react";
import SelectedTeamContext from "../../../context/SelectedTeam";

export function AddRespondents({ rgroupId }) {
  const [showModal, { open, close }] = useDisclosure(false)
  return (
    <>
      <Button variant="outline" onClick={open}>
        <Text >Add Respondent</Text>
      </Button>
      <AddModal onClose={close} opened={showModal} rgroupId={rgroupId} />
    </>
  )
}

function AddModal({ opened, onClose, rgroupId }) {

  const { selectedTeamId } = useContext(SelectedTeamContext)

  const { data: respondents, isLoading, error } = useRespondents(selectedTeamId)
  const { data: includedRespondents, isLoading: includedLoading, error: includedError } = useRespondentsByRGroup(rgroupId)
  const addRespondentsMutation = useAddRespondentsMutation(rgroupId)

  const [respondentsToAdd, handlers] = useListState<string>([])
  if (isLoading || includedLoading || !respondents || !includedRespondents) return <div>Loading...</div>
  if (error || includedError) return <div>Error</div>

  // TODO: create api for getting nonMembers?
  const nonGroupMembers = respondents.filter(r => !includedRespondents.some(ir => ir.id === r.id))

  return (
    <Modal opened={opened} onClose={onClose} centered title={"Add Respondents"}>
      {/* TODO: add search */}
      <Stack spacing={"sm"} p="sm" mah={"600px"} sx={{ overflowY: "auto" }}>
        {nonGroupMembers.map(r => {
          return (
            <Group>
              <Checkbox
                checked={respondentsToAdd.includes(r.id)}
                onChange={(e) => {
                  console.log(e.target.checked, respondentsToAdd)
                  if (e.target.checked) {
                    handlers.append(r.id)
                  } else {
                    handlers.filter((id) => id !== r.id)
                  }
                }}
                label={
                  r.name ?
                    `${r.phone}  |  ${r.name}`
                    : r.phone
                }
              >
              </Checkbox>
            </Group>
          )
        })}
      </Stack>
      <Group position="right" >
        <Button
          onClick={() => {
            handlers.setState([])
            onClose()
          }}
          color="red"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            addRespondentsMutation.mutate(respondentsToAdd)
            onClose()
           }}
        disabled={respondentsToAdd.length === 0}
        >
        Add Selected
      </Button>
    </Group>
    </Modal >
  )
}