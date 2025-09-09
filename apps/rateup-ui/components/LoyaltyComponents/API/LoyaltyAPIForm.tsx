"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Box,
  Collapse,
  Divider,
  Flex,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isInRange, isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconX,
} from "@tabler/icons-react";

import { LoyaltyApiFeature } from "@/types/enums";
import { useLoyaltyApiSettings } from "@/backend/loyalty/apiSettings/apiSettings.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import {
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import FormPaperLayout from "@/components/Survey/TakeSurvey/TakeSurveyComponent/QuestionForms/layout/FormPaperLayout";
import { useUser } from "@/context/UserContext";
import { API_URL } from "@/utils/constants";

import { LASelector, LRSelector } from "../utils";

const api = `${API_URL}/api/external/v1`;

const LoyaltyAPIForm = ({ apiInfo }) => {
  const { user } = useUser();
  const { create, update } = useLoyaltyApiSettings(apiInfo?.id);
  const [fieldData, setFieldData] = useState({
    fieldKey: "",
    fieldValue: "",
  });

  const [opened, { toggle }] = useDisclosure(false);
  const [openedAddField, { open: openAddField, close: closeAddField }] =
    useDisclosure(false);

  const form = useForm({
    initialValues: {
      feature: LoyaltyApiFeature.action,
      actionId: "",
      rewardId: "",
      phoneKey: "",
      amountKey: "",
      rules: {
        fields: [{ key: "", value: "" }],
      },
      priority: 1,
      active: true,
    },
    validate: {
      feature: isNotEmpty("required"),
      amountKey: isNotEmpty("required"),
      phoneKey: isNotEmpty("required"),
      rules: isNotEmpty("required"),
      actionId: (value, values) =>
        values.feature === LoyaltyApiFeature.action && !value
          ? "required"
          : null,
      rewardId: (value, values) =>
        values.feature === LoyaltyApiFeature.reward && !value
          ? "required"
          : null,
      priority: isInRange({ min: 1 }, "priority must be greater than 0"),
    },
  });

  useEffect(() => {
    const initialValues = {
      feature: apiInfo?.feature ?? "",
      phoneKey: apiInfo?.phoneKey ?? "",
      amountKey: apiInfo?.amountKey ?? "",
      rules: apiInfo?.rules || { fields: [] },
      actionId: apiInfo?.actionId ?? "",
      rewardId: apiInfo?.rewardId ?? "",
      priority: apiInfo?.priority ?? 1,
      active: apiInfo?.active,
    };
    form.setInitialValues(initialValues);
    form.setValues(initialValues);
  }, [apiInfo]);

  const apiUrl = useMemo(
    () =>
      user && form.values.feature
        ? `${api}/${user.orgId}/loyalty/${form.values.feature}/webhook`
        : null,
    [form.values.feature, user?.orgId],
  );

  const fields = useMemo(
    () => (form.getValues().rules ? form.getValues().rules.fields : []),
    [form.getValues().rules],
  );

  const router = useRouter();

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    if (apiInfo) {
      update.mutate(form.values, {
        onSuccess: () => {},
      });
    } else {
      create.mutate(form.values, {
        onSuccess: () => {
          router.push("/dashboard/loyalty/api");
        },
      });
    }
  }

  function onCancel() {
    form.reset();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title>{apiInfo ? "Edit" : "Create"}</Title>
      </Group>
      <Group gap={"xs"} justify="flex-end">
        <RateupButtonSecondary title="Cancel" onClick={onCancel} />
        <RateupButtonPrimary
          title="Save"
          onClick={handleSubmit}
          loading={create.isPending || update.isPending}
        />
      </Group>
      <Flex gap={"lg"} w={"100%"}>
        <Stack w={"50%"}>
          <ContainedNumberInput
            description={"lower the number, higher the priority"}
            {...form.getInputProps("priority")}
            label={"priority"}
          />
          <ContainedSelection
            label={"select feature"}
            {...form.getInputProps("feature")}
            data={Object.values(LoyaltyApiFeature)}
          />
          {form.values.feature === LoyaltyApiFeature.action ? (
            <LASelector
              {...form.getInputProps("actionId")}
              label={"Select action"}
            />
          ) : (
            <LRSelector
              {...form.getInputProps("rewardId")}
              label={"Select reward"}
            />
          )}
          <ContainedTextField
            label={"key for phone"}
            {...form.getInputProps("phoneKey")}
          />
          <ContainedTextField
            label={"key for amount"}
            {...form.getInputProps("amountKey")}
          />
          <Box>
            <Group>
              <Text>Add Rules</Text>
              <ActionIcon onClick={toggle} variant="subtle">
                {opened ? <IconChevronUp /> : <IconChevronDown />}
              </ActionIcon>
            </Group>

            <Collapse in={opened}>
              <Flex justify={"flex-end"}>
                <RateupButtonPrimary
                  title="Add Field"
                  leftIcon={<IconPlus size={15} />}
                  onClick={openAddField}
                  size="sm"
                />
              </Flex>
              <Stack>
                {openedAddField && (
                  <Group>
                    <TextInput
                      label={"field key"}
                      value={fieldData.fieldKey || ""}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          fieldKey: e.currentTarget.value,
                        })
                      }
                    />
                    -
                    <TextInput
                      label={"field value"}
                      value={fieldData.fieldValue || ""}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          fieldValue: e.currentTarget.value,
                        })
                      }
                    />
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        fields.push({
                          key: fieldData.fieldKey,
                          value: fieldData.fieldValue,
                        });
                        form.setFieldValue("rules.fields", fields);
                        setFieldData({ fieldKey: "", fieldValue: "" });
                      }}
                      mt={"sm"}
                    >
                      <IconCheck size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        setFieldData({ fieldKey: "", fieldValue: "" });
                        closeAddField();
                      }}
                      mt={"sm"}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                )}
                {fields.map((field, index) => (
                  <Group key={index}>
                    <TextInput
                      key={form.key(`rules.fields.${index}.key`)}
                      {...form.getInputProps(`rules.fields.${index}.key`)}
                    />
                    -
                    <TextInput
                      key={form.key(`rules.fields.${index}.value`)}
                      {...form.getInputProps(`rules.fields.${index}.value`)}
                    />
                    <ActionIcon
                      onClick={() => form.removeListItem("rules.fields", index)}
                      variant="subtle"
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            </Collapse>
          </Box>
        </Stack>
        <Divider orientation="vertical" />
        {apiUrl && (
          <Stack w={"45%"}>
            {apiInfo && (
              <Switch
                {...form.getInputProps("active", { type: "checkbox" })}
                label={"Active"}
              />
            )}
            <ContainedTextField
              label={"Webhook Url"}
              value={apiUrl}
              readOnly
              rightSection={<ApiCopyButton value={apiUrl} />}
            />
            {apiInfo && (
              <Box
                style={{ borderRadius: "15px" }}
                bg={"var(--shade-of-blue)"}
                p={"xl"}
              >
                <Text fw={600} mb={"md"}>
                  Body
                </Text>
                <Text>{`{`}</Text>
                <Stack px={"md"} gap={1}>
                  <Text size="sm">{`${form.values.phoneKey}: string;`}</Text>
                  <Text size="sm">{`${form.values.amountKey}:  number;`}</Text>
                  {fields &&
                    fields.map((f) => (
                      <Text size="sm">{`${f.key}: string;`}</Text>
                    ))}
                </Stack>
                <Text>{`
              }`}</Text>
              </Box>
            )}
          </Stack>
        )}
      </Flex>
    </Stack>
  );
};

export default LoyaltyAPIForm;
