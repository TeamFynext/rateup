import { IconCircleCheckFilled } from "@tabler/icons-react";
import { useId, useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";

import type { QuestionExtraPropsForm, QuestionFormFeatures } from "./questionForm.ts";

type QuestionTitles = {
  nameQn: string;
  jobTitleQn: string;
  testimonialQn: string;
  ratingQn: string;
  photoQn: string;
};

const TestimonialExtraProps = ({ form }: { form: Required<QuestionExtraPropsForm> }) => {
  const uid = useId();
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const features: QuestionFormFeatures = form.values.features?.[selectedLanguage] || {
    rating: false,
    jobTitle: false,
    photo: false,
    nameQn: "",
    ratingQn: "",
    testimonialQn: "",
    jobTitleQn: "",
    photoQn: "",
  };
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const { t: translations } = useTranslation();

  const { register, getValues, reset } = useForm<QuestionTitles>({
    defaultValues: {
      nameQn: features?.nameQn ?? "",
      jobTitleQn: features?.jobTitleQn ?? "",
      testimonialQn: features?.testimonialQn ?? "",
      ratingQn: features?.ratingQn ?? "",
      photoQn: features?.photoQn ?? "",
    },
  });

  useEffect(() => {
    reset({
      nameQn: features?.nameQn ?? "",
      jobTitleQn: features?.jobTitleQn ?? "",
      testimonialQn: features?.testimonialQn ?? "",
      ratingQn: features?.ratingQn ?? "",
      photoQn: features?.photoQn ?? "",
    });
  }, [selectedLanguage]);

  function updateFeatures(featurekey: string, value: unknown) {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: { ...features, [featurekey]: value },
    });
  }

  useEffect(() => {
    const data: Partial<QuestionTitles> = {};
    if (!features?.rating && features?.ratingQn) data.ratingQn = "";
    if (!features?.jobTitle && features?.jobTitleQn) data.jobTitleQn = "";
    if (!features?.photo && features?.photoQn) data.photoQn = "";
    if (Object.keys(data).length > 0) {
      form.setFieldValue("features", {
        ...form.values.features,
        [selectedLanguage]: { ...features, ...data },
      });
    }
  }, [features?.rating, features?.jobTitle, features?.photo]);

  const questionTitle = form.values?.title?.[selectedLanguage];
  const isDisabled = questionTitle === "<p></p>";

  const renderTitleField = (key: keyof QuestionTitles, label: string) => {
    const isFocused = selectedField === key;
    const field = (
      <Field key={key}>
        <FieldLabel
          htmlFor={`${uid}-field`}
          className="capitalize"
        >{`${label} ${translations("Title")}`}</FieldLabel>
        <Textarea
          id={`${uid}-field`}
          placeholder={`${translations("Enter")} ${label}'s ${translations("title here")}`}
          disabled={isDisabled}
          className="bg-background"
          {...register(key)}
          onFocus={() => setSelectedField(key)}
          onBlur={(e) => {
            updateFeatures(key, e.currentTarget.value);
            setSelectedField(null);
          }}
        />
        {isFocused && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault();
                updateFeatures(key, getValues()[key]);
                setSelectedField(null);
              }}
            >
              <IconCircleCheckFilled data-icon="inline-start" />
              {translations("Save")}
            </Button>
          </div>
        )}
      </Field>
    );

    if (!isDisabled) return field;

    return (
      <Tooltip key={key}>
        <TooltipTrigger className="block w-full text-left">{field}</TooltipTrigger>
        <TooltipContent>{translations("Please fill question")}</TooltipContent>
      </Tooltip>
    );
  };

  const toggles: Array<{
    featureKey: string;
    label: string;
    value?: boolean;
    titleKey?: keyof QuestionTitles;
    titleLabel?: string;
  }> = [
    {
      featureKey: "rating",
      label: translations("Enable Rating Question"),
      value: features?.rating,
      titleKey: "ratingQn",
      titleLabel: "rating",
    },
    {
      featureKey: "jobTitle",
      label: translations("Add job title"),
      value: features?.jobTitle,
      titleKey: "jobTitleQn",
      titleLabel: "job title",
    },
    {
      featureKey: "photo",
      label: translations("Capture photo"),
      value: features?.photo,
      titleKey: "photoQn",
      titleLabel: "photo",
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border p-4">{renderTitleField("nameQn", "name")}</div>
          <div className="rounded-lg border p-4">
            {renderTitleField("testimonialQn", "testimonial")}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {toggles.map(({ featureKey, label, value, titleKey, titleLabel }) => (
            <div key={featureKey} className="rounded-lg border">
              <Field orientation="horizontal" className="p-4">
                <FieldLabel htmlFor={`${uid}-field-2-${featureKey}`}>{label}</FieldLabel>
                <Switch
                  id={`${uid}-field-2-${featureKey}`}
                  checked={value}
                  onCheckedChange={(checked) => updateFeatures(featureKey, checked)}
                />
              </Field>
              {value && titleKey && titleLabel && (
                <div className="rounded-b-lg border-t bg-muted px-4 pb-4 pt-3">
                  {renderTitleField(titleKey, titleLabel)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TestimonialExtraProps;
