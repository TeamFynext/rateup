import { memo, useCallback, useEffect, useMemo } from "react";

import {
  Badge,
  Checkbox,
  Divider,
  Grid,
  Group,
  Image,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconBrandGoogle, IconDeviceSdCard } from "@tabler/icons-react";
import dayjs from "dayjs";
import { zodResolver } from "mantine-form-zod-resolver";

import { QuestionType2 } from "@/types/enums";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  ContainedDatePickerInput,
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
  ContainedTextInputWithCounter,
} from "@/components/input/ContainedInput/ContainedInput";
import useTranslations from "@/dictionaries/useTranslation";
import {
  flowNonInputElements2,
  SAVE_HOTKEY,
  WaNPSQuestions2,
} from "@/utils/constants";
import { googleReviewSupportedTypes2, logicSupportedTypes } from "@/utils/data";
import { showErrorToast } from "@/utils/notifications";

import { DataSourceInput } from "../input/DataSource";
import ImageInput from "../input/ImageInput";
import TiptapMarkdown from "../input/TiptapMarkdown";
import useFlowStore, { EditorType } from "../utils/store";
import { getInitialValues, getValidationSchema } from "../utils/util";

// Memoize field components to prevent re-renders
const FieldComponentMap = {
  text: memo(ContainedTextInputWithCounter),
  number: memo(ContainedNumberInput),
  select: memo(ContainedSelection),
  multiselect: memo(ContainedMultiSelect),
  date: memo(ContainedDatePickerInput),
  dataSource: memo(DataSourceInput),
  richText: memo(TiptapMarkdown),
  image: memo(ImageInput),
};

function ElementEditor() {
  const {
    addComponentToScreen,
    updateComponentInScreen,
    getCurrentElement,
    currentElementType,
    flowEditable,
    setDetailActiveEditor,
  } = useFlowStore();
  const { translations } = useTranslations();
  const element = getCurrentElement();
  const initialValues = useMemo(
    () => getInitialValues(currentElementType),
    [currentElementType],
  );
  const validationSchema = useMemo(
    () => getValidationSchema(currentElementType),
    [currentElementType],
  );

  const form2 = useForm({
    initialValues: Object.fromEntries(
      Object.entries(initialValues).map(([key, { value }]) => [key, value]),
    ),
    validate: zodResolver(validationSchema),
  });
  useEffect(() => {
    if (element) {
      const updatedValues = { ...element };
      ["min-date", "max-date"].forEach((key) => {
        if (updatedValues[key])
          updatedValues[key] = dayjs(updatedValues[key]).toDate();
      });
      if (updatedValues["unavailable-dates"]) {
        updatedValues["unavailable-dates"] = updatedValues[
          "unavailable-dates"
        ].map((date) => dayjs(date).toDate());
      }
      form2.reset();
      form2.setValues(updatedValues);
    }
  }, [element]);

  const onSubmit = useCallback(
    (values) => {
      const updatedValues = { ...values };

      if (updatedValues.metaType === QuestionType2.DatePicker) {
        const formatDate = (date) => dayjs(date).format("YYYY-MM-DD");
        ["min-date", "max-date"].forEach((key) => {
          if (updatedValues[key])
            updatedValues[key] = formatDate(updatedValues[key]);
        });
        if (Array.isArray(updatedValues["unavailable-dates"])) {
          updatedValues["unavailable-dates"] =
            updatedValues["unavailable-dates"].map(formatDate);
        }
      }

      if (!flowEditable) {
        showErrorToast(translations["Published Flows cannot be edited"]);
        return;
      }

      if (element?.id) {
        updateComponentInScreen(element.id, updatedValues);
      } else {
        addComponentToScreen(updatedValues);
      }
    },
    [
      flowEditable,
      translations,
      element,
      updateComponentInScreen,
      addComponentToScreen,
    ],
  );

  const renderField = (field) => {
    const FieldComponent =
      FieldComponentMap[initialValues[field].type] || ContainedTextField;
    const extra = initialValues[field]?.extra || {};

    if (["hidden", "checkbox"].includes(initialValues[field].type)) return null;

    return (
      <Grid.Col
        key={field}
        span={
          field === "data-source" || initialValues[field].type === "richText"
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
          {...(field === "data-source" && {
            insertListItem: form2.insertListItem,
            removeListItem: form2.removeListItem,
            metaType: currentElementType,
          })}
        />
      </Grid.Col>
    );
  };
  if (!element && !currentElementType) return null;
  return (
    <form
      onSubmit={form2.onSubmit(onSubmit)}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, form2.onSubmit(onSubmit)]])}
    >
      <ScrollArea h={"80%"}>
        <Group justify="space-between">
          <Badge variant="outline" size="lg">
            {QuestionType2?.[form2.getValues().metaType as string]}
          </Badge>
        </Group>
        <Group p={2} gap={2} pr={42}>
          <Stack
            style={{ height: "100%", overflowY: "auto", flex: 1 }}
            gap={0}
            p={"sm"}
          >
            <Grid>{Object.keys(initialValues).map(renderField)}</Grid>
          </Stack>
        </Group>
      </ScrollArea>

      <Stack>
        <Divider />
        <Group justify="space-between" p="xs" px={"sm"}>
          <Group>
            {!flowNonInputElements2.includes(currentElementType) && (
              <Checkbox
                label={translations["Required"]}
                fw={600}
                {...form2.getInputProps("required", { type: "checkbox" })}
              />
            )}
            {WaNPSQuestions2.includes(
              form2.getValues().metaType as QuestionType2,
            ) && (
              <Checkbox
                label={translations["NPS Analytics"]}
                fw={600}
                {...form2.getInputProps("enableNpsAnalytics", {
                  type: "checkbox",
                })}
              />
            )}
          </Group>

          {logicSupportedTypes.includes(currentElementType as any) && (
            <RateupButtonPrimary
              title={translations["Logic Jump"]}
              leftIcon={
                <Image
                  src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`}
                  w={30}
                  h={30}
                  fit={"contain"}
                  alt="logic jump"
                />
              }
              size="sm"
              variant="outline"
              onClick={() => setDetailActiveEditor(EditorType.LogicEditor)}
            />
          )}

          <Group>
            {googleReviewSupportedTypes2.includes(currentElementType) && (
              <RateupButtonPrimary
                title={translations["Google Review"]}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
                variant="outline"
                onClick={() =>
                  setDetailActiveEditor(EditorType.GoogleReviewEditor)
                }
              />
            )}
          </Group>
          <RateupButtonPrimary
            title={"Save"}
            size="md"
            leftIcon={<IconDeviceSdCard />}
            type={"submit"}
          />
        </Group>
      </Stack>
    </form>
  );
}

export default memo(ElementEditor);
