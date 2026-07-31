import { IconGlobe, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import {
  useCreateWebsite,
  useDeleteWebsite,
  useSyncWebsites,
  useWebsites,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  completed: "default",
  in_progress: "secondary",
  pending: "secondary",
  failed: "destructive",
};

export function WebsitesPanel({ waSettingsId }: { waSettingsId: string }) {
  const { data: websites, isLoading } = useWebsites(waSettingsId);
  const createWebsite = useCreateWebsite(waSettingsId);
  const deleteWebsite = useDeleteWebsite(waSettingsId);
  const sync = useSyncWebsites(waSettingsId);
  const [url, setUrl] = useState("");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Websites ({websites?.length ?? 0})</CardTitle>
        <Button variant="outline" size="sm" disabled={sync.isPending} onClick={() => sync.mutate()}>
          <IconRefresh data-icon="inline-start" className={sync.isPending ? "animate-spin" : ""} />
          Sync crawl status
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="website-url" className="sr-only">
              Website URL
            </FieldLabel>
            <Input
              id="website-url"
              placeholder="https://example.com/faq"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={!url || createWebsite.isPending}
              onClick={() => createWebsite.mutate(url, { onSuccess: () => setUrl("") })}
            >
              <IconPlus data-icon="inline-start" />
              Add
            </Button>
          </Field>
        </FieldGroup>

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && !websites?.length && (
          <Empty className="border-none py-8">
            <EmptyTitle>No websites added</EmptyTitle>
            <EmptyDescription>Meta will crawl added URLs for agent knowledge.</EmptyDescription>
          </Empty>
        )}

        <div className="divide-y">
          {websites?.map((site) => (
            <div key={site.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <IconGlobe className="shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{site.url}</span>
                <Badge variant={STATUS_VARIANT[site.crawlStatus ?? "pending"]}>
                  {site.crawlStatus ?? "pending"}
                </Badge>
                {!!site.pagesCrawled && (
                  <span className="text-xs text-muted-foreground">{site.pagesCrawled} pages</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                disabled={deleteWebsite.isPending}
                onClick={() => deleteWebsite.mutate(site.id)}
              >
                <IconTrash className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
