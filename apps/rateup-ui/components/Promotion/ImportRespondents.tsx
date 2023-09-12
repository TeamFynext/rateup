import { ActionIcon, Button, Modal, Space, Stack, Text, TextInput, Textarea } from '@mantine/core'
import React, { useContext, useState } from 'react'
import CSVReader from './CSVReader'
import { readString } from 'react-papaparse'
import { ParseResult } from 'papaparse'
import { useCreateRespondentsMutation } from '../../backend/respondent/respondent/respondent.query'
import { useDisclosure } from '@mantine/hooks'
import { IconPlus } from '@tabler/icons-react'
import { useCreateRGroupMutation } from '../../backend/respondent/rgroup/rgroup.query'
import SelectedTeamContext from '../../context/SelectedTeam'


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


export const ImportRespondentsModal = ({ opened, close, createGroup }) => {
  const [groupName, setGroupName] = useState("")
  const [csvData, setCsvData] = useState("")
  const { selectedTeamId } = useContext(SelectedTeamContext)
  const createRespondentsMutation = useCreateRespondentsMutation(selectedTeamId);
  const createGroupMutation = useCreateRGroupMutation(selectedTeamId);

  const handleImport = async (csvString) => {
    const results = await parseCSV(csvString);
    if (createGroup) {
      createGroupMutation.mutate({ rgroupName: groupName, phoneNumbers: results });
    } else {
      createRespondentsMutation.mutate(results);
    }
    setGroupName("");
    setCsvData("");
    close();
  }

  return (
    <Modal opened={opened} onClose={close} title="Import Respondents" centered >
      <Stack spacing="xs" style={{ marginBottom: 10 }}>
        {createGroup && (
          <TextInput
            placeholder="Group Name"
            label="Group Name"
            value={groupName}
            onChange={(event) => setGroupName(event.currentTarget.value)}
          />
        )}
        <Text sx={{
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
function ImportRespondents({ onClick }) {

  return (
      <ActionIcon
        onClick={onClick}
        variant="filled"
        radius={"xl"}
        size={"xl"}
        color="yellow"
        sx={{ position: "absolute", bottom: "1rem", right: "1rem" }}
      >
        <IconPlus size="1.5rem" />
      </ActionIcon>
  )
}
export default ImportRespondents