import { IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { linktreeKeys } from "@/backend/campaign/campaign.keys";
import { useLinktrees } from "@/backend/linktree/linktree.query";
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
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

import CreateLinktreeModal from "./CreateLinktreeModal/index.tsx";
import LinktreeCard from "./LinktreeCard/index.tsx";

interface LinktreeListEntry {
  readonly id: string;
  readonly name: string;
  readonly shortUrlId: string;
  readonly createdAt: string | Date;
  readonly visitorsCount: number;
  readonly isPublished: boolean;
}

function LinktreeDashboard() {
  const [isCreateLinktreeModalOpen, setIsCreateLinktreeModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState("latest");
  const [search, setSearch] = useState("");

  const searchParams = useSearch({ strict: false });
  const action = searchParams.action;
  const debouncedSearch = useDebounce(search.trim(), 200);
  const { t: translations } = useTranslation();

  const queryClient = useQueryClient();
  const { data: linktrees = [], isPending, isError } = useLinktrees();
  const shareUrl = `${import.meta.env.VITE_FRONTEND_URL}/lt`;

  const linktreeInfos = useMemo(() => {
    return linktrees.map(
      (lt: {
        id: string;
        name?: string;
        shortUrlId?: string;
        createdAt?: string;
        visitorsCount?: number;
        isPublished?: boolean;
      }) => ({
        id: lt.id,
        name: lt.name,
        shortUrlId: lt.shortUrlId,
        createdAt: lt.createdAt,
        visitorsCount: lt.visitorsCount,
        isPublished: lt.isPublished,
      }),
    ) as LinktreeListEntry[];
  }, [linktrees]);

  const filteredLinktrees = useMemo(() => {
    const searchValue = debouncedSearch.toLowerCase();

    const filtered = linktreeInfos.filter((lt) => {
      return !searchValue || lt.name.toLowerCase().includes(searchValue);
    });

    return sortData(filtered, sortOption) as LinktreeListEntry[];
  }, [linktreeInfos, debouncedSearch, sortOption]);

  const handleCreateLinktree = () => {
    setIsCreateLinktreeModalOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: linktreeKeys.all() });
  };

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={handleCreateLinktree}>
              <IconPlus className="w-4 h-4 mr-2" />
              {translations("Create Access Link")}
            </Button>
            <RefreshButton queryKeys={["linktrees"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search access links...")}
              value={search}
              onChange={setSearch}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isPending}
          isError={Boolean(isError)}
          isEmpty={!isPending && !isError && filteredLinktrees.length === 0}
          emptyTitle={translations("No access links found")}
          emptyDescription={translations("Create a new access link to get started.")}
          onRetry={handleRefresh}
        >
          <CardGrid
            items={filteredLinktrees}
            getKey={(lt) => lt.id}
            renderItem={(lt) => (
              <LinktreeCard
                id={lt.id}
                name={lt.name}
                shortUrlId={lt.shortUrlId}
                createdAt={lt.createdAt}
                visitorsCount={lt.visitorsCount}
                isPublished={lt.isPublished}
                shareUrl={shareUrl}
              />
            )}
          />
        </ListPageContent>
      </ListPage>

      <Dialog
        open={isCreateLinktreeModalOpen || action === "create"}
        onOpenChange={(open) => {
          setIsCreateLinktreeModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="hidden">
            <DialogTitle>{translations("Create Access Link")}</DialogTitle>
            <DialogDescription>{translations("Create a new access link")}</DialogDescription>
          </DialogHeader>

          <CreateLinktreeModal
            opened={isCreateLinktreeModalOpen || action === "create"}
            onClose={() => setIsCreateLinktreeModalOpen(false)}
            mode="create"
            shortUrlId={""}
            initialName={""}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LinktreeDashboard;
