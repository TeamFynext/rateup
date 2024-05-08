import React, { useState, useEffect, useContext } from "react";
import { QuestionTabsEnum } from "../EditSurvey";
import {
  Paper,
  Divider,
  TextInput,
  Select,
  useMantineTheme,
  Group,
  Title,
  Stack,
  ScrollArea,
  Text,
  ActionIcon,
  ScrollAreaAutosize,
} from "@mantine/core";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { QuestionType as Q, SmileyResponse } from "../../../types/enums";
import { useQuestionUpdateMutation } from "../../../backend/surveys/questions/questions.query";
import { useRouter } from "next/router";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../../utils/constants";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { isEmptyObject } from "@tiptap/react";
import {
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";

interface IProps {
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
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

type Rule = {
  min?: string;
  max?: string;
  errorMessage: string;
  type?: string;
  ruleType: string;
};
type FormValues = {
  [ruleType: string]: RuleValue;
};

type ChangeHandler = (value: string | RuleValue) => void;

const ValidationRulesEditor = ({
  selectedQ,
  setSelectedQ,
  setActiveTab,
  activeTab,
}: IProps) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const [linkUpdateStatus, setLinkUpdateStatus] = useState(false);
  const { colors } = useMantineTheme();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [ruleList, setRuleList] = useState(["length", "wordCount", "textType"]);

  const [addressRules, setAddressRules] =
    useState<Record<string, Rule[]>>(null);
  const [selectedRule, setSelectedRule] = useState(null);

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId,
  });

  const form = useForm<FormValues>({
    initialValues: {},
    validate: (values) => {
      const errors = {};

      for (const ruleType of Object.keys(values)) {
        const ruleData = values[ruleType] as RuleValue;

        if ("min" in ruleData && !ruleData.min) {
          errors[`${ruleType}.min`] = "Required";
        }
        if ("max" in ruleData && !ruleData.max) {
          errors[`${ruleType}.max`] = "Required";
        }
        if ("type" in ruleData && !ruleData.type) {
          errors[`${ruleType}.type`] = "Required";
        }
        if (!ruleData.errorMessage) {
          errors[`${ruleType}.errorMessage`] = "Required";
        }
      }

      return errors;
    },
  });

  const { values, setFieldValue, setValues, errors } = form;

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
      case Q.Address:
        setRuleList(["length", "textType"]);
        break;
    }
  }, [selectedQ]);

  useEffect(() => {
    if (selectedQ?.type === Q.Address && selectedQ?.validationRules) {
      setAddressRules(selectedQ?.validationRules);
    }
  }, [activeTab]);

  const updateValidationRules = (validationRules: any) => {
    selectedQ && setSelectedQ({ ...selectedQ, validationRules });
    selectedQ && console.log({ ...selectedQ, validationRules });
  };

  useEffect(() => {
    if (selectedQ?.type !== Q.Address) {
      let validationResult = form.validate();

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
      selectedQ?.type !== Q.Address
    ) {
      const updatedValues = { ...selectedQ?.validationRules };
      form.reset();
      setValues(updatedValues);
    } else {
      if (
        selectedQ?.type === Q.Address &&
        selectedQ?.validationRules !== null
      ) {
        setAddressRules(selectedQ?.validationRules);
      } else {
        setAddressRules(null);
      }
      form.reset();
    }
  }, [selectedQ?.id]);

  const addRule = (ruleType: string) => {
    if (selectedQ.type === Q.Address) {
      let newRule;
      if (ruleType === "length") {
        newRule = {
          min: "3",
          max: "5",
          ruleType,
        };
        newRule.errorMessage = `${selectedFieldKey}: length should be between ${newRule.min} and ${newRule?.max} characters`;
      } else if (ruleType === "textType") {
        newRule = {
          type: "Letters_&_Numbers",
          ruleType,
        };
        newRule.errorMessage = `${selectedFieldKey}: only ${newRule.type} are allowed`;
      }
      const previousRules = addressRules?.[selectedFieldKey];
      if (previousRules) {
        previousRules.push(newRule);
        setAddressRules({ ...addressRules, [selectedFieldKey]: previousRules });
      } else {
        setAddressRules({ ...addressRules, [selectedFieldKey]: [newRule] });
      }
    } else {
      if (ruleType === "textType") {
        setFieldValue(ruleType, {
          type: "Letters_&_Numbers",
          errorMessage: `Letters_&_Numbers only allowed.`,
        });
      } else if (ruleType === "wordCount") {
        setFieldValue(ruleType, {
          min: "2",
          max: "15",
          errorMessage: "Input should contain minimum 2 words",
        });
      } else {
        setFieldValue(ruleType, {
          min: "3",
          max: "50",
          errorMessage: "Input Length should be between 3 and 50 characters",
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
    if (selectedQ?.type !== Q.Address) {
      const validationResult = form.validate();
      if (validationResult?.hasErrors) {
        // There are validation errors, do not save the form
        return;
      }
    }
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Saving validations",
      message: `Hold on, your changes are getting updated...`,
      autoClose: false,
      withCloseButton: false,
    });

    const data = {
      validationRules:
        selectedQ?.type === Q.Address ? addressRules : { ...form.values },
    };

    await questionUpdateMutation.mutateAsync({
      qId: selectedQ.id,
      data,
    });

    setActiveTab(QuestionTabsEnum.Edit);
  };

  const AddressQuestionRules = () => {
    const addressForm = useForm({
      initialValues: selectedRule,
      validate: {
        min:
          selectedRule?.ruleType === "length" ? isNotEmpty("required") : null,
        max:
          selectedRule?.ruleType === "length" ? isNotEmpty("required") : null,
        type:
          selectedRule?.ruleType === "textType" ? isNotEmpty("required") : null,
        errorMessage: isNotEmpty("required"),
      },
    });
    const handleUpdateRule = () => {
      if (addressForm.validate().hasErrors) return;
      const newRules = addressRules?.[addressForm.values.fieldKey];
      let rule = newRules.find(
        (r) => r.ruleType == addressForm.values.ruleType,
      );
      if (rule.ruleType == "length") {
        rule.min = addressForm.values.min;
        rule.max = addressForm.values.max;
      }
      if (rule.ruleType == "textType") {
        rule.type = addressForm.values.type;
      }
      rule.errorMessage = addressForm.values.errorMessage;
      setAddressRules({
        ...addressRules,
        [addressForm.values.fieldKey]: newRules,
      });
      setSelectedRule(null);
      close();
    };

    useEffect(() => {
      addressForm.setValues(selectedRule);
    }, [selectedRule]);

    return (
      <>
        <Paper bg={colors.yellow[0]} p="sm">
          <Group>
            <Select
              data={selectedQ?.features?.[selectedLanguage]?.fields?.map(
                (f) => f?.fieldKey,
              )}
              onChange={(value) => setSelectedFieldKey(value)}
              label={"select field Key"}
              placeholder="select key"
              value={selectedFieldKey}
            />
            <Select
              label={"select rule type"}
              placeholder="Select rule type"
              data={ruleList?.filter(
                (ruleType) =>
                  !addressRules?.[selectedFieldKey]?.some(
                    (r) => r.ruleType == ruleType,
                  ),
              )}
              onChange={(ruleType) => addRule(ruleType)}
            />
          </Group>
        </Paper>
        <ScrollAreaAutosize h={230} scrollbarSize={8}>
          {addressRules &&
            Object.entries(addressRules)?.map(([fieldKey, rules], index) => (
              <Paper bg={colors.blue[0]} p={"sm"} my={"xs"} key={index}>
                <Group>
                  <Title order={6}>{fieldKey}</Title>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => {
                      const updatedAddressRules = { ...addressRules };
                      if (fieldKey in updatedAddressRules)
                        delete updatedAddressRules[fieldKey];
                      if (!Object.keys(updatedAddressRules).length)
                        setAddressRules(null);
                      setAddressRules(updatedAddressRules);
                    }}
                  >
                    <IconTrash color={colors.red[5]} />
                  </ActionIcon>
                </Group>
                {rules?.map((r: Rule, ruleIndex) => (
                  <Group py={"xs"} key={r?.ruleType}>
                    <Text w={80}>{r?.ruleType}:</Text>
                    {r?.ruleType === "length" && (
                      <>
                        <ContainedNumberInput
                          value={r?.min}
                          readOnly
                          label={"Min"}
                          w={100}
                        />
                        <ContainedNumberInput
                          value={r?.max}
                          readOnly
                          label={"Max"}
                          w={100}
                        />
                      </>
                    )}
                    {r?.ruleType === "textType" && (
                      <ContainedTextField
                        value={r?.type}
                        readOnly
                        label={"Type"}
                      />
                    )}
                    <ContainedTextField
                      value={r?.errorMessage}
                      readOnly
                      description={
                        "please change according to display text of the field"
                      }
                      label={"Error Message"}
                      mb={"md"}
                    />
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        setSelectedRule({ ...r, fieldKey });
                        open();
                      }}
                    >
                      <IconEdit />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        const newRules = rules?.filter(
                          (rule) => rule?.ruleType !== r?.ruleType,
                        );
                        if (!newRules.length) {
                          delete addressRules?.[fieldKey];
                          if (isEmptyObject(addressRules))
                            setAddressRules(null);
                          else setAddressRules(addressRules);
                        }
                        setAddressRules({
                          ...addressRules,
                          [fieldKey]: newRules,
                        });
                      }}
                    >
                      <IconTrash color={colors.red[5]} />
                    </ActionIcon>
                  </Group>
                ))}
              </Paper>
            ))}
          <FormModalLayout
            opened={opened}
            onClose={close}
            title="Update Rule"
            centered
          >
            <Text>Field Key: {selectedRule?.fieldKey}</Text>
            {selectedRule?.ruleType === "length" && (
              <>
                <ContainedNumberInput
                  {...addressForm.getInputProps("min")}
                  label={"Min"}
                  w={"fit-content"}
                />
                <ContainedNumberInput
                  {...addressForm.getInputProps("max")}
                  label={"Max"}
                />
              </>
            )}
            {selectedRule?.ruleType === "textType" && (
              <ContainedSelection
                {...addressForm.getInputProps("type")}
                label={"Type"}
                data={["Letters", "Letters_&_Numbers", "Numbers"]}
              />
            )}
            <ContainedTextField
              {...addressForm.getInputProps("errorMessage")}
              label={"Error Message"}
              description={
                "please change according to display text of the field"
              }
            />
            <RateupButtonBlue
              title={"update"}
              onClick={handleUpdateRule}
              mt="sm"
            />
          </FormModalLayout>
        </ScrollAreaAutosize>
      </>
    );
  };
  return (
    <Stack justify="space-between" style={{ height: "100%" }}>
      <Stack>
        <Title order={3}>Validation Editor</Title>
        <Text c="gray">
          {" "}
          Add validation rules to the user input for this question.
        </Text>
        <Divider />
        {selectedQ?.type === Q.Address ? (
          <AddressQuestionRules />
        ) : (
          <Paper
            style={{ minHeight: "300px", minWidth: "650px", maxWidth: "650px" }}
          >
            <ScrollArea h={400}>
              <form onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSave]])}>
                {Object.entries(values).map(([ruleType, ruleValues]) => {
                  const ruleData = ruleValues as RuleValue;

                  return (
                    <div key={ruleType}>
                      <Group
                        align="center"
                        mb="sm"
                        px="lg"
                        py="sm"
                        style={{
                          backgroundColor: colors.blue[0],
                          borderRadius: "12px",
                        }}
                      >
                        <Title
                          order={4}
                          style={{ maxWidth: "100px", minWidth: "100px" }}
                        >
                          {ruleTitle(ruleType) || ruleType}
                        </Title>
                        {"min" in ruleData && "max" in ruleData ? (
                          <>
                            <Group>
                              <TextInput
                                style={{ maxWidth: "100px" }}
                                label="Min"
                                value={ruleData.min}
                                onChange={(event) => {
                                  const newValue: RuleValue = {
                                    ...(ruleData as RuleValue),
                                    min: event.target.value,
                                  };
                                  setFieldValue(ruleType, newValue);
                                }}
                                required
                                error={errors[`${ruleType}.min`]}
                              />
                              <TextInput
                                label="Max"
                                style={{ maxWidth: "100px" }}
                                value={ruleData.max}
                                onChange={(event) => {
                                  const newValue: RuleValue = {
                                    ...(ruleData as RuleValue),
                                    max: event.target.value,
                                  };
                                  setFieldValue(ruleType, newValue);
                                }}
                                required
                                error={errors[`${ruleType}.max`]}
                              />
                            </Group>
                          </>
                        ) : (
                          <Select
                            label="Input type:"
                            placeholder="Select rule type"
                            data={["Letters", "Letters_&_Numbers"]}
                            defaultValue="Letters_&_Numbers"
                            onChange={(event) => {
                              const newValue: RuleValue = {
                                ...(ruleData as RuleValue),
                                type: event,
                                errorMessage: `${event} only allowed.`,
                              };
                              setFieldValue(ruleType, newValue);
                            }}
                            error={errors[`${ruleType}.type`]}
                          />
                        )}
                        <TextInput
                          style={{ maxWidth: "300px" }}
                          label="Error Message"
                          value={ruleData.errorMessage}
                          onChange={(event) => {
                            const newValue: RuleValue = {
                              ...(ruleData as RuleValue),
                              errorMessage: event.target.value,
                            };
                            setFieldValue(ruleType, newValue);
                          }}
                          required
                          error={errors[`${ruleType}.errorMessage`]}
                        />

                        <Group px="xl">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => deleteRule(ruleType)}
                          >
                            <IconTrash color={colors.red[5]} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </div>
                  );
                })}

                {Object.keys(values).length < 3 && (
                  <Group
                    p="md"
                    mt="xl"
                    style={{
                      maxWidth: "350px",
                      backgroundColor: colors.yellow[0],
                      borderRadius: "12px",
                    }}
                  >
                    <Title order={4} style={{ maxWidth: "120px" }}>
                      Add Rule :
                    </Title>
                    <Select
                      placeholder="Select rule type"
                      data={ruleList?.filter(
                        (ruleType) => !(ruleType in values),
                      )}
                      onChange={(ruleType) => addRule(ruleType)}
                    />
                  </Group>
                )}
              </form>
            </ScrollArea>
          </Paper>
        )}
      </Stack>
      <Group justify="space-between">
        <RateupButtonSecondary
          title={"Cancel"}
          size="md"
          onClick={() => setActiveTab(QuestionTabsEnum.Edit)}
        />
        <RateupButtonBlue
          title={"Save"}
          size="md"
          onClick={handleSave}
          loading={questionUpdateMutation.isPending}
        />
      </Group>
    </Stack>
  );
};

export default ValidationRulesEditor;
