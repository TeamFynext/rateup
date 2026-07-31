import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { isEmptyObject } from "@tiptap/react";
import { useId } from "react";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import type { QuestionType } from "@/types/enums.ts";
import { QuestionType as Q } from "@/types/enums.ts";
import { isFieldKeyedRules } from "@/utils/validation/index.ts";

import { QuestionTabsEnum } from "../EditSurvey.tsx";

interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<QuestionTabsEnum>>;
  activeTab: QuestionTabsEnum;
}

type RuleValue =
  | {
      min: string;
      max: string;
      errorMessage: string;
      ruleType?: string;
    }
  | {
      type: string;
      errorMessage: string;
      ruleType?: string;
    };

type Rule = ValidationFieldRule;
interface FormValues {
  [ruleType: string]: RuleValue;
}

const TEXT_TYPE_OPTIONS = ["Letters", "Letters_&_Numbers", "Numbers"];

const ValidationRulesEditor = ({ selectedQ, setSelectedQ, setActiveTab, activeTab }: IProps) => {
  const uid = useId();
  const params = useParams({
    strict: false,
  });
  const surveyId = params.surveyId as string;
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const [ruleList, setRuleList] = useState(["length", "wordCount", "textType"]);

  const [multiInputRules, setMultiInputRules] = useState<Record<string, Rule[]> | null>(null);
  const [selectedRule, setSelectedRule] = useState<(Rule & { fieldKey?: string }) | null>(null);

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });
  const { t: translations } = useTranslation();

  const [values, setValuesState] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldValue = (ruleType: string, value: RuleValue) => {
    setValuesState((prev) => ({ ...prev, [ruleType]: value }));
  };

  const setValues = (newValues: FormValues) => {
    setValuesState(newValues);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    for (const ruleType of Object.keys(values)) {
      const ruleData = values[ruleType];
      if ("min" in ruleData && !ruleData.min) newErrors[`${ruleType}.min`] = "Required";
      if ("max" in ruleData && !ruleData.max) newErrors[`${ruleType}.max`] = "Required";
      if ("type" in ruleData && !ruleData.type) newErrors[`${ruleType}.type`] = "Required";
      if (!ruleData.errorMessage) newErrors[`${ruleType}.errorMessage`] = "Required";
    }
    setErrors(newErrors);
    return { hasErrors: Object.keys(newErrors).length > 0 };
  };

  const reset = () => {
    setValuesState({});
    setErrors({});
  };

  const form = { values, setFieldValue, setValues, errors, validate, reset };

  function ruleTitle(ruleType: string) {
    switch (ruleType) {
      case "length":
        return "Length";
      case "wordCount":
        return "Word Count";
      case "textType":
        return "Text Type";
    }
  }

  useEffect(() => {
    switch (selectedQ?.type) {
      case Q.Text:
        setRuleList(["length", "wordCount", "textType"]);
        break;
      case Q.TextArea:
        setRuleList(["length", "wordCount", "textType"]);
        break;
      case Q.Number:
        setRuleList(["length"]);
        break;
      case Q.MultiTextInput:
        setRuleList(["length", "textType", "required"]);
        break;
    }
  }, [selectedQ]);

  useEffect(() => {
    if (
      [Q.MultiTextInput].includes(selectedQ?.type as QuestionType) &&
      selectedQ?.validationRules &&
      isFieldKeyedRules(selectedQ.validationRules)
    ) {
      setMultiInputRules(selectedQ.validationRules);
    }
  }, [activeTab]);

  const updateValidationRules = (validationRules: any) => {
    if (selectedQ) setSelectedQ({ ...selectedQ, validationRules });
  };

  useEffect(() => {
    if (![Q.MultiTextInput].includes(selectedQ?.type as QuestionType)) {
      const validationResult = form.validate();

      if (validationResult?.hasErrors) {
        // There are validation errors, do not save the form
        return;
      } else {
        let validationRules = null;
        validationRules = { ...form.values };
        updateValidationRules(validationRules);
      }
    }
  }, [values]);

  useEffect(() => {
    if (
      selectedQ?.hasOwnProperty("validationRules") &&
      selectedQ?.validationRules !== null &&
      ![Q.MultiTextInput].includes(selectedQ?.type as QuestionType)
    ) {
      const updatedValues = { ...selectedQ?.validationRules };
      form.reset();
      setValues(updatedValues);
    } else {
      if (
        [Q.MultiTextInput].includes(selectedQ?.type as QuestionType) &&
        selectedQ?.validationRules != null &&
        isFieldKeyedRules(selectedQ.validationRules)
      ) {
        setMultiInputRules(selectedQ.validationRules);
      } else {
        setMultiInputRules(null);
      }
      form.reset();
    }
  }, [selectedQ?.id]);

  const addRule = (ruleType: string) => {
    if ([Q.MultiTextInput].includes(selectedQ?.type as QuestionType)) {
      let newRule!: Rule;
      if (ruleType === "length") {
        newRule = {
          min: "3",
          max: "5",
          ruleType,
          errorMessage: "",
        };
        newRule.errorMessage = `${selectedFieldKey}: length should be between ${newRule.min} and ${newRule?.max} characters`;
      } else if (ruleType === "textType") {
        newRule = {
          type: "Letters_&_Numbers",
          ruleType,
          errorMessage: "",
        };
        newRule.errorMessage = `${selectedFieldKey}: only ${newRule.type} are allowed`;
      } else if (ruleType === "required") {
        newRule = {
          ruleType,
          errorMessage: `${selectedFieldKey} cannot be empty`,
        };
      }
      const previousRules = multiInputRules?.[selectedFieldKey];
      if (previousRules) {
        previousRules.push(newRule);
        setMultiInputRules({
          ...multiInputRules,
          [selectedFieldKey]: previousRules,
        });
      } else {
        setMultiInputRules({
          ...multiInputRules,
          [selectedFieldKey]: [newRule],
        });
      }
    } else {
      if (ruleType === "textType") {
        setFieldValue(ruleType, {
          type: "Letters_&_Numbers",
          errorMessage: translations("Letters_&_Numbers only allowed."),
        });
      } else if (ruleType === "wordCount") {
        setFieldValue(ruleType, {
          min: "2",
          max: "15",
          errorMessage: translations("Input should contain minimum 2 words"),
        });
      } else {
        setFieldValue(ruleType, {
          min: "3",
          max: "50",
          errorMessage: translations("Input Length should be between 3 and 50 characters"),
        });
      }
    }
  };

  const deleteRule = (ruleType: string) => {
    const updatedValues = { ...values };
    delete updatedValues[ruleType];
    form.reset();
    setValues(updatedValues);
  };

  const handleSave = async () => {
    if (![Q.MultiTextInput].includes(selectedQ?.type as QuestionType)) {
      const validationResult = form.validate();
      if (validationResult?.hasErrors) {
        // There are validation errors, do not save the form
        return;
      }
    }
    toast.loading(translations("Hold on, your changes are getting updated.."), {
      id: "load-data",
    });

    const data = {
      validationRules: [Q.MultiTextInput].includes(selectedQ?.type as QuestionType)
        ? multiInputRules
        : { ...form.values },
    };

    await questionUpdateMutation.mutateAsync({
      qId: selectedQ.id,
      data,
    });

    setActiveTab(QuestionTabsEnum.Edit);
  };

  const MultiInputValidationRules = () => {
    const [ruleValues, setRuleValues] = useState<(Rule & { fieldKey?: string }) | null>(
      selectedRule,
    );
    const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});

    const setRuleField = (name: string, value: any) => {
      setRuleValues((prev) => ({ ...prev!, [name]: value }));
    };

    const validateRuleForm = () => {
      const newErrors: Record<string, string> = {};
      if (ruleValues?.ruleType === "length") {
        if (!ruleValues?.min) newErrors.min = translations("required");
        if (!ruleValues?.max) newErrors.max = translations("required");
      }
      if (ruleValues?.ruleType === "textType" && !ruleValues?.type) {
        newErrors.type = translations("required");
      }
      if (!ruleValues?.errorMessage) newErrors.errorMessage = translations("required");
      setRuleErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleUpdateRule = async () => {
      if (!validateRuleForm()) return;
      const fieldKey = ruleValues!.fieldKey!;
      const newRules = multiInputRules?.[fieldKey] ?? [];
      const rule = newRules.find((r) => r.ruleType == ruleValues!.ruleType)!;
      if (rule.ruleType == "length") {
        rule.min = ruleValues!.min;
        rule.max = ruleValues!.max;
      }
      if (rule.ruleType == "textType") {
        rule.type = ruleValues!.type;
      }
      rule.errorMessage = ruleValues!.errorMessage;
      setMultiInputRules({
        ...multiInputRules,
        [fieldKey]: newRules,
      });
      setSelectedRule(null);
      close();
    };

    useEffect(() => {
      setRuleValues(selectedRule);
      setRuleErrors({});
    }, [selectedRule]);

    const fieldKeyOptions =
      selectedQ?.features?.[selectedLanguage]?.fields?.map(
        (f: { fieldKey: string }) => f?.fieldKey,
      ) ?? [];
    const availableRuleTypes =
      ruleList?.filter(
        (ruleType) => !multiInputRules?.[selectedFieldKey]?.some((r) => r.ruleType == ruleType),
      ) ?? [];

    return (
      <>
        <Card className="bg-yellow-50 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field>
              <FieldLabel htmlFor="field-key-select">{translations("select field Key")}</FieldLabel>
              <Select
                value={selectedFieldKey}
                onValueChange={(value) => setSelectedFieldKey(value ?? "")}
                items={fieldKeyOptions.map((key: string) => ({ value: key, label: key }))}
              >
                <SelectTrigger id="field-key-select" className="w-fit">
                  <SelectValue placeholder={translations("select key")} />
                </SelectTrigger>
                <SelectContent>
                  {fieldKeyOptions.map((key: string) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="rule-type-select">{translations("select rule type")}</FieldLabel>
              <Select
                onValueChange={(ruleType) => addRule(ruleType as string)}
                items={availableRuleTypes.map((rt) => ({ value: rt, label: ruleTitle(rt) || rt }))}
              >
                <SelectTrigger id="rule-type-select" className="w-fit">
                  <SelectValue placeholder={translations("Select rule type")} />
                </SelectTrigger>
                <SelectContent>
                  {availableRuleTypes.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {ruleTitle(rt) || rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>
        <ScrollArea className="h-[230px]">
          {multiInputRules &&
            Object.entries(multiInputRules)?.map(([fieldKey, rules], index) => (
              <Card key={index} className="my-2.5 bg-blue-50 p-3">
                <div className="flex items-center gap-2">
                  <h6 className="text-sm font-semibold">{fieldKey}</h6>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      const updatedMultiInputRules = { ...multiInputRules };
                      if (fieldKey in updatedMultiInputRules)
                        delete updatedMultiInputRules[fieldKey];
                      if (!Object.keys(updatedMultiInputRules).length) setMultiInputRules(null);
                      setMultiInputRules(updatedMultiInputRules);
                    }}
                  >
                    <IconTrash className="text-destructive" />
                  </Button>
                </div>
                {rules?.map((r: Rule, ruleIndex: number) => (
                  <div key={r?.ruleType} className="flex flex-wrap items-center gap-2 py-2.5">
                    <span className="w-20">{r?.ruleType}:</span>
                    {r?.ruleType === "length" && (
                      <>
                        <Field className="w-[100px]">
                          <FieldLabel htmlFor={`${uid}-field-${index}-${ruleIndex}`}>
                            {translations("Min")}
                          </FieldLabel>
                          <Input
                            id={`${uid}-field-${index}-${ruleIndex}`}
                            value={r?.min}
                            readOnly
                          />
                        </Field>
                        <Field className="w-[100px]">
                          <FieldLabel htmlFor={`${uid}-field-2-${index}-${ruleIndex}`}>
                            {translations("Max")}
                          </FieldLabel>
                          <Input
                            id={`${uid}-field-2-${index}-${ruleIndex}`}
                            value={r?.max}
                            readOnly
                          />
                        </Field>
                      </>
                    )}
                    {r?.ruleType === "textType" && (
                      <Field>
                        <FieldLabel htmlFor={`${uid}-field-3-${index}-${ruleIndex}`}>
                          {translations("Type")}
                        </FieldLabel>
                        <Input
                          id={`${uid}-field-3-${index}-${ruleIndex}`}
                          value={r?.type}
                          readOnly
                        />
                      </Field>
                    )}
                    <Field>
                      <FieldLabel htmlFor={`${uid}-field-4-${index}-${ruleIndex}`}>
                        {translations("Error Message")}
                      </FieldLabel>
                      <Input
                        id={`${uid}-field-4-${index}-${ruleIndex}`}
                        value={r?.errorMessage}
                        readOnly
                      />
                      <p className="text-sm text-muted-foreground">
                        {translations("please change according to display text of the field")}
                      </p>
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setSelectedRule({ ...r, fieldKey });
                        open();
                      }}
                    >
                      <IconEdit />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        const newRules = rules?.filter((rule) => rule?.ruleType !== r?.ruleType);
                        if (!newRules.length) {
                          delete multiInputRules?.[fieldKey];
                          if (isEmptyObject(multiInputRules)) setMultiInputRules(null);
                          else setMultiInputRules(multiInputRules);
                        }
                        setMultiInputRules({
                          ...multiInputRules,
                          [fieldKey]: newRules,
                        });
                      }}
                    >
                      <IconTrash className="text-destructive" />
                    </Button>
                  </div>
                ))}
              </Card>
            ))}
          <Dialog
            open={opened}
            onOpenChange={(next) => {
              if (!next) close();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{translations("Update Automation")}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <p className="text-sm">
                  {translations("Field Key: ")}
                  {selectedRule?.fieldKey}
                </p>
                {selectedRule?.ruleType === "length" && (
                  <>
                    <Field data-invalid={!!ruleErrors.min}>
                      <FieldLabel htmlFor={`${uid}-field-5`}>{translations("Min")}</FieldLabel>
                      <Input
                        id={`${uid}-field-5`}
                        type="number"
                        value={ruleValues?.min ?? ""}
                        onChange={(e) => setRuleField("min", e.target.value)}
                        aria-invalid={!!ruleErrors.min}
                      />
                      {ruleErrors.min && <FieldError>{ruleErrors.min}</FieldError>}
                    </Field>
                    <Field data-invalid={!!ruleErrors.max}>
                      <FieldLabel htmlFor={`${uid}-field-6`}>{translations("Max")}</FieldLabel>
                      <Input
                        id={`${uid}-field-6`}
                        type="number"
                        value={ruleValues?.max ?? ""}
                        onChange={(e) => setRuleField("max", e.target.value)}
                        aria-invalid={!!ruleErrors.max}
                      />
                      {ruleErrors.max && <FieldError>{ruleErrors.max}</FieldError>}
                    </Field>
                  </>
                )}
                {selectedRule?.ruleType === "textType" && (
                  <Field data-invalid={!!ruleErrors.type}>
                    <FieldLabel htmlFor={`${uid}-field-7`}>{translations("Type")}</FieldLabel>
                    <Select
                      value={ruleValues?.type}
                      onValueChange={(value) => setRuleField("type", value)}
                      items={TEXT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                    >
                      <SelectTrigger id={`${uid}-field-7`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEXT_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ruleErrors.type && <FieldError>{ruleErrors.type}</FieldError>}
                  </Field>
                )}
                <Field data-invalid={!!ruleErrors.errorMessage}>
                  <FieldLabel htmlFor={`${uid}-field-8`}>
                    {translations("Error Message")}
                  </FieldLabel>
                  <Input
                    id={`${uid}-field-8`}
                    value={ruleValues?.errorMessage ?? ""}
                    onChange={(e) => setRuleField("errorMessage", e.target.value)}
                    aria-invalid={!!ruleErrors.errorMessage}
                  />
                  <p className="text-sm text-muted-foreground">
                    {translations("please change according to display text of the field")}
                  </p>
                  {ruleErrors.errorMessage && <FieldError>{ruleErrors.errorMessage}</FieldError>}
                </Field>
                <Button onClick={handleUpdateRule}>{translations("update")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </ScrollArea>
      </>
    );
  };
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold">{translations("Validation Editor")}</h3>
        <span className="text-sm text-muted-foreground">
          {translations("Add validation rules to the user input for this question.")}
        </span>
        <Separator />
        {[Q.MultiTextInput].includes(selectedQ?.type as QuestionType) ? (
          <MultiInputValidationRules />
        ) : (
          <Card className="min-h-[300px] min-w-[650px] max-w-[650px]">
            <ScrollArea className="h-[400px]">
              <form
                onKeyDown={(e) => {
                  const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
                  if (isSave) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              >
                {Object.entries(values).map(([ruleType, ruleValues]) => {
                  const ruleData = ruleValues;

                  return (
                    <div key={ruleType}>
                      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-blue-50 px-5 py-3">
                        <h4 className="w-[100px] max-w-[100px] text-base font-semibold">
                          {ruleTitle(ruleType) || ruleType}
                        </h4>
                        {"min" in ruleData && "max" in ruleData ? (
                          <div className="flex items-center gap-3">
                            <Field data-invalid={!!errors[`${ruleType}.min`]}>
                              <FieldLabel htmlFor={`${uid}-field-9`}>
                                {translations("Min")}
                              </FieldLabel>
                              <Input
                                id={`${uid}-field-9`}
                                className="max-w-[100px]"
                                value={ruleData.min}
                                onChange={(event) => {
                                  const newValue: RuleValue = {
                                    ...(ruleData as RuleValue),
                                    min: event.target.value,
                                  };
                                  setFieldValue(ruleType, newValue);
                                }}
                                aria-invalid={!!errors[`${ruleType}.min`]}
                              />
                              {errors[`${ruleType}.min`] && (
                                <FieldError>{errors[`${ruleType}.min`]}</FieldError>
                              )}
                            </Field>
                            <Field data-invalid={!!errors[`${ruleType}.max`]}>
                              <FieldLabel htmlFor={`${uid}-field-10`}>
                                {translations("Max")}
                              </FieldLabel>
                              <Input
                                id={`${uid}-field-10`}
                                className="max-w-[100px]"
                                value={ruleData.max}
                                onChange={(event) => {
                                  const newValue: RuleValue = {
                                    ...(ruleData as RuleValue),
                                    max: event.target.value,
                                  };
                                  setFieldValue(ruleType, newValue);
                                }}
                                aria-invalid={!!errors[`${ruleType}.max`]}
                              />
                              {errors[`${ruleType}.max`] && (
                                <FieldError>{errors[`${ruleType}.max`]}</FieldError>
                              )}
                            </Field>
                          </div>
                        ) : (
                          <Field data-invalid={!!errors[`${ruleType}.type`]}>
                            <FieldLabel htmlFor={`${uid}-field-11`}>
                              {translations("Input type:")}
                            </FieldLabel>
                            <Select
                              defaultValue="Letters_&_Numbers"
                              onValueChange={(event) => {
                                const newValue: RuleValue = {
                                  ...(ruleData as RuleValue),
                                  type: event ?? "",
                                  errorMessage: `${event} only allowed.`,
                                };
                                setFieldValue(ruleType, newValue);
                              }}
                              items={["Letters", "Letters_&_Numbers"].map((t) => ({
                                value: t,
                                label: t,
                              }))}
                            >
                              <SelectTrigger id={`${uid}-field-11`}>
                                <SelectValue placeholder={translations("Select rule type")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Letters">Letters</SelectItem>
                                <SelectItem value="Letters_&_Numbers">Letters_&_Numbers</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors[`${ruleType}.type`] && (
                              <FieldError>{errors[`${ruleType}.type`]}</FieldError>
                            )}
                          </Field>
                        )}
                        <Field data-invalid={!!errors[`${ruleType}.errorMessage`]}>
                          <FieldLabel htmlFor={`${uid}-field-12`}>
                            {translations("Error Message")}
                          </FieldLabel>
                          <Input
                            id={`${uid}-field-12`}
                            className="max-w-[300px]"
                            value={ruleData.errorMessage}
                            onChange={(event) => {
                              const newValue: RuleValue = {
                                ...ruleData,
                                errorMessage: event.target.value,
                              };
                              setFieldValue(ruleType, newValue);
                            }}
                            aria-invalid={!!errors[`${ruleType}.errorMessage`]}
                          />
                          {errors[`${ruleType}.errorMessage`] && (
                            <FieldError>{errors[`${ruleType}.errorMessage`]}</FieldError>
                          )}
                        </Field>

                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="px-8"
                          onClick={() => deleteRule(ruleType)}
                        >
                          <IconTrash className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {Object.keys(values).length < 3 && (
                  <div className="mt-8 flex max-w-[350px] items-center gap-3 rounded-xl bg-yellow-50 p-4">
                    <h4 className="max-w-[120px] text-base font-semibold">
                      {translations("Add Rule :")}
                    </h4>
                    <Select
                      onValueChange={(ruleType) => addRule(ruleType as string)}
                      items={ruleList
                        ?.filter((ruleType) => !(ruleType in values))
                        .map((rt) => ({ value: rt, label: ruleTitle(rt) || rt }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={translations("Select rule type")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ruleList
                          ?.filter((ruleType) => !(ruleType in values))
                          .map((rt) => (
                            <SelectItem key={rt} value={rt}>
                              {ruleTitle(rt) || rt}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form>
            </ScrollArea>
          </Card>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
          {translations("Cancel")}
        </Button>
        <Button onClick={handleSave} disabled={questionUpdateMutation.isPending}>
          {questionUpdateMutation.isPending && <Spinner data-icon="inline-start" />}
          {translations("Save")}
        </Button>
      </div>
    </div>
  );
};

export default ValidationRulesEditor;
