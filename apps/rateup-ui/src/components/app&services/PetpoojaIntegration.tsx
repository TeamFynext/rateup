import { zodResolver } from "@hookform/resolvers/zod";
import { IconRefresh, IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useId, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import {
  useDeleteIntegrationMutation,
  useIntegrationByType,
  usePetpoojaWebhookUrl,
  useRotatePetpoojaWebhookUrlMutation,
  useSavePetpoojaSettingsMutation,
} from "@/backend/appsIntegration/integration.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import {
  IntegrationSection,
  IntegrationShell,
} from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import { Button } from "../ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";

export function PetpoojaIntegration() {
  const { data: integration } = useIntegrationByType(IntegratedApps.petpooja);

  const config = INTEGRATIONS_CONFIG.petpooja;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={Boolean(integration?.credential?.restaurantId)}
      detail={integration?.credential?.restaurantId}
    >
      <IntegrationSection label="Setup">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PetpoojaConfig integration={integration} />
          <WaTemplateSendSettings integration={integration} />
        </div>
      </IntegrationSection>

      <IntegrationSection label="Activity">
        <WaTemplateSentHistory integration={integration} />
      </IntegrationSection>
    </IntegrationShell>
  );
}

function PetpoojaConfig({ integration }: { integration: AppIntegration }) {
  const uid = useId();
  const [restaurantId, setRestaurantId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const saveSettings = useSavePetpoojaSettingsMutation();
  const deleteIntegration = useDeleteIntegrationMutation(IntegratedApps.petpooja);
  // Each org has its own order URL, with a token in it; the old shared one no longer sends.
  const webhook = usePetpoojaWebhookUrl(Boolean(integration));
  const rotateUrl = useRotatePetpoojaWebhookUrlMutation();
  const confirm = useConfirm();
  const handleConfig = () => {
    if (!restaurantId.trim().length) {
      setError("Restaurant Id is required");
      return;
    }
    saveSettings.mutate({ restaurantId });
  };

  const handleRotate = async () => {
    const shouldRotate = await confirm({
      title: "Create a new webhook URL?",
      description:
        "The current URL stops working at once. Paste the new one into Petpooja, or orders stop sending messages.",
      confirmText: "Create new URL",
      cancelText: "Cancel",
    });
    if (shouldRotate) rotateUrl.mutate();
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
    <IntegrationFormCard
      title="Configuration"
      description="Your Petpooja restaurant, and the address Petpooja should send orders to."
      actions={
        <>
          <Button onClick={handleConfig} loading={saveSettings.isPending}>
            {"Save changes"}
          </Button>
          <Button variant="ghost" onClick={handleDeleteConfig} disabled={!integration}>
            <IconTrash data-icon="inline-start" />
            Disconnect
          </Button>
        </>
      }
    >
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${uid}-restaurant-id`}>Restaurant ID</FieldLabel>
        <Input
          id={`${uid}-restaurant-id`}
          value={restaurantId}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            if (error) setError(null);
            setRestaurantId(e.currentTarget.value);
          }}
          placeholder="Enter your Petpooja restaurant ID"
          required
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>

      {integration && (
        <Field>
          <FieldLabel htmlFor={`${uid}-webhook`}>Webhook URL</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`${uid}-webhook`}
              readOnly
              value={webhook.data?.url ?? ""}
              placeholder={webhook.isLoading ? "Loading…" : ""}
            />
            <InputGroupAddon align="inline-end">
              <ApiCopyButton value={webhook.data?.url ?? ""} />
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Paste this into Petpooja to start receiving orders. It is private to your workspace:
            anyone with it can trigger your order message.
          </FieldDescription>
          <div>
            <Button variant="ghost" onClick={handleRotate} loading={rotateUrl.isPending}>
              <IconRefresh data-icon="inline-start" />
              Create new URL
            </Button>
          </div>
        </Field>
      )}
    </IntegrationFormCard>
  );
}

function WaTemplateSendSettings({ integration }: { integration: AppIntegration }) {
  const uid = useId();
  const { t: translations } = useTranslation();
  const schema = z.object({
    teamId: z.string().trim().min(1, "Team is required"),
    waTemplateId: z.string().trim().min(1, "WhatsApp Template is requied"),
    timeDelay: z
      .number()
      .refine(
        (value) => !(value !== 0 && value < 60),
        "Minimum time delay should be 60. You can set to 0 if not needed",
      ),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      teamId: "",
      waTemplateId: "",
      timeDelay: 0,
    },
  });

  const saveSettings = useSavePetpoojaSettingsMutation();

  const handleSave = form.handleSubmit((values) => {
    toast.loading("Updating settings", {
      id: "integration-update",
    });
    saveSettings.mutate({
      orderEvent: { ...values, scheduleLater: values.timeDelay > 0 },
    });
  });

  useEffect(() => {
    if (integration?.credential?.orderEvent) form.reset({ ...integration?.credential?.orderEvent });
  }, [integration]);

  const handleDelete = () => {
    toast.loading("Updating settings", {
      id: "integration-update",
    });
    saveSettings.mutate(
      { orderEvent: null },
      {
        onSuccess: () => {
          form.reset();
        },
      },
    );
  };

  return (
    <IntegrationFormCard
      title="Order message"
      description="What RateUp sends a customer after an order lands, and how long it waits."
      actions={
        <>
          <Button onClick={handleSave} disabled={!integration}>
            Save changes
          </Button>
          <Button variant="ghost" onClick={handleDelete} disabled={!integration}>
            <IconTrash data-icon="inline-start" />
            Clear
          </Button>
        </>
      }
    >
      <Controller
        name="teamId"
        control={form.control}
        render={({ field, fieldState }) => (
          <TeamSelector
            placeholder={translations("Select Team")}
            withAsterisk
            {...field}
            error={fieldState.error?.message}
            searchable
            label={translations("Team")}
            enableDefaultValue={false}
          />
        )}
      />
      <Controller
        name="waTemplateId"
        control={form.control}
        render={({ field, fieldState }) => (
          <WaTemplateSelector
            withAsterisk
            {...field}
            error={fieldState.error?.message}
            teamId={form.watch("teamId")}
          />
        )}
      />
      <Controller
        name="timeDelay"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor={`${uid}-field`}>
              {translations("Time Delay (in minutes)")}
            </FieldLabel>
            <Input
              id={`${uid}-field`}
              {...field}
              type="number"
              min={0}
              onChange={(e) => field.onChange(Number(e.target.value))}
              aria-invalid={Boolean(fieldState.error)}
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />
    </IntegrationFormCard>
  );
}

function WaTemplateSentHistory({ integration }: { integration: AppIntegration }) {
  const rows = integration
    ? integration.credential?.history?.map((hist, idx: number) => ({
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

  type HistoryRow = NonNullable<typeof rows>[0];

  const columns: ColumnDef<DataTableFeatures, HistoryRow>[] = [
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
    <div className="flex flex-col gap-4">
      <DataTable columns={columns} data={rows ?? []} />
    </div>
  );
}
