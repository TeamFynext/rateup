import { ActionIcon, Button, Modal, Space, Stack, Text, TextInput } from '@mantine/core'
import React, { useContext, useState } from 'react'
import CSVReader from './CSVReader'
import { readString } from 'react-papaparse'
import { ParseResult } from 'papaparse'
import { IconPlus } from '@tabler/icons-react'
import SelectedTeamContext from '../../context/SelectedTeam'
import { useCreateWaCustomersMutation } from '../../backend/whatsapp/customer/waCustomer/waCustomer.query'
import { useCreateWaCustomerGroupMutation } from '../../backend/whatsapp/customer/waCustomerGroup/waCustomerGroup.query'


const placeholder =
`FORMAT:
  phone,name
  917559054321,John Doe
  919550054321,Jane Doe

RULES:
  - phone must have country code without '+' sign
  - name is optional
  - Must select team before importing (top right corner)

`
const parseCSV = (csvString: string): Promise<Array<{ phone: string, name?: string }>> => {
  return new Promise((resolve, reject) => {
    // TODO: adding transform functions throws error. Need to fix this.
    // TODO: add transform functions to trim & make case insensitive
    readString(csvString, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results: ParseResult<any>) => {
        if (results.errors.length > 0) {
          reject(results.errors)
        }
        resolve(results.data)
      }
    })
  })
}


export const ImportWaCustomersModal = ({ opened, close, createGroup }) => {
  const [groupName, setGroupName] = useState("")
  const [csvData, setCsvData] = useState("")
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const createWaCustomersMutation = useCreateWaCustomersMutation(selectedTeamId);
  const createGroupMutation = useCreateWaCustomerGroupMutation(selectedTeamId);

  const handleImport = async (csvString) => {
    const results = await parseCSV(csvString);
    if (createGroup) {
      createGroupMutation.mutate({ rgroupName: groupName, phoneNumbers: results });
    } else {
      createWaCustomersMutation.mutate(results);
    }
    setGroupName("");
    setCsvData("");
    close();
  }

  return (
    <Modal opened={opened} onClose={close} title="Import WaCustomers" centered >
      <Stack gap="xs" style={{ marginBottom: 10 }}>
        {createGroup && (
          <TextInput
            placeholder="Group Name"
            label="Group Name"
            value={groupName}
            onChange={(event) => setGroupName(event.currentTarget.value)}
          />
        )}
        <Text style={{
          whiteSpace: "pre-wrap",
        }}>{placeholder}</Text>
        {/* TODO: replace below with a simple file upload & start parsing only when clicking 'Import' Button */}
        <CSVReader setCsvData={setCsvData} />
        <Space />
        <Button
          onClick={() => handleImport(csvData)}
          disabled={!csvData}
          variant="outline"
        >
          Import
        </Button>
      </Stack>
    </Modal>
  )
}
function ImportWaCustomers({ onClick }) {

  return (
      <ActionIcon
        onClick={onClick}
        variant="filled"
        radius={"xl"}
        size={"xl"}
        color="yellow"
        style={{ position: "absolute", bottom: "1rem", right: "1rem" }}
      >
        <IconPlus size="1.5rem" />
      </ActionIcon>
  )
}
export default ImportWaCustomers