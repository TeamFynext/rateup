"use client";

import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Grid,
  Group,
  Image,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import {
  IconAppWindow,
  IconBrandGoogle,
  IconChevronDown,
  IconDeviceSdCard,
  IconTicket,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";

import { QuestionType2, SubscriptionFeaturePathName } from "@/types/enums";
import { useSubscription } from "@/backend/subscription/subscription.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedDatePickerInput,
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
  ContainedTextInputWithCounter,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupSwitch from "@/components/Switch/RateupSwitch";
import {
  flowNonInputElements2,
  SAVE_HOTKEY,
  WaNPSQuestions2,
} from "@/utils/constants";
import {
  googleReviewSupportedTypes2,
  logicSupportedTypes2,
  logicSupportedTypes3,
  ticketIssueSupportedTypes,
  ticketIssueSupportedTypes2,
} from "@/utils/data";
import { showErrorToast } from "@/utils/notifications";
import { hasFeature } from "@/utils/subscription/subscription";

import { EditFlowContext } from "../../flows/FlowPage/EditFlow/EditFlowContext";
import { DataSourceInput } from "../input/DataSource";
import ImageCarouselInput from "../input/imageCarouselInput";
import ImageInput from "../input/ImageInput";
import InitInput from "../input/InitInput";
import TiptapMarkdown from "../input/TiptapMarkdown";
import useFlowStore, { EditorType, FormElement } from "../utils/store";
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
  checkbox: memo(RateupSwitch),
  init: memo(InitInput),
  imageCarousel: memo(ImageCarouselInput),
};

function ElementEditor() {
  const {
    addComponentToScreen,
    updateComponentInScreen,
    getCurrentElement,
    currentElementType,
    setDetailActiveEditor,
  } = useFlowStore();
  const translations = useTranslations();
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
    initialValues: {},
    validate: zod4Resolver(validationSchema),
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
    } else {
      form2.setValues(
        Object.fromEntries(
          Object.entries(initialValues).map(([key, { value }]) => [key, value]),
        ),
      );
    }
  }, [element, initialValues]);
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

      if (element?.id) {
        updateComponentInScreen(element.id, updatedValues);
      } else {
        addComponentToScreen(updatedValues);
      }
    },
    [element, updateComponentInScreen, addComponentToScreen],
  );

  function getChoiceCount(type) {
    switch (type) {
      case QuestionType2.CheckboxGroup:
      case QuestionType2.RadioButtonsGroup:
      case QuestionType2.LD:
      case QuestionType2.YN:
        return { max: 20, min: 1 };
      case QuestionType2.Dropdown:
      case QuestionType2.Rating:
      case QuestionType2.Smiley:
      case QuestionType2.Opinion:
        return { max: 200, min: 1 };
      default:
        return { max: 20, min: 1 };
    }
  }
  const renderField = (field) => {
    const fieldType = initialValues[field].type;
    const FieldComponent = FieldComponentMap[fieldType] || ContainedTextField;
    const extra = initialValues[field]?.extra || {};
    if (["hidden"].includes(fieldType)) return null;

    return (
      <Grid.Col
        key={field}
        span={
          field === "data-source" ||
          ["richText", "imageCarousel"].includes(fieldType)
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
          {...form2.getInputProps(field, {
            type: fieldType === "checkbox" ? "checkbox" : "input",
          })}
          {...(field === "data-source" && {
            insertListItem: form2.insertListItem,
            removeListItem: form2.removeListItem,
            metaType: currentElementType,
            maxChoice:
              getChoiceCount(
                QuestionType2?.[form2.getValues().metaType as string],
              )?.max ?? 20,
          })}
          {...(field === "init-value" && {
            dataSource: form2?.values?.["data-source"],
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
            {form2?.values?.required?.toString() && (
              <Checkbox
                label={translations("Required")}
                fw={600}
                {...form2.getInputProps("required", { type: "checkbox" })}
              />
            )}
            {WaNPSQuestions2.includes(
              form2.getValues().metaType as QuestionType2,
            ) && (
              <Checkbox
                label={translations("NPS Analytics")}
                fw={600}
                {...form2.getInputProps("enableNpsAnalytics", {
                  type: "checkbox",
                })}
              />
            )}
          </Group>

          <FlowElementActions
            currentElementType={currentElementType}
            setDetailActiveEditor={setDetailActiveEditor}
            element={element}
          />
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

const FlowElementActions = ({
  setDetailActiveEditor,
  currentElementType,
  element,
}: {
  setDetailActiveEditor: (editor: EditorType) => void;
  currentElementType: QuestionType2;
  element: FormElement;
}) => {
  const translations = useTranslations();
  const { data: subscription } = useSubscription();
  const [isGoogleReviewFeatureActive, setIsGoogleReviewFeatureActive] =
    useState(false);
  const [isTicketFeatureActive, setIsTicketFeatureActive] = useState(false);

  useEffect(() => {
    setIsGoogleReviewFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.GoogleReview),
    );

    setIsTicketFeatureActive(
      hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    );
  }, [subscription]);
  const { survey } = useContext(EditFlowContext);
  return (
    <Menu
      position="top"
      offset={4}
      withArrow
      arrowPosition="side"
      transitionProps={{
        transition: "rotate-right",
        duration: 150,
      }}
    >
      <Menu.Target>
        <Button
          variant="outline"
          color="dark.2"
          radius="lg"
          size="sm"
          rightSection={<IconChevronDown size="1rem" />}
        >
          <Text size="sm" c={"var(--text-color-sp)"} fw="700">
            {translations("Actions")}
          </Text>
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        {logicSupportedTypes3.includes(currentElementType) && (
          <Menu.Item>
            <RateupButtonSecondary
              title={translations("Logic Jump")}
              fullWidth
              leftIcon={
                <Image
                  src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`}
                  h={30}
                  w={30}
                  fit="contain"
                  alt="icon of login jump"
                />
              }
              size="sm"
              onClick={async () => {
                setDetailActiveEditor(EditorType.LogicEditor);
              }}
            />
          </Menu.Item>
        )}

        {googleReviewSupportedTypes2.includes(currentElementType) && (
          <Menu.Item>
            {isGoogleReviewFeatureActive ? (
              <RateupButtonPrimary
                title={translations("Google Review")}
                leftIcon={<IconBrandGoogle size={"1rem"} stroke={4} />}
                size="sm"
                variant="outline"
                onClick={() =>
                  setDetailActiveEditor(EditorType.GoogleReviewEditor)
                }
              />
            ) : (
              <Tooltip
                label={translations("Upgrade your Plan for this feature")}
                disabled={isGoogleReviewFeatureActive}
                color="yellow"
              >
                <Button
                  data-disabled
                  radius="lg"
                  onClick={(event) => event.preventDefault()}
                  leftSection={<IconAppWindow />}
                >
                  Review Page
                </Button>
              </Tooltip>
            )}
          </Menu.Item>
        )}
        {ticketIssueSupportedTypes2.includes(currentElementType) && (
          <Menu.Item>
            {isTicketFeatureActive &&
            element?.id &&
            !survey?.enableAutoGenerateTicket ? (
              <RateupButtonSecondary
                title={translations("Create Tickets")}
                leftIcon={<IconTicket stroke={4} size={"1rem"} />}
                size="sm"
                fullWidth
                onClick={() => {
                  setDetailActiveEditor(EditorType.TicketIssueEditor);
                }}
              />
            ) : (
              <Tooltip
                label={
                  !isTicketFeatureActive
                    ? translations("Upgrade your Plan for this feature")
                    : survey?.enableAutoGenerateTicket
                      ? translations(
                          "Aut-Generate Ticket is enabled on this flow",
                        )
                      : translations("Save the element to create ticket")
                }
                color={!isTicketFeatureActive ? "yellow" : "black"}
              >
                <Button
                  data-disabled
                  radius="lg"
                  onClick={(event) => event.preventDefault()}
                  leftSection={<IconTicket stroke={4} size={"1rem"} />}
                >
                  {translations("Create Tickets")}
                </Button>
              </Tooltip>
            )}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default memo(ElementEditor);
