import { IconVariable } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useContext } from "react";

import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { getFilteredVariablesForQuestion } from "@/utils/survey/question/question.utils";

const InsertVariableControl = ({
  question,
  editor,
}: {
  question?: Question;
  editor: Editor | null;
}) => {
  const { variables, surveyId } = useContext(SurveyContext);
  const { data: questions } = useQuestions(surveyId ?? "");
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const fileteredVariables = variables?.length
    ? getFilteredVariablesForQuestion(variables, selectedLanguage, questions ?? [], question)
    : [];
  const variablesData = fileteredVariables?.map((val: SurveyVariable) => val?.name) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!variablesData.length}
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="variables"
            title="variables"
            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
          />
        }
      >
        <IconVariable stroke={1.2} size={"1.2rem"} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {variablesData?.map((value) => (
          <DropdownMenuItem
            key={value}
            onClick={() => {
              if (!value) return;
              editor?.commands.insertContent(
                `<variable-component label=${value}></variable-component>`,
              );
            }}
          >
            {value}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InsertVariableControl;
