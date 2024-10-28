import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Badge,
  Checkbox,
  Divider,
  Grid,
  Group,
  Image,
  ScrollArea,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import _ from "lodash";
import { zodResolver } from "mantine-form-zod-resolver";

import { QuestionType2, WaFlowStatus } from "@/types/enums";
import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "@/backend/whatsapp/flow/flow.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedDateInput,
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import useTranslations from "@/dictionaries/useTranslation";
import {
  flowNonInputElements2,
  SAVE_HOTKEY,
  WaNPSQuestions,
  WaNPSQuestions2,
} from "@/utils/constants";
import { googleReviewSupportedTypes, logicSupportedTypes } from "@/utils/data";
import { showErrorToast } from "@/utils/notifications";

import { DataSourceInput } from "./input/DataSource";
import TiptapMarkdown from "./input/TiptapMarkdown";
import useFlowStore from "./utils/store";
import { getInitialValues, getValidationSchema } from "./utils/util";

interface QuestionDetailedViewProps {
  onCreated: ({ type, id }: { type: QuestionType2; id: string }) => void;
  selectedQuestion: {
    type: QuestionType2;
    id: string;
  };
}

enum EditorType {
  LogicEditor = "logic-editor",
  GoogleReviewEditor = "google-review-editor",
  ElementEditor = "element-editor",
}
export function FlowQuestionDetailedView({
  selectedQuestion,
  onCreated,
}: Readonly<QuestionDetailedViewProps>) {
  const [activeEditor, setActiveEditor] = useState<EditorType>(
    EditorType.ElementEditor,
  );

  switch (activeEditor) {
    case EditorType.ElementEditor:
      return (
        <ElementEditor
          selectedQuestion={selectedQuestion}
          onCreated={onCreated}
          setActiveTab={setActiveEditor}
        />
      );
    // TODO: TO IMPLEMENT
    // case EditorType.LogicEditor:
    //   return (
    //     // <FlowLogicEditor
    //     //   afterSave={() => setActiveEditor(EditorType.ElementEditor)}
    //     // />
    //     <></>
    //   );
    // case EditorType.GoogleReviewEditor:
    //   return (
    //     <GoogleReviewEditor
    //       selectedQ={question}
    //       setSelectedQ={handleUpdateQuestion}
    //       setActiveTab={() => {}}
    //       surveyId={surveyId}
    //     />
    //   );
  }
}

interface ElementEditorProps extends QuestionDetailedViewProps {
  setActiveTab: (tab: EditorType) => void;
}
const fieldComponents = {
  text: ContainedTextField,
  number: ContainedNumberInput,
  select: ContainedSelection,
  multiselect: ContainedMultiSelect,
  date: ContainedDateInput,
  dataSource: DataSourceInput,
  richText: TiptapMarkdown,
  // Add other field types and their components here
};
function ElementEditor({
  selectedQuestion,
  onCreated,
  setActiveTab,
}: Readonly<ElementEditorProps>) {
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const { addComponentToScreen, getComponent, updateComponentInScreen } =
    useFlowStore();
  const { translations } = useTranslations();
  const element = getComponent(selectedQuestion.id);
  let initialValues = getInitialValues(selectedQuestion.type);

  const validationSchema = getValidationSchema(selectedQuestion.type);
  const form2 = useForm({
    initialValues: Object.fromEntries(
      Object.entries(initialValues).map(([key, { value }]) => [key, value]),
    ),
    validate: zodResolver(validationSchema),
    // mode: "uncontrolled",
  });

  useEffect(() => {
    if (element) {
      form2.setValues({ ...element });
    }
  }, [element]);

  const isSaving = false;
  const onSubmit = (values) => {
    if (!flowEditable) {
      showErrorToast(translations["Published Flows cannot be edited"]);
      return;
    }
    if (selectedQuestion.id) {
      updateComponentInScreen(selectedQuestion.id, values);
    } else {
      addComponentToScreen(values);
    }
    onCreated({ type: values?.metaType, id: values.id });
  };

  return (
    <form
      onSubmit={form2.onSubmit(onSubmit)}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        justifyContent: "space-between",
      }}
      onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, onSubmit]])}
    >
      <>
        <ScrollArea h={"80%"}>
          <Group justify="space-between">
            <Badge variant="outline" size="lg">
              {QuestionType2?.[form2.getValues().metaType as string]}
            </Badge>
          </Group>
          <Group p={2} gap={2} pr={42}>
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
              <Grid>
                {Object.keys(initialValues).map((field) => {
                  const FieldComponent =
                    fieldComponents[initialValues[field].type] ||
                    ContainedTextField;
                  const extra = initialValues[field]?.extra || {};
                  if (
                    [
                      "required",
                      "enableNpsAnalytics",
                      "type",
                      "id",
                      "metaType",
                      "name",
                    ].includes(field)
                  ) {
                    return null;
                  }
                  return (
                    <Grid.Col
                      key={field}
                      span={
                        field === "data-source" ||
                        initialValues[field].type === "richText"
                          ? 12
                          : 6
                      }
                    >
                      <FieldComponent
                        label={
                          field.charAt(0).toUpperCase() +
                          field.slice(1).replace(/([A-Z])/g, " $1")
                        }
                        placeholder={`Enter ${field}`}
                        {...extra}
                        {...form2.getInputProps(field)}
                        form={form2}
                      />
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Stack>
          </Group>
        </ScrollArea>

        <Stack>
          <Divider />
          <Group justify="space-between" p="xs" px={"sm"}>
            <Group>
              {!flowNonInputElements2.includes(selectedQuestion.type) && (
                <Checkbox
                  label={translations["Required"]}
                  fw={600}
                  {...form2.getInputProps("required", { type: "checkbox" })}
                />
              )}
              {WaNPSQuestions2.includes(selectedQuestion.type) && (
                <Checkbox
                  label={translations["NPS Analytics"]}
                  fw={600}
                  {...form2.getInputProps("enableNpsAnalytics", {
                    type: "checkbox",
                  })}
                />
              )}
            </Group>
            {/* TODO: TO IMPLEMENT */}
            {/* {logicSupportedTypes.includes(selectedQuestion.type as any) && (
              <RateupButtonPrimary
                title={translations["Logic Jump"]}
                leftIcon={
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                    w={30}
                    h={30}
                    fit={"contain"}
                    alt="image of logic jump"
                  />
                }
                size="sm"
                variant="outline"
                // color={theme.colors["whatsapp-green"][6]}
                // onClick={() => {
                //   let save = onSubmit();
                //   save === "saved" && setActiveTab(EditorType.LogicEditor);
                // }}
              />
            )} */}

            {/*  
            <Group>
              
              {googleReviewSupportedTypes.includes(
                selectedQuestion.type as QuestionType,
              ) && (
                <RateupButtonSecondary
                  title={translations["Google Review"]}
                  leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                  size="sm"
                  color={theme.colors["whatsapp-green"][6]}
                  onClick={() => {
                    let save = onSubmit();
                    save === "saved" &&
                      setActiveTab(EditorType.GoogleReviewEditor);
                  }}
                />
              )}
            </Group> */}
            <RateupButtonPrimary
              title={"Save"}
              size="md"
              leftIcon={<IconDeviceSdCard />}
              type={"submit"}
              loading={isSaving}
            />
          </Group>
        </Stack>
      </>
    </form>
  );
}
