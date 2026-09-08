import { IconPencil } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { EventTrigger } from "@/backend/loyalty/eventTriggers.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import type { LoyaltyEventDefinition } from "./loyaltyEventCatalog.ts";

interface EventTriggerRowProps {
  definition: LoyaltyEventDefinition;
  trigger: EventTrigger | undefined;
  templates: WaTemplateListEntry[];
  isSaving: boolean;
  onToggle: (enabled: boolean) => void;
  onTemplateChange: (waTemplateId: string | null) => void;
  onCreateFromExample: () => void;
  /** Extra controls under the template picker — reminder days, the birthday gift. */
  extra?: React.ReactNode;
}

/**
 * One message: the event, whether it is on, which Meta template it sends and where that
 * template stands with Meta — instead of a separate catalogue of templates.
 */
export function EventTriggerRow({
  definition,
  trigger,
  templates,
  isSaving,
  onToggle,
  onTemplateChange,
  onCreateFromExample,
  extra,
}: Readonly<EventTriggerRowProps>) {
  const { t } = useTranslation();
  const template = templates.find((entry) => entry.id === trigger?.waTemplateId);
  const body = template?.data?.components?.find((c) => String(c.type).toUpperCase() === "BODY");
  const bodyText = body && "text" in body ? (body as { text?: string }).text : undefined;
  const enabled = Boolean(trigger?.enabled);
  const items = templates.map((entry) => ({
    value: entry.id,
    label: entry.data?.name ?? entry.id,
  }));

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{definition.label}</p>
              <TemplateStatusBadge
                status={template?.data?.status}
                hasTemplate={Boolean(trigger?.waTemplateId)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{definition.description}</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={isSaving}
            aria-label={definition.label}
          />
        </div>

        {bodyText ? (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground">{bodyText}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("No message yet.")}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={onCreateFromExample}
            >
              {t("Create one from an example")}
            </button>
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <p className="mb-1 text-xs text-muted-foreground">{t("Template")}</p>
            <Select
              value={trigger?.waTemplateId ?? null}
              items={items}
              onValueChange={(value) => onTemplateChange(value)}
              disabled={isSaving || items.length === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={
                    items.length === 0 ? t("No loyalty templates yet") : t("Pick a template")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {template && (
            <Button
              variant="ghost"
              size="sm"
              render={
                <Link
                  to="/dashboard/loyalty/templates/$templateId"
                  params={{ templateId: template.id }}
                />
              }
            >
              <IconPencil size={14} />
              {t("Edit template")}
            </Button>
          )}
          {extra}
        </div>
        <p className="text-[11px] text-muted-foreground">{definition.variables}</p>
      </CardContent>
    </Card>
  );
}

function TemplateStatusBadge({
  status,
  hasTemplate,
}: Readonly<{ status: string | undefined; hasTemplate: boolean }>) {
  const { t } = useTranslation();
  if (!hasTemplate) return <Badge variant="outline">{t("No template")}</Badge>;
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
          {t("Approved")}
        </Badge>
      );
    case "REJECTED":
      return <Badge variant="destructive">{t("Rejected by Meta")}</Badge>;
    case "DRAFT":
      return <Badge variant="outline">{t("Draft — not submitted")}</Badge>;
    default:
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
        >
          {t("Awaiting Meta")}
        </Badge>
      );
  }
}
