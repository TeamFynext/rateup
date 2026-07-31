// Extracted verbatim from the `/dashboard/qrCreator/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetAllGeneratedQrsQuery } from "@/backend/generateQr/generateQr.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import CreateQrModal from "@/components/GenerateQr/CreateQrModal";
import GeneratedQrCard from "@/components/GenerateQr/GeneratedQrCard";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface QrListEntry {
  readonly id: string;
  readonly name: string;
  readonly shortUrlId: string;
  readonly createdAt: string | Date;
  readonly noOfScans: number;
}
export function GenerateQr() {
  const [isCreateQrModalOpen, setIsCreateQrModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");

  const searchParams = useSearch({ strict: false });
  const action = searchParams.action;
  const debouncedSearch = useDebounce(search.trim(), 200);
  const { t: translations } = useTranslation();

  const { data: generatedQrs = [], isPending, isError, refetch } = useGetAllGeneratedQrsQuery();

  const qrInfos = useMemo(() => {
    return generatedQrs.map((qr: QrListEntry) => ({
      id: qr.id,
      name: qr.name,
      shortUrlId: qr.shortUrlId,
      createdAt: qr.createdAt,
      noOfScans: qr.noOfScans,
    })) as QrListEntry[];
  }, [generatedQrs]);

  const filteredQrs = useMemo(() => {
    const searchValue = debouncedSearch.toLowerCase();

    const filtered = qrInfos.filter((qr) => {
      return !searchValue || qr.name.toLowerCase().includes(searchValue);
    });

    return sortData(filtered, sortOption) as QrListEntry[];
  }, [qrInfos, debouncedSearch, sortOption]);

  const handleCreateQr = () => {
    setIsCreateQrModalOpen(true);
  };

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={handleCreateQr}>
              <Plus className="w-4 h-4 mr-2" />
              {translations("Create QR Code")}
            </Button>
            <RefreshButton queryKeys={["qrs"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search QR codes...")}
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isPending}
          isError={Boolean(isError)}
          isEmpty={!isPending && !isError && filteredQrs.length === 0}
          emptyTitle={translations("No QR codes found")}
          emptyDescription={translations("Create a new QR code to get started.")}
          onRetry={() => {
            void refetch();
          }}
        >
          <CardGrid
            items={filteredQrs}
            getKey={(qr) => qr.id}
            renderItem={(generatedQr) => (
              <GeneratedQrCard
                key={generatedQr.id}
                id={generatedQr.id}
                shortUrlId={generatedQr.shortUrlId}
                createdAt={generatedQr.createdAt}
                scans={generatedQr.noOfScans}
                name={generatedQr.name}
              />
            )}
          />
        </ListPageContent>
      </ListPage>

      <Dialog
        open={isCreateQrModalOpen || action === "create"}
        onOpenChange={(open) => {
          setIsCreateQrModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="hidden">
            <DialogTitle>{translations("Create QR Code")}</DialogTitle>
            <DialogDescription>{translations("Create a new QR code")}</DialogDescription>
          </DialogHeader>

          <CreateQrModal
            opened={isCreateQrModalOpen || action === "create"}
            onClose={() => setIsCreateQrModalOpen(false)}
            mode="create"
            shortUrlId={""}
            initialName={""}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
