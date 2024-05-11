import { useContext } from "react";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import {
  CheckIcon,
  Radio,
  ScrollAreaAutosize,
  Stack,
  Table,
} from "@mantine/core";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";

interface MCQGridFormProps {
  features: any;
  previewChoices?: Choice[];
}
const MCQGridForm = ({ features, previewChoices }: MCQGridFormProps) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { selectedQ } = useContext(SelectedQContext);
  const choices =
    selectedQ?.choices[selectedLanguage] || previewChoices?.[selectedLanguage];
  const questions = features?.[selectedLanguage].questions;

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const handleUpdateResponse = (value, question) => {
    const choice = choices?.find((ch) => ch.value === value);
    updateResponse({ ...response, [question]: choice });
  };

  const rows = questions?.map((question) => (
    <Table.Tr key={question}>
      <Table.Td maw={400}>{question}</Table.Td>
      {choices?.map((choice) => (
        <Table.Td key={choice?.value} miw={100}>
          <Radio
            value={choice?.value}
            checked={response?.[question]?.value == choice?.value}
            onChange={(e) =>
              handleUpdateResponse(e.currentTarget.value, question)
            }
            size="md"
            icon={CheckIcon}
          />
        </Table.Td>
      ))}
    </Table.Tr>
  ));

  const columns = choices?.map((choice) => (
    <Table.Th key={choice?.value} miw={100}>
      {choice?.value}
    </Table.Th>
  ));

  return (
    <Stack w={"100%"}>
      <ScrollAreaAutosize scrollbarSize={6} mah={500}>
        <Table
          horizontalSpacing={"md"}
          verticalSpacing={"md"}
          stickyHeader
          withRowBorders={false}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th maw={400} />
              {columns}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollAreaAutosize>
    </Stack>
  );
};

export default MCQGridForm;
