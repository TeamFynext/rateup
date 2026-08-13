import { zodResolver } from "@hookform/resolvers/zod";
import { IconGlobe, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { CrawlStatus, KnowledgeWebsite } from "@/backend/metaAgent/metaAgent.api";
import {
  useCreateWebsite,
  useDeleteWebsite,
  useSyncWebsites,
  useUpdateWebsite,
  useWebsites,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

import { websiteFormSchema, type WebsiteFormValues } from "../../metaAgent.schemas";
import { FormField } from "../shared/FormField";
import { PanelCard } from "../shared/PanelCard";

const STATUS_VARIANT: Record<CrawlStatus, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  in_progress: "secondary",
  pending: "outline",
  failed: "destructive",
};

const STATUS_LABEL: Record<CrawlStatus, string> = {
  completed: "Crawled",
  in_progress: "Crawling",
  pending: "Queued",
  failed: "Failed",
};

export function WebsitesPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: websites, isLoading } = useWebsites(waSettingsId);
  const createWebsite = useCreateWebsite(waSettingsId);
  const deleteWebsite = useDeleteWebsite(waSettingsId);
  const sync = useSyncWebsites(waSettingsId);
  const [editing, setEditing] = useState<KnowledgeWebsite | null>(null);

  const form = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: { url: "" },
  });

  const onSubmit = (values: WebsiteFormValues) =>
    createWebsite.mutate(values.url, { onSuccess: () => form.reset() });

  return (
    <PanelCard
      title="Websites"
      description="Meta crawls these pages and indexes them for the agent. Sync to refresh crawl status."
      count={websites?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="mb-4">
        <FieldGroup>
          <FormField
            control={form.control}
            name="url"
            label="Page URL"
            required
            description="Must be a public https page — Meta's crawler does not sign in."
          >
            {(field, controlProps) => (
              <div className="flex flex-wrap items-start gap-2">
                <Input
                  {...field}
                  {...controlProps}
                  placeholder="https://example.com/faq"
                  className="min-w-0 flex-1"
                />
                <Button type="submit" variant="outline" disabled={createWebsite.isPending}>
                  <IconPlus data-icon="inline-start" />
                  Add
                </Button>
              </div>
            )}
          </FormField>
        </FieldGroup>
      </form>

      {isLoading && <Skeleton className="h-10 w-full" />}

      {!isLoading && !websites?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No websites added</EmptyTitle>
          <EmptyDescription>
            Point Meta at your FAQ, shipping or pricing pages and it will keep them indexed.
          </EmptyDescription>
        </Empty>
      )}

      <div className="divide-y">
        {websites?.map((site) => {
          const status = site.crawlStatus ?? "pending";
          return (
            <div key={site.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <IconGlobe className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{site.url}</span>
                <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                {!!site.pagesCrawled && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {site.pagesCrawled} pages
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${site.url}`}
                  onClick={() => setEditing(site)}
                >
                  <IconPencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${site.url}`}
                  disabled={deleteWebsite.isPending}
                  onClick={() => deleteWebsite.mutate(site.id)}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <EditWebsiteDialog
        waSettingsId={waSettingsId}
        website={editing}
        onClose={() => setEditing(null)}
      />
    </PanelCard>
  );
}

function EditWebsiteDialog({
  waSettingsId,
  website,
  onClose,
}: Readonly<{ waSettingsId: string; website: KnowledgeWebsite | null; onClose: () => void }>) {
  const updateWebsite = useUpdateWebsite(waSettingsId);
  const form = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteFormSchema),
    values: { url: website?.url ?? "" },
  });

  return (
    <Dialog open={!!website} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit website</DialogTitle>
          <DialogDescription>
            Changing the URL restarts the crawl, so the page count resets until Meta finishes.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (!website) return;
            updateWebsite.mutate(
              { websiteId: website.id, url: values.url },
              { onSuccess: onClose },
            );
          })}
        >
          <FieldGroup className="gap-4">
            <FormField control={form.control} name="url" label="Page URL" required>
              {(field, controlProps) => <Input {...field} {...controlProps} />}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateWebsite.isPending}>
                {updateWebsite.isPending && <Spinner data-icon="inline-start" />}
                Save changes
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
