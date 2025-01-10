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

import { TemplateType, WaAutomatedReplyResponseType } from "@/types/enums";
import {
  useCreateLoyaltyTemplate,
  useDeleteLoyaltyTemplate,
  useGetAllLoyaltyTemplates,
  useUpdateLoyaltyTemplate,
} from "@/backend/loyalty/settings/settings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";

import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../Modal/ConfirmationModal";
import FormModalLayout from "../Modal/FormModalLayout";
import WaTextEditor from "../RichTextEditor/waTextEditor";
import PaperLayout from "../styled/Layouts/PaperLayout";
import TanstackTable from "../Table/TanstackTable";
import { LReferralSelector } from "./utils";

const LoyaltySettings = () => {
  const { data: templateConfigs, isPending } = useGetAllLoyaltyTemplates();
  const [opened, { open, close }] = useDisclosure(false);
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);

  const [selectedConfig, setSelectedConfig] = useState(null);

  const columns = generateColumnsForLoyaltyTemplate(
    setSelectedConfig,
    open,
    openDialog,
  );

  const deleteMutation = useDeleteLoyaltyTemplate();

  return (
    <Stack>
      <Group>
        <Title order={4}>Loyalty WhatsApp Command Configuration</Title>
        <RateupButtonBlue
          title={"New"}
          leftIcon={<IconPlus />}
          onClick={open}
        />
      </Group>
      <PaperLayout>
        <TanstackTable
          columns={columns}
          data={templateConfigs}
          isPending={isPending}
        />
      </PaperLayout>
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
        headerLabel={"Are you sure to delete this Command Configuration?"}
        headerTitle={"Delete Command"}
        confirmLabel={"Delete"}
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

  let initialValues = {
    type: LoyaltyTemplateTypes.CustomerRegistration,
    waTemplateId: "",
    requestMessage: "",
    content: null,
    responseType: WaAutomatedReplyResponseType.Template,
    actionId: "",
  };

  const form = useForm({
    initialValues,
    validate: {
      requestMessage: isNotEmpty("required"),
      waTemplateId: (value, values) =>
        values.type !== LoyaltyTemplateTypes.Referral &&
        values.responseType === WaAutomatedReplyResponseType.Template &&
        !value?.length
          ? "Template required"
          : null,
      content: (value, values) =>
        values.type !== LoyaltyTemplateTypes.Referral &&
        values.responseType === WaAutomatedReplyResponseType.Text &&
        !value
          ? "content cannot be blank"
          : null,
      actionId: (value, values) =>
        values.type === LoyaltyTemplateTypes.Referral && !value?.length
          ? "Select action"
          : null,
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
    label: getLoyaltyTemplateLabel(t).label,
  }));

  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title=""
      buttonTitle="Save"
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
          Loyalty WhatsApp Command Configuration
        </Title>
        <ContainedSelection
          data={typeData}
          {...form.getInputProps("type")}
          label={"Service Type"}
          disabled={!!config}
        />
        <ContainedTextField
          label="Request Message"
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
                label={getLoyaltyTemplateLabel(form.values.type)?.templateLabel}
                description={
                  getLoyaltyTemplateLabel(form.values.type)?.templateDescription
                }
                {...form.getInputProps("waTemplateId")}
              />
            ) : (
              <Stack gap={1}>
                <Text size="sm">Reply Message</Text>
                <Text size="xs" c="dimmed">
                  {
                    getLoyaltyTemplateLabel(form.values.type)
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
          <>
            <LReferralSelector
              {...form.getInputProps("actionId")}
              label={"Referral Action"}
            />
          </>
        )}
      </Stack>
    </FormModalLayout>
  );
};

function getLoyaltyTemplateLabel(type) {
  switch (type) {
    case LoyaltyTemplateTypes.CustomerRegistration:
      return {
        label: "Customer Registration",
        templateLabel:
          "WhatsApp Template for Successfull Customer Registration",
        templateDescription:
          "Dynamic variables representation - {{1}} - customer name",
      };
    case LoyaltyTemplateTypes.PointInformation:
      return {
        label: "Point Information",
        templateLabel: "WhatsApp Template for Point Information",
        templateDescription:
          "Dynamic variables representation - {{1}} - Current point balance , {{2}} - Redeemed points, {{3}} - Total earned points",
      };
    case LoyaltyTemplateTypes.Referral:
      return {
        label: "Referral",
      };
    case LoyaltyTemplateTypes.CustomerRemoval:
      return {
        label: "Customer Removal from Loyalty",
      };
    case LoyaltyTemplateTypes.RewardsIssued:
      return {
        label: "Issued Rewards Information",
        templateLabel: "WhatsApp Template for Issued Rewards Information",
        templateDescription:
          "Dynamic variables representation - {{1}} - customer name , {{2}} Numbered list of All the issued rewards to the customer with redeem code ",
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
) {
  const columnHelper = createColumnHelper<LoyaltyTemplate>();

  return [
    columnHelper.accessor((row) => getLoyaltyTemplateLabel(row.type).label, {
      id: "type",
      header: () => <span>Type</span>,
    }),
    columnHelper.accessor((row) => row.requestMessage, {
      id: "requestMessage",
      header: "Request Message",
    }),
    columnHelper.accessor((row) => row.responseType, {
      id: "responseType",
      header: () => <span>Response Type</span>,
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
