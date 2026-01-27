"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IconDeviceFloppy } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { QuestionType2 } from "@/types/enums";
import {
  ContainedDatePickerInput,
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
  ContainedTextInputWithCounter,
} from "@/components/input/ContainedInput/ContainedInput";
import RateupSwitch from "@/components/Switch/RateupSwitch";
import { WaNPSQuestions2 } from "@/utils/constants";
import { logicSupportedTypes3 } from "@/utils/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

import { DataSourceInput } from "../input/DataSource";
import ImageCarouselInput from "../input/imageCarouselInput";
import ImageInput from "../input/ImageInput";
import InitInput from "../input/InitInput";
import TiptapMarkdown from "../input/TiptapMarkdown";
import useFlowStore from "../utils/store";
import { getInitialValues, getValidationSchema } from "../utils/util";
import { LogicJumpModal } from "./LogicJumpModal";

// Field component mapping
const FieldComponentMap = {
  text: ContainedTextInputWithCounter,
  number: ContainedNumberInput,
  select: ContainedSelection,
  multiselect: ContainedMultiSelect,
  date: ContainedDatePickerInput,
  dataSource: DataSourceInput,
  richText: TiptapMarkdown,
  image: ImageInput,
  checkbox: RateupSwitch,
  init: InitInput,
  imageCarousel: ImageCarouselInput,
};

interface InlineElementEditorProps {
  element: any;
}

// Inline editor for element properties with rich text support
function InlineElementEditor({ element }: InlineElementEditorProps) {
  const translations = useTranslations();
  const { updateComponentInScreen } = useFlowStore();
  const [logicJumpModalOpened, setLogicJumpModalOpened] = useState(false);

  const elementTypeString = (element.metaType || element.type) as string;

  const elementType = Object.values(QuestionType2).includes(elementTypeString as QuestionType2)
    ? (elementTypeString as QuestionType2)
    : QuestionType2[elementTypeString as keyof typeof QuestionType2];

  const initialValues = useMemo(
    () => {
      if (!elementType) {
        return {};
      }
      const values = getInitialValues(elementType);
      return values;
    },
    [elementType, element.id],
  );

  const validationSchema = useMemo(
    () => {
      if (!elementType) return null;
      return getValidationSchema(elementType);
    },
    [elementType],
  );

  const form = useForm<any>({
    resolver: validationSchema ? zodResolver(validationSchema) : undefined,
    defaultValues: {},
  });

  const { reset, setValue, getValues, handleSubmit, watch } = form;

  useEffect(() => {
    if (element) {
      const updatedValues = { ...element };

      // Convert date strings to Date objects for date picker
      ["min-date", "max-date"].forEach((key) => {
        if (updatedValues[key])
          updatedValues[key] = dayjs(updatedValues[key]).toDate();
      });
      if (updatedValues["unavailable-dates"]) {
        updatedValues["unavailable-dates"] = updatedValues[
          "unavailable-dates"
        ].map((date: any) => dayjs(date).toDate());
      }
      reset(updatedValues);
    }
  }, [element?.id, reset, elementType]);

  const onSubmit = handleSubmit(
    useCallback(
      (values: any) => {
        const updatedValues = { ...values };

        // Convert Date objects back to strings for date picker
        if (updatedValues.metaType === QuestionType2.DatePicker) {
          const formatDate = (date: any) => dayjs(date).format("YYYY-MM-DD");
          ["min-date", "max-date"].forEach((key) => {
            if (updatedValues[key])
              updatedValues[key] = formatDate(updatedValues[key]);
          });
          if (Array.isArray(updatedValues["unavailable-dates"])) {
            updatedValues["unavailable-dates"] =
              updatedValues["unavailable-dates"].map(formatDate);
          }
        }

        updateComponentInScreen(element.id, updatedValues);

        // Optional: Collapse after save (comment out if you want it to stay expanded)
        // setExpandedElementId(null);
      },
      [element?.id, updateComponentInScreen],
    ),
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

    const allValues = getValues();

    return (
      <div
        key={field}
        className={
          field === "data-source" ||
            ["richText", "imageCarousel"].includes(fieldType)
            ? "col-span-12"
            : "col-span-6"
        }
      >
        <Controller
          name={field}
          control={form.control}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <FieldComponent
              label={
                field.charAt(0).toUpperCase() +
                field.slice(1).replace(/([A-Z])/g, " $1")
              }
              placeholder={`Enter ${field}`}
              {...extra}
              value={value}
              onChange={onChange}
              error={error?.message}
              {...(field === "data-source" && {
                insertListItem: (path: string, item: any) => {
                  const currentValue = getValues(field) || [];
                  setValue(field, [...currentValue, item]);
                },
                removeListItem: (path: string, index: number) => {
                  const currentValue = getValues(field) || [];
                  setValue(field, currentValue.filter((_: any, i: number) => i !== index));
                },
                metaType: elementType,
                maxChoice:
                  getChoiceCount(
                    QuestionType2?.[allValues.metaType as string],
                  )?.max ?? 20,
              })}
              {...(field === "init-value" && {
                dataSource: allValues?.["data-source"],
              })}
            />
          )}
        />
      </div>
    );
  };

  if (!element) return null;

  // Check if logic jumps are supported for this element
  const supportsLogicJump = logicSupportedTypes3.includes(elementType);

  // Filter out hidden fields to check if there are any editable fields
  const editableFields = Object.keys(initialValues).filter(
    (field) => initialValues[field]?.type !== "hidden"
  );

  // If no fields available, show message
  if (!initialValues || editableFields.length === 0) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          {translations("No editable fields available for this element type")}
        </p>
        <p className="text-xs text-muted-foreground">
          Element type: {elementType || element.type || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground">
          Meta type: {element.metaType}
        </p>
      </div>
    );
  }

  const formValues = getValues();
  const requiredValue = watch("required") as boolean;
  const enableNpsValue = watch("enableNpsAnalytics") as boolean;

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2">
            {Object.keys(initialValues).map(renderField)}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {formValues?.required !== undefined && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={requiredValue}
                    onCheckedChange={(checked) => setValue("required", checked as boolean)}
                  />
                  <Label
                    htmlFor="required"
                    className="text-sm font-semibold cursor-pointer"
                  >
                    {translations("Required")}
                  </Label>
                </div>
              )}
              {WaNPSQuestions2.includes(
                formValues.metaType as QuestionType2,
              ) && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableNpsAnalytics"
                      checked={enableNpsValue}
                      onCheckedChange={(checked) => setValue("enableNpsAnalytics", checked as boolean)}
                    />
                    <Label
                      htmlFor="enableNpsAnalytics"
                      className="text-sm font-semibold cursor-pointer"
                    >
                      {translations("NPS Analytics")}
                    </Label>
                  </div>
                )}
            </div>

            <Button type="submit" size="sm">
              <IconDeviceFloppy size={16} className="mr-2" />
              {translations("Save Changes")}
            </Button>
          </div>

          {/* Logic Jump Button */}
          {supportsLogicJump && (
            <>
              <Separator />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLogicJumpModalOpened(true)}
              >
                <Image
                  src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`}
                  height={20}
                  width={20}
                  className="mr-2"
                  alt="Logic Jump icon"
                />
                {translations("Logic Jump")}
              </Button>
            </>
          )}
        </div>
      </form>

      {/* Logic Jump Modal */}
      <LogicJumpModal
        opened={logicJumpModalOpened}
        onClose={() => setLogicJumpModalOpened(false)}
        elementId={element.id}
      />
    </>
  );
}

export default InlineElementEditor;
