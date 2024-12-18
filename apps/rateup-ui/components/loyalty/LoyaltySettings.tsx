import React, { useEffect, useState } from "react";

import {
  ActionIcon,
  Badge,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconPlus } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";

import { TemplateType } from "@/types/enums";
import {
  useCreateLoyaltyTemplate,
  useGetAllLoyaltyTemplates,
  useUpdateLoyaltyTemplate,
} from "@/backend/loyalty/settings/settings.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";

import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";
import PaperLayout from "../styled/Layouts/PaperLayout";
import TanstackTable from "../Table/TanstackTable";

const LoyaltySettings = () => {
  const { data: templateConfigs, isPending } = useGetAllLoyaltyTemplates();
  const [opened, { open, close }] = useDisclosure(false);

  const [selectedConfig, setSelectedConfig] = useState(null);

  const columns = generateColumnsForLoyaltyTemplate(setSelectedConfig, open);

  return (
    <Stack>
      <Group>
        <Title order={4}>Loyalty Template Configuration</Title>
        <RateupButtonBlue
          title={"New"}
          leftIcon={<IconPlus />}
          onClick={open}
        />
      </Group>
      {/* <SimpleGrid cols={2}>
        {templateConfigs?.map((config) => {
          return (
            <LTemplateConfigCard
              config={config}
              key={config?.id}
              setSelectedConfig={setSelectedConfig}
              open={open}
            />
          );
        })}
      </SimpleGrid> */}
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
        close={close}
      />
    </Stack>
  );
};

export default LoyaltySettings;

export enum LoyaltyTemplateTypes {
  CustomerRegistration = "CustomerRegistration",
  CustomerInfo = "CustomerInfo",
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

  const updateTempMut = useUpdateLoyaltyTemplate(config?.type);

  const form = useForm({
    initialValues: {
      type: LoyaltyTemplateTypes.CustomerRegistration,
      waTemplateId: "",
      requestMessage: "",
    },
    validate: {
      waTemplateId: isNotEmpty("Template required"),
    },
  });

  const hanldeTemplateConfig = () => {
    if (form.validate().hasErrors) return;
    if (config) {
      const { type, ...rest } = form.values;
      updateTempMut.mutate(rest, {
        onSettled: () => {
          form.reset();
          close();
        },
      });
      return;
    }
    templateMut.mutate(form.values, {
      onSettled: () => {
        form.reset();
        close();
      },
    });
  };

  useEffect(() => {
    if (config) {
      const { createdAt, id, orgId, templateName, ...rest } = config;
      form.setValues({ ...rest });
    }
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
      title="Template Config"
      buttonTitle="Save"
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      includeCancelButton
      onSubmit={hanldeTemplateConfig}
      isLoading={templateMut.isPending || updateTempMut.isPending}
      centered
    >
      <Stack>
        <ContainedSelection data={typeData} {...form.getInputProps("type")} />
        <WaTemplateSelector
          templateType={TemplateType.LOYALTY}
          label={getLoyaltyTemplateLabel(form.values.type)?.templateLabel}
          description={
            getLoyaltyTemplateLabel(form.values.type)?.templateDescription
          }
          {...form.getInputProps("waTemplateId")}
        />
        <ContainedTextField
          label="Request Message"
          {...form.getInputProps("requestMessage")}
        />
      </Stack>
    </FormModalLayout>
  );
};

const LTemplateConfigCard = ({ config, setSelectedConfig, open }) => {
  return (
    <PaperLayout
      onClick={() => {
        setSelectedConfig(config);
        open();
      }}
      style={{ cursor: "pointer" }}
    >
      <Stack>
        <Title order={5}>{getLoyaltyTemplateLabel(config?.type)?.label}</Title>
        <Group justify="space-between">
          <Group gap={1}>
            <Text size="sm">WhatsApp Template:</Text>
            <Badge variant="light" color="teal">
              {config?.templateName}
            </Badge>
          </Group>
          <Group gap={"sm"}>
            <Text size="sm" fw={"bold"}>
              Request Message:
            </Text>
            <Text>{config?.requestMessage}</Text>
          </Group>
        </Group>
      </Stack>
    </PaperLayout>
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
    case LoyaltyTemplateTypes.CustomerInfo:
      return {
        label: "Customer Information Request",
        templateLabel: "WhatsApp Template for Customer Info request",
        templateDescription:
          "Dynamic variables representation - {{1}} - customer name, {{2}} - points, {{3}} - ReferralCodes seperated by commas if any",
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
  templateName: string;
  requestMessage: string;
};
function generateColumnsForLoyaltyTemplate(setSelectedConfig, open) {
  const columnHelper = createColumnHelper<LoyaltyTemplate>();

  return [
    columnHelper.accessor((row) => getLoyaltyTemplateLabel(row.type).label, {
      id: "type",
      header: () => <span>Type</span>,
    }),
    columnHelper.accessor((row) => row.templateName, {
      id: "templateName",
      header: "WhatsApp Template",
    }),
    columnHelper.accessor((row) => row.requestMessage, {
      id: "requestMessage",
      header: "Request Message",
    }),
    columnHelper.accessor((row) => row, {
      id: "action",
      header: "",
      cell: ({ getValue }) => {
        return (
          <ActionIcon
            variant="subtle"
            onClick={() => {
              setSelectedConfig(getValue());
              open();
            }}
          >
            <IconEdit />
          </ActionIcon>
        );
      },
    }),
  ];
}
