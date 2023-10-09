import { Button, Center, Checkbox, Flex, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import { useContext } from "react";
import SelectedTeamContext from "../../../context/SelectedTeam";
import { IconUserPlus } from "@tabler/icons-react";
import { useWaCustomers } from "../../../backend/whatsapp/customer/waCustomer/waCustomer.query";
import { useWaCustomersByWaCustomerGroup, useAddWaCustomersMutation } from "../../../backend/whatsapp/customer/waCustomerGroup/waCustomerGroup.query";
import classes from "./style.module.css";
import RightPanelRoot from ".";

export function AddWaCustomers({ rgroupId }) {
  const [showModal, { open, close }] = useDisclosure(false)
  return (
    <>
      <Button variant="outline" onClick={open}>
        <Text >Add WaCustomer</Text>
      </Button>
      <AddModal onClose={close} opened={showModal} rgroupId={rgroupId} />
    </>
  )
}

function AddModal({ opened, onClose, rgroupId }) {

  const { selectedTeamId } = useContext(SelectedTeamContext)

  const { data: waCustomers, isLoading, error } = useWaCustomers(selectedTeamId, !!selectedTeamId)
  const { data: includedWaCustomers, isLoading: includedLoading, error: includedError } = useWaCustomersByWaCustomerGroup(rgroupId)
  const addWaCustomersMutation = useAddWaCustomersMutation(rgroupId)

  const [waCustomersToAdd, handlers] = useListState<string>([])
  if (isLoading || includedLoading || !waCustomers || !includedWaCustomers) return <div>Loading...</div>
  if (error || includedError) return <div>Error</div>

  // TODO: create api for getting nonMembers?
  const nonGroupMembers = waCustomers.filter(r => !includedWaCustomers.some(ir => ir.id === r.id))

  return (
    <Modal opened={opened} onClose={onClose} centered title={"Add WaCustomers"}>
      {/* TODO: add search */}
      <Stack gap={"sm"} p="sm" mah={"600px"} style={{ overflowY: "auto" }}>
        {nonGroupMembers.map(r => {
          return (
            <Group>
              <Checkbox
                checked={waCustomersToAdd.includes(r.id)}
                onChange={(e) => {
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
      <Group justify="flex-end" >
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
            addWaCustomersMutation.mutate(waCustomersToAdd)
            onClose()
          }}
          disabled={waCustomersToAdd.length === 0}
        >
          Add Selected
        </Button>
      </Group>
    </Modal >
  )
}

export function AddWaCustomersPanel({ onClick, placeholder }) {
  return (
    <Center h="100%">
      <Stack onClick={onClick} align="center" style={{ cursor: "pointer" }} >
        <IconUserPlus size={"75px"} />
        <Text>{placeholder}</Text>
      </Stack>
    </Center>
  )
}