import { IconCircleCheckFilled } from "@tabler/icons-react";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import en from "react-phone-number-input/locale/en";

import {
  Combobox,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils";
import { QuestionType } from "@/types/enums.ts";
import { getDefaultContactFeatureEnabled } from "@/utils/questions.ts";

type CountryCode = string;

const countryItems = getCountries().map((country) => ({
  value: country,
  label: `${String.fromCodePoint(...[...country].map((c) => c.codePointAt(0)! - 0x41 + 0x1f1e6))}  ${en[country]} (+${getCountryCallingCode(country)})`,
}));

const CountrySelect = ({
  value,
  onChange,
  disabled,
}: {
  value: CountryCode;
  onChange: (v: CountryCode) => void;
  disabled?: boolean;
}) => (
  <Combobox
    items={countryItems}
    value={value ?? "IN"}
    onValueChange={(v) => v && onChange(v as CountryCode)}
    disabled={disabled}
  >
    <ComboboxTrigger className="w-full justify-between rounded-none border-0 border-b px-0 shadow-none">
      <ComboboxValue placeholder="Select Default Country code" />
    </ComboboxTrigger>
    <ComboboxContent className="w-full p-0">
      <ComboboxChipsInput
        placeholder="Search country..."
        className="h-9 w-full rounded-none border-0 border-b px-3"
      />
      <ComboboxEmpty>No country found.</ComboboxEmpty>
      <ScrollArea className="h-72">
        <ComboboxList>
          {(item: { value: string; label: string }) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ScrollArea>
    </ComboboxContent>
  </Combobox>
);

type HeadTextValues = {
  name: string;
  phone: string;
  email: string;
};

const ContactExtraProps = ({ form }: { form: any }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const qtype = form.values.type;
  const defaultEnabled = getDefaultContactFeatureEnabled(qtype);
  const features = form.values.features?.[selectedLanguage] || {
    name: {
      isEnabled: defaultEnabled.name,
      headText: "",
    },
    phone: {
      isEnabled: defaultEnabled.phone,
      headText: "",
      defaultCountryCode: "IN",
    },
    email: {
      isEnabled: defaultEnabled.email,
      headText: "",
    },
  };

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const { t: translations } = useTranslation();

  const { register, getValues, reset } = useForm<HeadTextValues>({
    defaultValues: {
      name: features?.name?.headText ?? "",
      phone: features?.phone?.headText ?? "",
      email: features?.email?.headText ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: features?.name?.headText ?? "",
      phone: features?.phone?.headText ?? "",
      email: features?.email?.headText ?? "",
    });
  }, [selectedLanguage]);

  function updateFeatures(updated: typeof features) {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: updated,
    });
  }

  useEffect(() => {
    if (!form.values?.features?.[selectedLanguage]) {
      form.setFieldValue("features", {
        ...form.values.features,
        [selectedLanguage]: {
          name: {
            isEnabled: defaultEnabled.name,
            headText: "",
          },
          phone: {
            isEnabled: defaultEnabled.phone,
            headText: "",
            defaultCountryCode: "IN",
          },
          email: {
            isEnabled: defaultEnabled.email,
            headText: "",
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  const questionTitle = form?.values?.title?.[selectedLanguage];
  const isDisabled = questionTitle === "<p></p>";

  const featureToggles = [
    {
      key: "name",
      label: translations("Name"),
      enabled: features?.name?.isEnabled,
      show: true,
    },
    {
      key: "phone",
      label: translations("Phone"),
      enabled: features?.phone?.isEnabled,
      show: qtype !== QuestionType.Phone,
    },
    {
      key: "email",
      label: translations("Enable Email"),
      enabled: features?.email?.isEnabled,
      show: qtype !== QuestionType.Email,
    },
  ];

  const featureFields: Array<{ key: keyof HeadTextValues; value: (typeof features)[string] }> = [
    { key: "name", value: features.name },
    { key: "phone", value: features.phone },
    { key: "email", value: features.email },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        {featureToggles
          .filter((t) => t.show)
          .map(({ key, label, enabled }) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border p-4 shadow-md">
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => {
                  updateFeatures({
                    ...features,
                    [key]: { ...features[key], isEnabled: checked },
                  });
                }}
              />
              <span
                className={cn("text-sm", enabled ? "text-foreground" : "text-muted-foreground")}
              >
                {label}
              </span>
            </div>
          ))}
      </div>

      <TooltipProvider>
        <FieldGroup className="gap-3">
          {featureFields.map(({ key, value }) => {
            if (!value?.isEnabled) return null;
            const isFocused = selectedField === key;

            const textarea = (
              <Field key={key}>
                <FieldLabel className="sr-only">{key} title</FieldLabel>
                <div className="relative">
                  <Textarea
                    placeholder={`${translations("Enter")} ${key} ${translations("title here")}`}
                    className="rounded-none border-0 border-b pr-8 focus-visible:border-primary focus-visible:ring-0"
                    disabled={isDisabled}
                    {...register(key)}
                    onFocus={() => {
                      if (!questionTitle) return;
                      setSelectedField(key);
                    }}
                    onBlur={(e) => {
                      if (!questionTitle) return;
                      const current = e.currentTarget.value;
                      if (current !== value.headText) {
                        updateFeatures({
                          ...features,
                          [key]: { ...features[key], headText: current },
                        });
                      }
                      setSelectedField(null);
                    }}
                  />
                  {isFocused && questionTitle && (
                    <button
                      type="button"
                      className="absolute right-1 top-2 text-primary"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const current = getValues()[key];
                        if (current !== value.headText) {
                          updateFeatures({
                            ...features,
                            [key]: { ...features[key], headText: current },
                          });
                        }
                        setSelectedField(null);
                      }}
                    >
                      <IconCircleCheckFilled className="size-5" />
                    </button>
                  )}
                </div>
                {key === "phone" && (
                  <CountrySelect
                    disabled={isDisabled}
                    value={value.defaultCountryCode || "IN"}
                    onChange={(code) => {
                      updateFeatures({
                        ...features,
                        phone: { ...features.phone, defaultCountryCode: code },
                      });
                    }}
                  />
                )}
              </Field>
            );

            if (!isDisabled) return textarea;

            return (
              <Tooltip key={key}>
                <TooltipTrigger className="block w-full text-left">{textarea}</TooltipTrigger>
                <TooltipContent>{translations("Please fill question")}</TooltipContent>
              </Tooltip>
            );
          })}
        </FieldGroup>
      </TooltipProvider>
    </div>
  );
};

export default ContactExtraProps;
