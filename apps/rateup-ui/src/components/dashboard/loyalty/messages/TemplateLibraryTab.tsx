import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEventTriggers } from "@/backend/loyalty/eventTriggers.query";
import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useLoyaltyCommands } from "@/backend/loyalty/settings/settings.query";
import { useDeleteWaTemplateMutation, useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { ListPageContent, ListPageSearchInput } from "@/components/common/list-page-layout.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { TemplateType } from "@/types/enums.ts";

import { loyaltyMessageCatalog } from "./loyaltyMessageCatalog.ts";
import { LoyaltyTemplateStatusBadge, templateStatusTone } from "./LoyaltyTemplateStatusBadge.tsx";
import { NewTemplateDialog } from "./NewTemplateDialog.tsx";
import { usageOf } from "./templateUsage.ts";

type StatusFilter = "all" | "live" | "pending" | "rejected" | "draft";

/**
 * The programme's Meta templates — every one, with where it stands and what uses it. The
 * Automatic and Replies tabs are where a message is written; this is where the set behind
 * them is browsed, chased and tidied.
 */
export function TemplateLibraryTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: program } = useLoyaltyProgram();
  const { data: templates, isPending, isError, refetch } = useWaTemplates(TemplateType.LOYALTY);
  const { data: triggers = [] } = useEventTriggers(program?.id ?? "");
  const { data: commands = [] } = useLoyaltyCommands();
  const remove = useDeleteWaTemplateMutation();
  const catalog = useMemo(() => loyaltyMessageCatalog(t), [t]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);

  const statusItems: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: t("All statuses") },
    { value: "live", label: t("Approved") },
    { value: "pending", label: t("Awaiting Meta") },
    { value: "rejected", label: t("Rejected") },
    { value: "draft", label: t("Draft") },
  ];

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (templates ?? [])
      .filter((entry) => {
        const tone = templateStatusTone({ status: entry.data?.status, hasTemplate: true });
        if (status !== "all" && tone !== status) return false;
        return !needle || (entry.data?.name ?? "").toLowerCase().includes(needle);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((entry) => ({ entry, usage: usageOf(entry.id, triggers, commands, catalog) }));
  }, [templates, search, status, triggers, commands, catalog]);

  const refreshCounts = () =>
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.onboardingState() });

  const onDelete = async (name: string, id: string) => {
    const ok = await confirm({
      title: t("Delete “{name}”?", { name }),
      description: t("It is removed from WhatsApp too. Nothing uses it, so nothing goes quiet."),
      confirmText: t("Delete"),
    });
    if (ok) remove.mutate(id, { onSuccess: refreshCounts });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListPageSearchInput
          placeholder={t("Search templates…")}
          value={search}
          onChange={setSearch}
        />
        <Select
          value={status}
          items={statusItems}
          onValueChange={(value) => {
            const next = statusItems.find((item) => item.value === value);
            setStatus(next?.value ?? "all");
          }}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <SyncTemplatesButton label={t("Sync with Meta")} onSynced={refreshCounts} />
          <Button onClick={() => setCreating(true)}>
            <IconPlus size={16} />
            {t("New template")}
          </Button>
        </div>
      </div>

      <ListPageContent
        isLoading={isPending}
        isError={isError}
        isEmpty={!isPending && !isError && rows.length === 0}
        emptyTitle={
          (templates ?? []).length === 0 ? t("No loyalty templates yet") : t("No templates match")
        }
        emptyDescription={
          (templates ?? []).length === 0
            ? t("Write a message on the Automatic tab, or create one from a starter here.")
            : t("Try another search or status.")
        }
        onRetry={refetch}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Template")}</TableHead>
                <TableHead>{t("Account")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Used by")}</TableHead>
                <TableHead>{t("Created")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ entry, usage }) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <p className="font-mono text-xs text-foreground">{entry.data?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.data?.language?.toUpperCase()}
                      {entry.data?.category ? ` · ${entry.data.category}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.WhatsappSettings?.phoneDisplayName ??
                      entry.whatsappSettingsPhoneId ??
                      t("No account")}
                  </TableCell>
                  <TableCell>
                    <LoyaltyTemplateStatusBadge
                      status={entry.data?.status}
                      pendingSince={entry.createdAt}
                    />
                  </TableCell>
                  <TableCell>
                    {usage.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{t("Not used")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {usage.map((use) => (
                          <Badge
                            key={`${use.kind}-${use.label}`}
                            variant="secondary"
                            className={use.kind === "keyword" ? "font-mono" : undefined}
                          >
                            {use.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {dayjs(entry.createdAt).format("D MMM YYYY")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("Edit")}
                        render={
                          <Link
                            to="/dashboard/loyalty/templates/$templateId"
                            params={{ templateId: entry.id }}
                          />
                        }
                      >
                        <IconPencil size={16} />
                      </Button>
                      {usage.length === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("Delete")}
                          loading={remove.isPending}
                          onClick={() => void onDelete(entry.data?.name ?? entry.id, entry.id)}
                        >
                          <IconTrash size={16} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListPageContent>

      <NewTemplateDialog open={creating} starter={null} onClose={() => setCreating(false)} />
    </div>
  );
}
