"use client";

import { useContext, useEffect, useRef, useState } from "react";

import {
  CheckIcon,
  Divider,
  isLightColor,
  Radio,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Table,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { sampleChoices } from "@/utils/constants/forms.ts";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";

interface MCQGridFormProps {
  features: any;
  previewChoices?: Choice[];
  isPreview?: boolean;
}
const MCQGridForm = ({
  features,
  previewChoices,
  isPreview,
}: MCQGridFormProps) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { selectedQ } = useContext(SelectedQContext);
  const choices =
    selectedQ?.choices?.[selectedLanguage] ||
    previewChoices?.[selectedLanguage] ||
    sampleChoices;
  const questions = features?.[selectedLanguage]?.questions;

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const tableRef = useRef(null);
  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const handleUpdateResponse = (value, question) => {
    const choice = choices?.find((ch) => ch.value === value);
    updateResponse({ ...response, [question]: choice });
  };

  const selectedPreview = useSelectedPreview();
  const isMobile =
    useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const [tableHeight, setTableHeight] = useState<number>(null);
  const [tableWidth, setTableWidth] = useState<number>(null);

  useEffect(() => {
    if (tableRef.current) {
      const height = tableRef.current.clientHeight;
      const width = tableRef.current.clientWidth;
      setTableHeight(height);
      setTableWidth(width);
    }
  }, []);

  if (isMobile)
    return (
      <MCQGridMobileForm
        choices={choices}
        questions={questions}
        handleUpdateResponse={handleUpdateResponse}
      />
    );

  const TableComponent = () => {
    const rows = questions?.map((question) => (
      <Table.Tr key={question}>
        <Table.Td
          style={{ position: "sticky", left: 0, top: 0, zIndex: 1 }}
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
              color={themePrimaryColor}
              iconColor={
                isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF"
              }
            />
          </Table.Td>
        ))}
      </Table.Tr>
    ));

    const columns = choices?.map((choice) => (
      <Table.Th
        key={choice?.value}
        w={100}
        style={{ position: "sticky", top: 0, zIndex: 2 }}
        bg={"#CDCDCD"}
      >
        {choice?.value}
      </Table.Th>
    ));

    return (
      <Table
        horizontalSpacing={"md"}
        verticalSpacing={"md"}
        withRowBorders={false}
        highlightOnHover
        ref={tableRef}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th
              style={{ position: "sticky", top: 0, left: 0, zIndex: 3 }}
              bg={"#CDCDCD"}
            ></Table.Th>
            {columns}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    );
  };

  return (
    <Stack justify="center" w={isPreview ? 700 : "100%"}>
      {tableHeight > 450 || tableWidth > 900 ? (
        <ScrollArea
          scrollbarSize={6}
          h={tableHeight > 450 ? "65vh" : "100%"}
          w={isPreview ? 700 : 900}
        >
          <TableComponent />
        </ScrollArea>
      ) : (
        <TableComponent />
      )}
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
  const themePrimaryColor = theme.colors.primaryColor
    ? theme.colors.primaryColor[5]
    : "#1C518E";
  const textColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";
  const surveyTheme = useSurveyThemeData()?.surveyTheme;
  const titleColor = surveyTheme?.title.styles?.color;

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
          <Title order={5} c={titleColor || "black"}>
            {question}
          </Title>
          <Stack>
            {choices?.map((choice) => {
              const isSelected = response?.[question]?.value == choice?.value;
              return (
                <UnstyledButton
                  key={choice?.value as string}
                  onClick={() => handleUpdateResponse(choice?.value, question)}
                  bg={isSelected ? themePrimaryColor : "transparent"}
                  style={{
                    borderRadius: "5px",
                    border: `1px solid ${themePrimaryColor}`,
                  }}
                  p={"xs"}
                >
                  <Radio
                    value={choice?.value as string}
                    checked={response?.[question]?.value == choice?.value}
                    onChange={(e) =>
                      handleUpdateResponse(e.currentTarget.value, question)
                    }
                    size="md"
                    icon={CheckIcon}
                    label={choice?.value as string}
                    c={isSelected ? textColor : themePrimaryColor}
                    variant="outline"
                    color={textColor}
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

