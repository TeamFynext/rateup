"use client";

import { useEffect, useState } from "react";

import {
  Checkbox,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Title,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { IntegratedApps, ShopifySendAfter } from "@/types/enums";
import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import {
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import { ActionIconCommon } from "@/components/menu/ActionIcon/ActionIconCommon";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TableLayoutSecondary from "@/components/styled/Table/TableLayoutSecondary";
import { formatIsoDateStringWithTime } from "@/utils/dateTime";

const PETPOOJA_WEBHOOK_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL}/api/public/integrations/petpooja`;

const index = () => {
  const { data: integration } = useIntegrationByType(IntegratedApps.petpooja);
  const updateIntegration = useUpdateIntegrationMutation(
    IntegratedApps.petpooja,
  );
  const translations = useTranslations();

  return (
    <Stack>
      <SimpleGrid cols={2}>
        <PetpoojaConfig
          integration={integration}
          updateIntegration={updateIntegration}
        />
        <WaTemplateSendSettings
          integration={integration}
          updateIntegration={updateIntegration}
          translations={translations}
        />
      </SimpleGrid>
      <Divider mt={"md"} />
      <WaTemplateSentHistory integration={integration} />
    </Stack>
  );
};

const PetpoojaConfig = ({ integration, updateIntegration }) => {
  const [restaurantId, setRestaurantId] = useState("");
  const [error, setError] = useState(null);
  const createIntegration = useCreateIntegrationMutation(
    IntegratedApps.petpooja,
  );
  const deleteIntegration = useDeleteIntegrationMutation(
    IntegratedApps.petpooja,
  );
  const [opened, { open, close }] = useDisclosure(false);
  const handleConfig = () => {
    if (!restaurantId.trim().length) {
      setError("Restaurant Id is required");
      return;
    }
    if (integration) {
      toast.loading("Updating configuration", {
        id: "integration-update",
      });
      updateIntegration.mutate({
        credential: { ...integration.credential, restaurantId },
      });
    } else
      createIntegration.mutate({
        credential: { restaurantId },
      });
  };

  const handleDeleteConfig = () => {
    deleteIntegration.mutate();
  };
  useEffect(() => {
    setRestaurantId(integration?.credential.restaurantId ?? "");
  }, [integration]);

  return (
    <PaperLayout>
      <Stack>
        <Title order={4}>Petpooja Config</Title>
        <ContainedTextField
          value={restaurantId}
          onChange={(e) => {
            if (error) setError(null);
            setRestaurantId(e.currentTarget.value);
          }}
          label={"Restaurant ID"}
          placeholder="Enter your petpooja Restaurant id"
          withAsterisk
          error={error}
        />
        <Group justify="space-between">
          <RateupButtonBlue
            onClick={handleConfig}
            title="save"
            loading={createIntegration.isPending}
          />
          <ActionIconCommon
            children={<IconTrash />}
            handleClick={open}
            label="Delete integration"
            disabled={!integration}
          />
        </Group>
        {integration && (
          <ContainedTextField
            readOnly
            value={PETPOOJA_WEBHOOK_ENDPOINT}
            rightSection={<ApiCopyButton value={PETPOOJA_WEBHOOK_ENDPOINT} />}
          />
        )}
      </Stack>

      <ConfirmationModal
        forDeleteFunctionality
        confirmLabel="Delete"
        headerLabel="Are you sure to delete this integration?"
        headerTitle="Delete Integration"
        closeLabel="Cancel"
        onConfirm={handleDeleteConfig}
        deleteQuotion="All related data will be deleted"
        onClose={close}
        opened={opened}
      />
    </PaperLayout>
  );
};

const WaTemplateSendSettings = ({
  integration,
  updateIntegration,
  translations,
}) => {
  const form = useForm({
    initialValues: {
      teamId: null,
      waTemplateId: null,
      timeDelay: 0,
    },
    validate: {
      teamId: isNotEmpty("Team is required"),
      waTemplateId: isNotEmpty("WhatsApp Template is requied"),
      timeDelay: (value) =>
        value !== 0 && value < 60
          ? "Minimum time delay should be 60. You can set to 0 if not needed"
          : null,
    },
  });

  const handleSave = () => {
    if (form.validate().hasErrors) return;
    toast.loading("Updating settings", {
      id: "integration-update",
    });
    updateIntegration.mutate({
      credential: {
        ...integration.credential,
        orderEvent: form.values,
      },
    });
  };

  useEffect(() => {
    if (integration?.credential?.orderEvent)
      form.setValues({ ...integration?.credential?.orderEvent });
  }, [integration]);

  const handleDelete = () => {
    toast.loading("Updating settings", {
      id: "integration-update",
    });
    updateIntegration.mutate(
      {
        credential: {
          ...integration.credential,
          orderEvent: undefined,
        },
      },
      {
        onSuccess: () => {
          form.reset();
        },
      },
    );
  };

  return (
    <PaperLayout>
      <Stack>
        <Title order={4}>WhatsApp Template Config to Send on Order</Title>
        <TeamSelector
          placeholder={translations("Select Team")}
          withAsterisk
          {...form.getInputProps("teamId")}
          searchable
          label={translations("Team")}
          enableDefaultValue={false}
        />
        <WaTemplateSelector
          withAsterisk
          searchable
          {...form.getInputProps("waTemplateId")}
          teamId={form.values.teamId}
        />
        <ContainedNumberInput
          label={translations("Time Delay (in minutes)")}
          {...form.getInputProps("timeDelay")}
          allowDecimal={false}
          allowNegative={false}
        />
        <Group justify="space-between">
          <RateupButtonBlue
            title="save"
            w={"fit-content"}
            onClick={handleSave}
            disabled={!integration}
          />
          <ActionIconCommon
            children={<IconTrash />}
            handleClick={handleDelete}
            label="Delete Settings"
            disabled={!integration}
          />
        </Group>
      </Stack>
    </PaperLayout>
  );
};

const WaTemplateSentHistory = ({ integration }) => {
  const columns = [
    { key: "phone", value: "Phone Number" },
    { key: "name", value: "Name" },
    { key: "status", value: "Status" },
    { key: "scheduledAt", value: "Scheduled At" },
    { key: "createdAt", value: "Created At" },
  ];

  const rows = integration
    ? integration.credential?.history?.map((hist) => ({
        phone: hist.phone,
        name: hist.name,
        status: hist.status,
        scheduledAt: hist.scheduledAt
          ? formatIsoDateStringWithTime(hist.scheduledAt)
          : formatIsoDateStringWithTime(hist.createdAt),
        createdAt: formatIsoDateStringWithTime(hist.createdAt),
      }))
    : [];
  return (
    <Stack>
      <TableLayoutSecondary columns={columns} rows={rows} />
    </Stack>
  );
};

export default index;
