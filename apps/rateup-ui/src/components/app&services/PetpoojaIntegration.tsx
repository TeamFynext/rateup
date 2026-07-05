import { Divider, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { ActionIconCommon } from "@/components/menu/ActionIcon/ActionIconCommon.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

const PETPOOJA_WEBHOOK_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/public/integrations/petpooja`;

export function PetpoojaIntegration() {
  const { data: integration } = useIntegrationByType(IntegratedApps.petpooja);
  const updateIntegration = useUpdateIntegrationMutation(IntegratedApps.petpooja);

  return (
    <Stack>
      <SimpleGrid cols={2}>
        <PetpoojaConfig integration={integration} updateIntegration={updateIntegration} />
        <WaTemplateSendSettings integration={integration} updateIntegration={updateIntegration} />
      </SimpleGrid>
      <Divider mt={"md"} />
      <WaTemplateSentHistory integration={integration} />
    </Stack>
  );
}

function PetpoojaConfig({ integration, updateIntegration }) {
  const [restaurantId, setRestaurantId] = useState("");
  const [error, setError] = useState(null);
  const createIntegration = useCreateIntegrationMutation(IntegratedApps.petpooja);
  const deleteIntegration = useDeleteIntegrationMutation(IntegratedApps.petpooja);
  const confirm = useConfirm();
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

  const handleDeleteConfig = async () => {
    const shouldDelete = await confirm({
      title: "Delete Integration",
      description: "Are you sure to delete this integration?",
      warning: "All related data will be deleted",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!shouldDelete) return;

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
            handleClick={handleDeleteConfig}
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
    </PaperLayout>
  );
}

function WaTemplateSendSettings({ integration, updateIntegration }) {
  const { t: translations } = useTranslation();
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

  const handleSave = async () => {
    const validationRes = await form.validate();
    if (validationRes.hasErrors) return;
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
}

function WaTemplateSentHistory({ integration }) {
  const rows = integration
    ? integration.credential?.history?.map((hist, idx) => ({
        id: `history-${idx}`,
        phone: hist.phone,
        name: hist.name,
        status: hist.status,
        scheduledAt: hist.scheduledAt
          ? formatIsoDateStringWithTime(hist.scheduledAt)
          : formatIsoDateStringWithTime(hist.createdAt),
        createdAt: formatIsoDateStringWithTime(hist.createdAt),
      }))
    : [];

  type HistoryRow = (typeof rows)[0];

  const columns: ColumnDef<HistoryRow>[] = [
    {
      id: "phone",
      header: createSortableHeader("Phone Number"),
      cell: ({ row }) => row.original.phone,
    },
    {
      id: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => row.original.name,
    },
    {
      id: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => row.original.status,
    },
    {
      id: "scheduledAt",
      header: createSortableHeader("Scheduled At"),
      cell: ({ row }) => row.original.scheduledAt,
    },
    {
      id: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => row.original.createdAt,
    },
  ];

  return (
    <Stack>
      <DataTable columns={columns} data={rows} />
    </Stack>
  );
}
