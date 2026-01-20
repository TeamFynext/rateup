"use client";

import React, { useEffect, useState } from "react";

import {
  ActionIcon,
  Badge,
  Group,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { TemplateType, WaAutomatedReplyResponseType } from "@/types/enums";
import {
  useCreateLoyaltyTemplate,
  useDeleteLoyaltyTemplate,
  useGetAllLoyaltyTemplates,
  useUpdateLoyaltyTemplate,
} from "@/backend/loyalty/settings/settings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";

import { AccountSelector } from "../input/AccountSelector";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../Modal/ConfirmationModal";
import FormModalLayout from "../Modal/FormModalLayout";
import WaTextEditor from "../RichTextEditor/waTextEditor";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { DataTable } from "../Table/data-table";
import TanstackTable from "../Table/TanstackTable";
import { LReferralSelector } from "./utils";

const LoyaltySettings = () => {
  const { data: templateConfigs, isPending } = useGetAllLoyaltyTemplates();
  const [opened, { open, close }] = useDisclosure(false);
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);

  const [selectedConfig, setSelectedConfig] = useState(null);
  const translations = useTranslations();

  const columns = generateColumnsForLoyaltyTemplate(
    setSelectedConfig,
    open,
    openDialog,
    translations,
  );

  const deleteMutation = useDeleteLoyaltyTemplate();

  return (
    <Stack>
      <Group>
        <Title order={4}>Loyalty WhatsApp Command Configuration</Title>
        <RateupButtonBlue
          title={translations("New")}
          leftIcon={<IconPlus />}
          onClick={open}
        />
      </Group>
      <DataTable
        columns={columns}
        data={templateConfigs || []}
        isPending={isPending}
      />
      <LoyaltyWaTemplateConfig
        config={selectedConfig}
        opened={opened}
        close={() => {
          setSelectedConfig(null);
          close();
        }}
      />
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel={translations(
          "Are you sure to delete this Command Configuration?",
        )}
        headerTitle={translations("Delete Command")}
        confirmLabel={translations("Delete")}
        onConfirm={(e) => {
          deleteMutation.mutate(selectedConfig?.id, {
            onSettled: () => {
              setSelectedConfig(null);
              closeDialog();
            },
          });
        }}
      />
    </Stack>
  );
};

export default LoyaltySettings;

export enum LoyaltyTemplateTypes {
  CustomerRegistration = "CustomerRegistration",
  PointInformation = "PointInformation",
  Referral = "Referral",
  CustomerRemoval = "CustomerRemoval",
  RewardsIssued = "RewardsIssued",
}

export const LoyaltyWaTemplateConfig = ({
  config,
  opened,
  close,
}: {
  config?: any;
  opened: boolean;
  close: () => void;
}) => {
  const templateMut = useCreateLoyaltyTemplate();
  const updateTempMut = useUpdateLoyaltyTemplate(config?.id);
  const translations = useTranslations();

  let initialValues = {
    type: LoyaltyTemplateTypes.PointInformation,
    waTemplateId: "",
    requestMessage: "",
    content: null,
    responseType: WaAutomatedReplyResponseType.Template,
    actionId: "",
    whatsappSettingsPhoneId: "",
  };

  const form = useForm({
    initialValues,
    validate: {
      requestMessage: isNotEmpty("required"),
      waTemplateId: (value, values) =>
        values.type !== LoyaltyTemplateTypes.Referral &&
        values.responseType === WaAutomatedReplyResponseType.Template &&
        !value?.length
          ? translations("whatsApp Template") + translations("required")
          : null,
      content: (value, values) =>
        values.type !== LoyaltyTemplateTypes.Referral &&
        values.responseType === WaAutomatedReplyResponseType.Text &&
        !value
          ? translations("content cannot be blank")
          : null,
      actionId: (value, values) =>
        values.type === LoyaltyTemplateTypes.Referral && !value?.length
          ? translations("Select action")
          : null,
      whatsappSettingsPhoneId: isNotEmpty("required"),
    },
  });

  const hanldeTemplateConfig = () => {
    if (form.validate().hasErrors) return;
    const { type, ...rest } = form.values;
    if (type === LoyaltyTemplateTypes.Referral)
      rest.responseType = WaAutomatedReplyResponseType.Text;
    if (config) {
      updateTempMut.mutate(rest, {
        onSettled: () => {
          form.reset();
          close();
        },
      });
      return;
    }
    templateMut.mutate(
      { type, ...rest },
      {
        onSettled: () => {
          form.reset();
          close();
        },
      },
    );
  };

  useEffect(() => {
    if (config) {
      const { createdAt, id, orgId, templateName, ...rest } = config;
      initialValues = { ...rest };
    }
    form.setInitialValues(initialValues);
    form.setValues(initialValues);
  }, [config]);

  const typeData = Object.values(LoyaltyTemplateTypes).map((t) => ({
    value: t,
    label: getLoyaltyTemplateLabel(t, translations).label,
  }));
  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title=""
      buttonTitle={translations("Save")}
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      includeCancelButton
      onSubmit={hanldeTemplateConfig}
      isLoading={templateMut.isPending || updateTempMut.isPending}
      centered
      size="lg"
    >
      <Stack>
        <Title order={4} ta={"center"}>
          {translations("Loyalty WhatsApp Command Configuration")}
        </Title>
        <ContainedSelection
          data={typeData}
          {...form.getInputProps("type")}
          label={translations("Service Type")}
          disabled={!!config}
        />
        <AccountSelector {...form.getInputProps("whatsappSettingsPhoneId")} />
        <ContainedTextField
          label={translations("Request Message")}
          {...form.getInputProps("requestMessage")}
        />
        {form.values.type !== LoyaltyTemplateTypes.Referral ? (
          <>
            <RadioGroup {...form.getInputProps("responseType")}>
              <Group>
                <Radio
                  value={WaAutomatedReplyResponseType.Template}
                  label={WaAutomatedReplyResponseType.Template}
                />
                <Radio
                  value={WaAutomatedReplyResponseType.Text}
                  label={WaAutomatedReplyResponseType.Text}
                />
              </Group>
            </RadioGroup>
            {form.values.responseType ===
            WaAutomatedReplyResponseType.Template ? (
              <WaTemplateSelector
                templateType={TemplateType.LOYALTY}
                label={
                  getLoyaltyTemplateLabel(form.values.type, translations)
                    ?.templateLabel
                }
                description={
                  getLoyaltyTemplateLabel(form.values.type, translations)
                    ?.templateDescription
                }
                {...form.getInputProps("waTemplateId")}
              />
            ) : (
              <Stack gap={1}>
                <Text size="sm">{translations("Reply Message")}</Text>
                <Text size="xs" c="dimmed">
                  {
                    getLoyaltyTemplateLabel(form.values.type, translations)
                      .templateDescription
                  }
                </Text>
                <WaTextEditor
                  handleInputChange={(value) => {
                    form.setFieldValue("content", value.content);
                  }}
                  content={form.values.content}
                />
              </Stack>
            )}
          </>
        ) : (
          <LReferralSelector
            {...form.getInputProps("actionId")}
            label={translations("Referral Action")}
          />
        )}
      </Stack>
    </FormModalLayout>
  );
};

function getLoyaltyTemplateLabel(type, translations) {
  switch (type) {
    case LoyaltyTemplateTypes.CustomerRegistration:
      return {
        label: translations("Customer Registration"),
        templateLabel: translations(
          "WhatsApp Template for Successful Customer Registration",
        ),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")}`,
      };
    case LoyaltyTemplateTypes.PointInformation:
      return {
        label: translations("Point Information"),
        templateLabel: translations("WhatsApp Template for Point Information"),
        templateDescription: `Dynamic variables - {{1}} - ${translations("Current point balance")} , {{2}} - ${translations("Redeemed points")}, {{3}} - ${translations("Total earned points")}`,
      };
    case LoyaltyTemplateTypes.Referral:
      return {
        label: translations("Referral"),
      };
    case LoyaltyTemplateTypes.CustomerRemoval:
      return {
        label: translations("Customer Removal from Loyalty"),
      };
    case LoyaltyTemplateTypes.RewardsIssued:
      return {
        label: translations("Issued Rewards Information"),
        templateLabel: translations(
          "WhatsApp Template for Issued Rewards Information",
        ),
        templateDescription: `Dynamic variables - {{1}} - ${translations("customer name")} , {{2}} ${translations("Numbered list of All the issued rewards to the customer with redeem code")} `,
      };
    default:
      return {
        label: "",
        templateLabel: "",
        templateDescription: "",
      };
  }
}

type LoyaltyTemplate = {
  type: string;
  requestMessage: string;
  responseType: string;
};
function generateColumnsForLoyaltyTemplate(
  setSelectedConfig,
  open,
  openDialog,
  translations,
) {
  const columnHelper = createColumnHelper<LoyaltyTemplate>();

  return [
    columnHelper.accessor(
      (row) => getLoyaltyTemplateLabel(row.type, translations).label,
      {
        id: "type",
        header: () => <span>Type</span>,
      },
    ),
    columnHelper.accessor((row) => row.requestMessage, {
      id: "requestMessage",
      header: translations("Request Message"),
    }),
    columnHelper.accessor((row) => row.responseType, {
      id: "responseType",
      header: () => <span>{translations("Response Type")}</span>,
      cell: ({ getValue }) => {
        return (
          <Badge variant="light" color={getResponseTypeColor(getValue())}>
            {getValue()}
          </Badge>
        );
      },
    }),
    columnHelper.accessor((row) => row, {
      id: "action",
      header: "",
      cell: ({ getValue }) => {
        return (
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setSelectedConfig(getValue());
                open();
              }}
              size={"sm"}
            >
              <IconEdit />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                setSelectedConfig(getValue());
                openDialog();
              }}
              color="red"
              size={"sm"}
            >
              <IconTrash />
            </ActionIcon>
          </Group>
        );
      },
    }),
  ];
}

function getResponseTypeColor(value) {
  switch (value) {
    case WaAutomatedReplyResponseType.Template:
      return "var(--wa-green)";
    case WaAutomatedReplyResponseType.Text:
      return "var(--wa-blue)";
  }
}
