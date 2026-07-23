import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { ActionIconCommon } from "@/components/menu/ActionIcon/ActionIconCommon.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const PETPOOJA_WEBHOOK_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/public/integrations/petpooja`;

export function PetpoojaIntegration() {
  const { data: integration } = useIntegrationByType(IntegratedApps.petpooja);
  const updateIntegration = useUpdateIntegrationMutation(IntegratedApps.petpooja);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <PetpoojaConfig integration={integration} updateIntegration={updateIntegration} />
        <WaTemplateSendSettings integration={integration} updateIntegration={updateIntegration} />
      </div>
      <Separator className="mt-4" />
      <WaTemplateSentHistory integration={integration} />
    </div>
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold">Petpooja Config</h4>
        <div>
          <Label>Restaurant ID</Label>
          <Input
            value={restaurantId}
            onChange={(e) => {
              if (error) setError(null);
              setRestaurantId(e.currentTarget.value);
            }}
            placeholder="Enter your petpooja Restaurant id"
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex items-center justify-between">
          <Button onClick={handleConfig}>
            {createIntegration.isPending ? "Saving..." : "Save"}
          </Button>
          <ActionIconCommon
            handleClick={handleDeleteConfig}
            label="Delete integration"
            disabled={!integration}
          >
            <IconTrash />
          </ActionIconCommon>
        </div>
        {integration && (
          <div className="flex flex-col gap-2">
            <Input readOnly value={PETPOOJA_WEBHOOK_ENDPOINT} />
            <ApiCopyButton value={PETPOOJA_WEBHOOK_ENDPOINT} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WaTemplateSendSettings({ integration, updateIntegration }) {
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

  const handleSave = form.handleSubmit((values) => {
    toast.loading("Updating settings", {
      id: "integration-update",
    });
    updateIntegration.mutate({
      credential: {
        ...integration.credential,
        orderEvent: values,
      },
    });
  });

  useEffect(() => {
    if (integration?.credential?.orderEvent) form.reset({ ...integration?.credential?.orderEvent });
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
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h4 className="text-lg font-semibold">WhatsApp Template Config to Send on Order</h4>
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
            <div>
              <Label>{translations("Time Delay (in minutes)")}</Label>
              <Input {...field} type="number" />
              {fieldState.error?.message && (
                <p className="text-sm text-red-500">{fieldState.error?.message}</p>
              )}
            </div>
          )}
        />
        <div className="flex items-center justify-between">
          <Button onClick={handleSave} disabled={!integration}>
            save
          </Button>
          <ActionIconCommon
            handleClick={handleDelete}
            label="Delete Settings"
            disabled={!integration}
          >
            <IconTrash />
          </ActionIconCommon>
        </div>
      </CardContent>
    </Card>
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
    <div className="flex flex-col gap-4">
      <DataTable columns={columns} data={rows} />
    </div>
  );
}
