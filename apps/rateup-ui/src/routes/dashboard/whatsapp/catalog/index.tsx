import { IconRefresh } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  useAllWaCatalogs,
  useSyncCatalogs,
  useSyncConnectedCatalog,
} from "@/backend/whatsapp/catalog/catalog.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
} from "@/components/common/list-page-layout.tsx";
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

  const isEmpty = !isPending && !isError && (catalogs ?? []).length === 0;

  return (
    <ListPage>
      <ListPageHeader>
        <ListPageHeaderSection className="gap-3">
          <RefreshButton queryKeys={["allWaCatalog"]} />
        </ListPageHeaderSection>

        <ListPageHeaderSection>
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
        </ListPageHeaderSection>
      </ListPageHeader>

      <ListPageContent
        isLoading={isPending}
        isError={isError}
        isEmpty={isEmpty}
        emptyTitle="No catalogs found"
        emptyDescription="Sync your Meta catalogs to get started."
        onRetry={refetch}
      >
        <CardGrid
          items={catalogs ?? []}
          getKey={(catalog) => catalog.catalogId}
          renderItem={(catalog) => (
            <ActionCard
              title={catalog.name}
              subtitle={`ID: ${catalog.catalogId}`}
              onClick={() =>
                navigate({
                  to: `/dashboard/whatsapp/catalog/${catalog.catalogId}`,
                })
              }
              content={<></>}
              footer={
                <div className="flex gap-2">
                  {catalog.connectedWaPhoneIds && catalog.connectedWaPhoneIds.length > 0 ? (
                    <Badge variant="default" className="text-xs">
                      Linked to WhatsApp
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Not Linked
                    </Badge>
                  )}
                  {catalog.vertical && (
                    <Badge variant="outline" className="text-xs">
                      {catalog.vertical}
                    </Badge>
                  )}
                </div>
              }
            />
          )}
        />
      </ListPageContent>
    </ListPage>
  );
}
