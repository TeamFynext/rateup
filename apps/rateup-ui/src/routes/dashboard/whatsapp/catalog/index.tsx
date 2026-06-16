"use client";

import { IconRefresh } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  useAllWaCatalogs,
  useSyncCatalogs,
  useSyncConnectedCatalog,
} from "@/backend/whatsapp/catalog/catalog.query";
import {
  GenericActionCard,
  GenericCardGrid,
} from "@/components/common/generic-card.tsx";
import { ListPageLayout } from "@/components/common/list-page-layout.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/catalog/")({
  component: Catalog,
});

function Catalog() {
  const { data: catalogs, isPending, isError, refetch } = useAllWaCatalogs();
  const sync = useSyncCatalogs();
  const syncConnected = useSyncConnectedCatalog();
  const navigate = useNavigate();

  const syncButton = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => syncConnected.mutate()}
        disabled={syncConnected.isPending || isPending}
      >
        <IconRefresh size={16} className="mr-2" />
        Sync Connected
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => sync.mutate()}
        disabled={sync.isPending || isPending}
      >
        <IconRefresh size={16} className="mr-2" />
        Sync Catalogs
      </Button>
    </div>
  );

  return (
    <ListPageLayout
      hideCreate
      canCreate={false}
      docsUrl="whatsapp/catalogs"
      isLoading={isPending}
      queryKeys={["allWaCatalog"]}
      isError={isError}
      onRetry={refetch}
      isEmpty={!isPending && !isError && (catalogs ?? []).length === 0}
      emptyTitle="No catalogs found"
      emptyDescription="Sync your Meta catalogs to get started."
      rightControls={syncButton}
    >
      <GenericCardGrid
        items={catalogs ?? []}
        getKey={(catalog) => catalog.catalogId}
        renderItem={(catalog) => (
          <GenericActionCard
            title={catalog.name}
            titleTooltip={catalog.name}
            subtitle={`ID: ${catalog.catalogId}`}
            onClick={() =>
              navigate({
                to: `/dashboard/whatsapp/catalog/${catalog.catalogId}`,
              })
            }
            footerLeft={
              catalog.connectedWaPhoneIds &&
              catalog.connectedWaPhoneIds.length > 0 ? (
                <Badge variant="default" className="text-xs">
                  Linked to WhatsApp
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Not Linked
                </Badge>
              )
            }
            footerRight={
              catalog.vertical ? (
                <Badge variant="outline" className="text-xs">
                  {catalog.vertical}
                </Badge>
              ) : undefined
            }
          />
        )}
      />
    </ListPageLayout>
  );
}
