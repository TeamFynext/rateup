import {
  Stack,
  TextInput,
  Divider,
  Group,
  Checkbox,
  Textarea,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconX, IconDeviceSdCard, IconEdit } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useState, useContext, useEffect } from "react";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType } from "../../../types/enums";
import { logicSupportedTypes } from "../../../utils/data";
import {
  RateupButtonSecondary,
  RateupButtonOutline,
} from "../../Button/RateupButtons";
import { QuestionTabsEnum } from "./WaEditSurvey";
import { LengthTracker } from "../../input/LengthTracker";
import { WA_BODY_CHAR_LIMIT, WA_HEADER_CHAR_LIMIT } from "../whatsappConfig";
import { WaListMessageItemsCreator } from "./WaListMessageItemsCreator";
import { ChoicesCreator } from "../../Survey/Question/ChoicesCreator";

interface QuestionDetailedViewProps {
  question: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  setQuestionState: React.Dispatch<React.SetStateAction<Question>>;
}
export function WaQuestionDetailedView({
  question,
  setSelectedQ,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
  setQuestionState,
}: QuestionDetailedViewProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [isSaving, setIsSaving] = useState(false);

  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
    setIsSaving,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
    setIsSaving,
  });

  const form = useForm({
    initialValues: {
      title: question?.title[selectedLanguage] || "",
      description: question?.description[selectedLanguage] || "",
      required: question?.required,
      type: question?.type,
      choices: question?.choices,
      sections: question?.sections || {},
    },
    validate: {
      description: (value) => {
        //-----------whatsapp text message support only 4096 charecters only----------
        if (value.trim().length > 4096) {
          return "Charecter length exceed (Max 4096 charecters allowed)";
        } else if (value.trim().length == 0) {
          return "message is required";
        }
      },
    },
  });

  useEffect(() => {
    setQuestionState((prevQ) => {
      let updatedQ = { ...prevQ };
      updatedQ.title[selectedLanguage] = form.values.title;
      updatedQ.description[selectedLanguage] = form.values.description;
      if (form.values.choices) {
        updatedQ.choices = form.values.choices;
      } else if (form.values.sections) {
        updatedQ.sections = form.values.sections as any;
      }
      return updatedQ;
    });
  }, [
    form.values.title,
    form.values.description,
    form.values.choices,
    form.values.sections,
  ]);

  const handleSave = () => {
    setIsSaving(true);
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      setIsSaving(false);
      return "error";
    } else {
      // converting to expected format
      const { title, description, ...restOfTheData } = form.values;
      const formattedTitle = { ...question.title, [selectedLanguage]: title };
      const formattedDescription = {
        ...question.description,
        [selectedLanguage]: description,
      };

      // TODO: only send modified fields
      const data = {
        title: formattedTitle,
        description: formattedDescription,
        ...restOfTheData,
      };
      // Checking if its a new question
      if (!question.id) {
        // Creating new question
        questionCreateMutation.mutateAsync(data).then((r) => {
          const newQ: Question = r.data;
          setSelectedQ(newQ);
        });
      } else {
        // Updating existing question
        questionUpdateMutation.mutate({ qId: question.id, data: data });
      }

      let langList: string[] = surveyLanguages;
      const missingLangs = [];

      langList.forEach((language: string) => {
        if (language == selectedLanguage) {
          return;
        }
        if (!question.title[language] || question.title[language] == "") {
          missingLangs.push(language);
        }
      });

      if (missingLangs.length > 0) {
        setIsSaving(false);
        setSelectedLanguage(missingLangs[0]);
        form.setFieldValue(title, "");
        form.validate();
        notifications.show({
          id: "errorn",
          color: "red",
          title: `"${missingLangs[0]}" Question is missing`,
          message: `Add question in ${missingLangs[0]} language  also`,
          icon: <IconX size="1rem" />,
          //autoClose: 5000,
          // position: "bottom-center"
        });
        return "error";
      }
    }

    //setIsSaving(false);
    return "saved";
  };

  // TODO: show question type somewhere
  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      gap={"xs"}
    >
      <Stack
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "clip",
        }}
        gap={0}
      >
        <Textarea
          fw={800}
          mx="sm"
          maw={"95%"}
          autosize
          maxRows={4}
          variant="unstyled"
          placeholder="Enter message body here *"
          style={{
            fontSize: "28px",
          }}
          rightSection={
            <LengthTracker
              string={form.values.description}
              maxValue={WA_BODY_CHAR_LIMIT}
            />
          }
          {...form.getInputProps("description")}
        />
        <TextInput
          maw={"95%"}
          variant="unstyled"
          mx="sm"
          style={{
            fontSize: "22px",
          }}
          placeholder="Enter message header here (optional)"
          rightSection={
            <LengthTracker
              string={form.values.title}
              maxValue={WA_HEADER_CHAR_LIMIT}
            />
          }
          {...form.getInputProps("title")}
          //TODO : add error free autosave solution
        />
        <ExtraProps form={form} question={question} />
      </Stack>

      <Divider />

      <Stack
        pt="sm"
        style={{ height: "40px", position: "sticky", bottom: "0" }}
      >
        <Group justify="space-between" gap="sm">
          <Group>
            <Checkbox
              label="Required"
              color="dark"
              fw={600}
              {...form.getInputProps("required", { type: "checkbox" })}
            />
            {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonOutline
                title={"Logic Jump"}
                leftIcon={<IconEdit />}
                size="sm"
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.LogicEditor);
                }}
              />
            )}
            {/* TODO: Implement Google review & Custom Validation*/}
          </Group>
          <RateupButtonSecondary
            title={"Save"}
            size="md"
            onClick={handleSave}
            leftIcon={<IconDeviceSdCard />}
            loading={isSaving}
          />
        </Group>

        <Group justify="flex-start" gap="md"></Group>
      </Stack>
    </Stack>
  );
}
interface ExtraPropsProps {
  form: UseFormReturnType<any>;
  question: Question;
}
function ExtraProps({ form, question }: ExtraPropsProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  switch (question.type) {
    case QuestionType.MCQ:
    case QuestionType.MSQ:
    case QuestionType.DDSS:
    case QuestionType.DDMS:
      return <ChoicesCreator qId={question.id} form={form} />;
    case QuestionType.WaButtons:
      return (
        <ChoicesCreator
          qId={question.id}
          form={form}
          maxChoiceCount={3}
          maxCharCount={20}
        />
      );
    case QuestionType.WaList:
      return (
        <WaListMessageItemsCreator
          initialSections={form.values.sections?.[selectedLanguage]}
          saveSections={(sections) => {
            form.setFieldValue(`sections.${selectedLanguage}`, sections);
          }}
        />
      );
    default:
      return null;
  }
}
