import {
  Stack,
  Divider,
  Group,
  Checkbox,
  Textarea,
  useMantineTheme,
  Badge,
  Image,
  ScrollArea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import { useState, useContext, useEffect } from "react";
import {
  useQuestionCreateMutation,
  useQuestionUpdateMutation,
} from "../../../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { QuestionType, SurveyType } from "../../../../../types/enums";
import {
  logicSupportedTypes,
  googleReviewSupportedTypes,
} from "../../../../../utils/data";
import { showErrorToast } from "../../../../../utils/notifications";
import {
  getInitialQuestionValues,
  validateAllLanguagesArePopulated,
} from "../../../../../utils/questions";
import {
  RateupButtonSecondary,
  RateupButtonPrimary,
} from "../../../../Button/RateupButtons";
import { QuestionTabsEnum } from "../../../surveys/WaEditSurvey";
import {
  WA_HEADER_CHAR_LIMIT,
  WA_BODY_CHAR_LIMIT,
  WA_FLOW_LABEL_CHAR_LIMIT,
  WA_FLOW_HEADING_CHAR_LIMIT,
  WA_FLOW_BODY_CHAR_LIMIT,
} from "../../../whatsappConfig";
import { WaQuestionExtraProps } from "../../../surveys/WaQuestionDetailedView";
import { EditFlowContext } from "./EditFlowContext";

interface QuestionDetailedViewProps {
  question: Question;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  surveyId: string;
  onCreated: (q: Question) => void;
}
export function FlowQuestionDetailedView({
  question,
  setActiveTab,
  surveyLanguages,
  setSelectedLanguage,
  surveyId,
  onCreated,
}: QuestionDetailedViewProps) {
  const theme = useMantineTheme();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { flowJson } = useContext(EditFlowContext);
  const [previewOpened, setPreviewOpened] = useState(false);

  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
  });
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const form = useForm({
    initialValues: getInitialQuestionValues(
      question,
      surveyLanguages,
      SurveyType.WaFlow,
    ),
    validate: {
      title: (title) => {
        const value = title[selectedLanguage];
        if (value.trim().length > WA_FLOW_LABEL_CHAR_LIMIT) {
          return `Max ${WA_FLOW_HEADING_CHAR_LIMIT} charecters allowed`;
        }
      },
      description: (description) => {
        const value = description[selectedLanguage];
        if (value.trim().length > WA_HEADER_CHAR_LIMIT) {
          return `Max ${WA_FLOW_BODY_CHAR_LIMIT} charecters allowed`;
        }
      },
    },
  });

  const incompleteLanguages = validateAllLanguagesArePopulated(
    form.values as Question,
    surveyLanguages,
    ["choices"],
  );

  // Copy of handleSave from QuestionDetailedView.tsx
  const handleSave = () => {
    if (
      (!form.values.description[selectedLanguage] ||
        form.values.description[selectedLanguage] == "") &&
      (!form.values.title[selectedLanguage] ||
        form.values.title[selectedLanguage] == "") &&
      (!form.values.label[selectedLanguage] ||
        form.values.label[selectedLanguage] == "")
    ) {
      showErrorToast("Atleast one of title, description or label is required");
      return "error";
    } else {
      if (incompleteLanguages.length > 0) {
        setSelectedLanguage(incompleteLanguages[0]);
        return "error";
      }

      // Checking if its a new question
      if (!question.id) {
        // Creating new question
        questionCreateMutation.mutate(form.values, {
          onSuccess: (r) => {
            onCreated(r.data);
          },
        });
      } else {
        // Updating existing question
        questionUpdateMutation.mutate({ qId: question.id, data: form.values });
      }
    }

    return "saved";
  };

  const isSaving =
    questionCreateMutation.isPending || questionUpdateMutation.isPending;
  return (
    <Stack
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      justify="space-between"
    >
      <ScrollArea h={"80%"}>
        <Group justify="space-between">
          <Badge variant="outline" size="lg">
            {question.type}
          </Badge>
        </Group>
        <Group p={2} gap={2} pr={42}>
          {/* TODO: Preview button & language-complete status component are overlapping */}
          <Stack
            style={{
              height: "100%",
              overflowY: "auto",
              overflowX: "clip",
              flex: 1,
            }}
            gap={0}
            p={"sm"}
          >
            <Textarea
              fw={800}
              fz="lg"
              styles={{
                input: {
                  fontSize: "1.75rem",
                  fontWeight: 700, // set custom font size for this TextInput
                },
              }}
              style={{
                marginBottom: "20px", // add 30px bottom margin
              }}
              variant="unstyled"
              autosize
              maxRows={3}
              placeholder="Enter question title here *"
              {...form.getInputProps(`title.${selectedLanguage}`)}
              value={form.values.title[selectedLanguage]}
            />
            <Textarea
              variant="unstyled"
              placeholder="Enter question description here"
              {...form.getInputProps(`description.${selectedLanguage}`)}
              value={form.values.description[selectedLanguage]}
              styles={{
                input: {
                  fontSize: "1.1rem",
                  fontWeight: 400, // set custom font size for this TextInput
                },
              }}
            />
            <Textarea
              variant="unstyled"
              placeholder="Enter question label here"
              {...form.getInputProps(`label.${selectedLanguage}`)}
              value={form.values.label[selectedLanguage]}
              styles={{
                input: {
                  fontSize: "1.1rem",
                  fontWeight: 400, // set custom font size for this TextInput
                },
              }}
            />
            <WaQuestionExtraProps form={form} question={question} />
          </Stack>
        </Group>
      </ScrollArea>

      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <Checkbox
            label="Required"
            fw={600}
            {...form.getInputProps("required", { type: "checkbox" })}
          />
          <Group>
            {logicSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Logic Jump"}
                leftIcon={
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                    w={30}
                    h={30}
                    fit={"contain"}
                  />
                }
                size="sm"
                color={theme.colors["whatsapp-green"][6]}
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.LogicEditor);
                }}
              />
            )}
            {/* TODO: Implement Custom Validation*/}
            {googleReviewSupportedTypes.includes(question?.type) && (
              <RateupButtonSecondary
                title={"Google Review"}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
                color={theme.colors["whatsapp-green"][6]}
                onClick={() => {
                  let save = handleSave();
                  save === "saved" &&
                    setActiveTab(QuestionTabsEnum.GoogleReviewEditor);
                }}
              />
            )}
          </Group>
          <RateupButtonPrimary
            title={
              incompleteLanguages.length > 1 ||
              (incompleteLanguages.length > 0 &&
                incompleteLanguages[0] !== selectedLanguage)
                ? "Fill Next Language"
                : "Save"
            }
            size="md"
            leftIcon={<IconDeviceSdCard />}
            onClick={handleSave}
            loading={isSaving}
          />
        </Group>
      </Stack>
    </Stack>
  );
}
