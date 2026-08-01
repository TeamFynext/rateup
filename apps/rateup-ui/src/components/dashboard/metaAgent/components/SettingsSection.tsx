import { IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import type { AgentSettings } from "@/backend/metaAgent/metaAgent.api";
import {
  useAgentSettings,
  useSyncAgentSettings,
  useUpdateAgentSettings,
} from "@/backend/metaAgent/metaAgent.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { formatSyncedAt } from "../utils/formatSyncedAt";

const FOLLOWUP_INTERVALS = [
  { label: "Off", value: 0 },
  { label: "5 minutes", value: 300 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "2 hours", value: 7200 },
  { label: "8 hours", value: 28800 },
  { label: "24 hours", value: 86400 },
];

export function SettingsSection({ waSettingsId }: { waSettingsId: string }) {
  const { data, isLoading } = useAgentSettings(waSettingsId);
  const update = useUpdateAgentSettings(waSettingsId);
  const sync = useSyncAgentSettings(waSettingsId);

  const [form, setForm] = useState<AgentSettings>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Rollout & behavior</CardTitle>
          <p className="text-xs text-muted-foreground">{formatSyncedAt(data?.settingsSyncedAt)}</p>
        </div>
        <Button variant="outline" size="sm" disabled={sync.isPending} onClick={() => sync.mutate()}>
          <IconRefresh data-icon="inline-start" className={sync.isPending ? "animate-spin" : ""} />
          Sync from Meta
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!isLoading && (
          <>
            <SettingRow
              title="Rollout enabled"
              description="Turn the AI agent on or off for this WhatsApp number."
            >
              <Switch
                checked={!!form.rollout?.enabled}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, rollout: { ...f.rollout, enabled: checked } }))
                }
              />
            </SettingRow>

            <SettingRow
              title="Human handoff"
              description="Message shown when handing off to a human."
            >
              <div className="flex w-full max-w-sm items-center gap-3">
                <Switch
                  checked={!!form.handoff?.enabled}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, handoff: { ...f.handoff, enabled: checked } }))
                  }
                />
                <Input
                  placeholder="Handoff message"
                  value={form.handoff?.message ?? ""}
                  disabled={!form.handoff?.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, handoff: { ...f.handoff, message: e.target.value } }))
                  }
                />
              </div>
            </SettingRow>

            <SettingRow
              title="Follow-up messages"
              description="Nudge the consumer if they go quiet after this interval."
            >
              <div className="flex w-full max-w-sm flex-wrap items-center gap-2">
                <Switch
                  checked={!!form.followup?.enabled}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, followup: { ...f.followup, enabled: checked } }))
                  }
                />
                <Select
                  value={String(form.followup?.followup_interval_in_seconds ?? 0)}
                  disabled={!form.followup?.enabled}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      followup: { ...f.followup, followup_interval_in_seconds: Number(value) },
                    }))
                  }
                  items={FOLLOWUP_INTERVALS.map((opt) => ({
                    value: String(opt.value),
                    label: opt.label,
                  }))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_INTERVALS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Follow-up message"
                  disabled={!form.followup?.enabled}
                  value={form.followup?.message ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, followup: { ...f.followup, message: e.target.value } }))
                  }
                />
              </div>
            </SettingRow>

            <SettingRow
              title="AI audience"
              description="Restrict responses to allowlisted numbers only (WhatsApp only)."
            >
              <Select
                value={form.ai_audience ?? "EVERYONE"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, ai_audience: value as AgentSettings["ai_audience"] }))
                }
                items={[
                  { value: "EVERYONE", label: "Everyone" },
                  { value: "ALLOWLISTED_ONLY", label: "Allowlisted numbers only" },
                ]}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVERYONE">Everyone</SelectItem>
                  <SelectItem value="ALLOWLISTED_ONLY">Allowlisted numbers only</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <div className="flex justify-end border-t pt-4">
              <Button
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({
                    rollout: form.rollout,
                    handoff: form.handoff,
                    followup: form.followup,
                    ai_audience: form.ai_audience,
                  })
                }
              >
                Save & push to Meta
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
      <div>
        <FieldTitle className="text-sm">{title}</FieldTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
