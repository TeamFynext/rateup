import { useContext } from "react";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import { CheckIcon, Radio, ScrollArea, Stack, Table } from "@mantine/core";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { useMediaQuery } from "@mantine/hooks";
import { sampleChoices } from "../../../../../utils/constants/forms";

interface MCQGridFormProps {
  features: any;
  previewChoices?: Choice[];
}
const MCQGridForm = ({ features, previewChoices }: MCQGridFormProps) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { selectedQ } = useContext(SelectedQContext);
  const choices =
    selectedQ?.choices[selectedLanguage] ||
    previewChoices?.[selectedLanguage] ||
    sampleChoices;
  const questions = features?.[selectedLanguage].questions;

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const handleUpdateResponse = (value, question) => {
    const choice = choices?.find((ch) => ch.value === value);
    updateResponse({ ...response, [question]: choice });
  };

  const isMobile = useMediaQuery("(max-width: 480px)");

  const rows = questions?.map((question) => (
    <Table.Tr key={question}>
      <Table.Td
        style={{ position: "sticky", left: 0, zIndex: 1 }}
        bg={`#E4E6ED`}
      >
        {question}
      </Table.Td>
      {choices?.map((choice) => (
        <Table.Td key={choice?.value}>
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
    <Table.Th
      key={choice?.value}
      w={100}
      style={{ position: "sticky", left: 0, top: 0, zIndex: 1 }}
      bg={"#CDCDCD"}
    >
      {choice?.value}
    </Table.Th>
  ));

  return (
    <Stack w={"100%"}>
      <ScrollArea scrollbarSize={6} h={450} w={isMobile ? 380 : 750}>
        <Table
          horizontalSpacing={"md"}
          verticalSpacing={"md"}
          withRowBorders={false}
          highlightOnHover
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{ position: "sticky", left: 0, top: 0, zIndex: 2 }}
                bg={"#CDCDCD"}
              ></Table.Th>
              {columns}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
};

export default MCQGridForm;
