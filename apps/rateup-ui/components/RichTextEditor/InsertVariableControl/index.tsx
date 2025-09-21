"use client";

import { useContext } from "react";

import { ActionIcon, Menu } from "@mantine/core";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import { IconVariable } from "@tabler/icons-react";

import { useQuestions } from "@/backend/surveys/questions/questions.query";
import SelectedLanguageContext from "@/context/SelectedLanguage";
import SurveyContext from "@/context/SurveyContext";
import { getFilteredVariablesForQuestion } from "@/utils/survey/question/question.utils";

const InsertVariableControl = ({ question }) => {
  const { editor } = useRichTextEditorContext();
  const { variables, surveyId } = useContext(SurveyContext);
  const { data: questions } = useQuestions(surveyId);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const fileteredVariables = variables?.length
    ? getFilteredVariablesForQuestion(
        variables,
        selectedLanguage,
        questions,
        question,
      )
    : [];
  const variablesData =
    fileteredVariables?.map((val: SurveyVariable) => val?.name) ?? [];

  return (
    <RichTextEditor.Control aria-label="variables" title="variables">
      <Menu
        position="bottom-start"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
        shadow="md"
        disabled={!variablesData.length}
      >
        <Menu.Target>
          <IconVariable stroke={1.2} size={"1.2rem"} />
        </Menu.Target>
        <Menu.Dropdown>
          {variablesData?.map((value) => (
            <Menu.Item
              key={value}
              onClick={() => {
                if (!value) return;
                editor?.commands.insertContent(
                  `<variable-component label=${value}></variable-component>`,
                );
              }}
            >
              {value}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </RichTextEditor.Control>
  );
};

export default InsertVariableControl;
