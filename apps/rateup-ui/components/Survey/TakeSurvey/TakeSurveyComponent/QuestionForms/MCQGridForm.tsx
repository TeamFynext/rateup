import { useContext } from "react";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import {
  CheckIcon,
  Radio,
  ScrollArea,
  Stack,
  Table,
  Title,
  Group,
  UnstyledButton,
  useMantineTheme,
  ScrollAreaAutosize,
  Divider,
} from "@mantine/core";
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
    selectedQ?.choices?.[selectedLanguage] ||
    previewChoices?.[selectedLanguage] ||
    sampleChoices;
  const questions = features?.[selectedLanguage]?.questions;

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const handleUpdateResponse = (value, question) => {
    const choice = choices?.find((ch) => ch.value === value);
    updateResponse({ ...response, [question]: choice });
  };

  const isMobile = useMediaQuery("(max-width: 480px)");

  if (isMobile)
    return (
      <MCQGridMobileForm
        choices={choices}
        questions={questions}
        handleUpdateResponse={handleUpdateResponse}
      />
    );

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
    <Stack w={"100%"} justify="center">
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

interface MCQGridMobileFormProps {
  choices: Choice[];
  questions: string[];
  handleUpdateResponse: (value, question) => void;
}
const MCQGridMobileForm = ({
  choices,
  questions,
  handleUpdateResponse,
}: MCQGridMobileFormProps) => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  return (
    <ScrollAreaAutosize
      mah={"100%"}
      w={"100%"}
      scrollbarSize={4}
      offsetScrollbars
      p={"sm"}
    >
      {questions?.map((question, index) => (
        <Stack key={index}>
          <Title order={5}>{question}</Title>
          <Stack>
            {choices?.map((choice) => {
              const isSelected = response?.[question]?.value == choice?.value;
              return (
                <UnstyledButton
                  key={choice?.value}
                  onClick={() => handleUpdateResponse(choice?.value, question)}
                  bg={
                    isSelected
                      ? `var(--mantine-color-${theme.primaryColor}-filled)`
                      : "var(--mantine-color-gray-3)"
                  }
                  style={{ borderRadius: "5px" }}
                  p={"xs"}
                >
                  <Radio
                    value={choice?.value}
                    checked={response?.[question]?.value == choice?.value}
                    onChange={(e) =>
                      handleUpdateResponse(e.currentTarget.value, question)
                    }
                    size="md"
                    icon={CheckIcon}
                    label={choice?.value}
                    c={
                      isSelected
                        ? "var(--mantine-color-white)"
                        : `var(--mantine-color-${theme.primaryColor}-outline)`
                    }
                    variant="outline"
                    styles={{
                      radio: {
                        backgroundColor: "var(--mantine-color-white)",
                      },
                    }}
                  />
                </UnstyledButton>
              );
            })}
          </Stack>
          {index + 1 < questions?.length && (
            <Divider my={"sm"} c={"var(--mantine-color-gray-6)"} size={"sm"} />
          )}
        </Stack>
      ))}
    </ScrollAreaAutosize>
  );
};

export default MCQGridForm;
