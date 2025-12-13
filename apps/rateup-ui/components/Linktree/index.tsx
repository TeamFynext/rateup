"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { useLinktrees } from "../../backend/linktree/linktree.query";
import LCard from "../Card/CardALandLP";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader } from "../ui/loader";
import CreateLinktreeModal from "./CreateLinktreeModal";
import MoreOptionsMenu from "./LinktreeCard/MoreOptionsMenu";

function LinktreeDashboard() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const [isCreateLinktreeModalOpen, createLinktreeModalHandlers] =
    useDisclosure(action === "create");
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useLinktrees();
  const [linktrees, setLinktrees] = useState([]);
  const [sortOption, setSortOption] = useState("latest");
  const translations = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const shareUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/lt`;
  const baseURL = "/dashboard/quickAccessLinks";

  useEffect(() => {
    if (data) {
      setLinktrees(data);
    }
  }, [data]);

  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const searchedLinktrees = linktrees.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedLinktrees = sortData(
    searchedLinktrees.map((s) => ({ ...s, data: { name: s.name } })),
    sortOption,
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["linktrees"] });
  };

  let componentToBeRendered = null;

  if (isPending) {
    componentToBeRendered = (
      <div className="flex w-full h-screen items-center justify-center">
        <Loader />
      </div>
    );
  } else if (isError) {
    componentToBeRendered = (
      <div className="flex w-full h-screen items-center justify-center">
        <p>{translations("Unable to get data, please try again later")}</p>
      </div>
    );
  } else if (!isPending && !isError && !linktrees.length) {
    componentToBeRendered = (
      <div className="flex w-full h-screen items-center justify-center">
        <NothingFound text={translations("No Landing Pages Found")} />;
      </div>
    );
  } else {
    componentToBeRendered = (
      <LCard
        sortedValue={sortedLinktrees}
        shareURL={shareUrl}
        baseURL={baseURL}
        MoreOptions={MoreOptionsMenu}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="border-b px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {translations("Access Links")}
            </h1>
            <p className="text-sm text-gray-600">
              {translations(
                "Create and manage quick access links for surveys, landing pages, and QR codes",
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="h-9 w-9"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
          <Button
            className="flex-none bg-primary"
            onClick={createLinktreeModalHandlers.open}
          >
            <Plus className="w-4 h-4 mr-2" />
            {translations("Create Access Link")}
          </Button>

          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              placeholder={translations("Search access links")}
              className="w-full pl-10 h-10 border rounded-md min-w-0"
            />
          </div>

          <div className="flex-none">
            <SortDropdown
              onSortChange={handleSortChange}
              defaultSortOption={sortOption}
            />
          </div>
        </div>
      </div>
      <div>{componentToBeRendered}</div>
      {isCreateLinktreeModalOpen && (
        <CreateLinktreeModal
          opened={isCreateLinktreeModalOpen}
          onClose={createLinktreeModalHandlers.close}
          mode="create"
          shortUrlId={""}
          initialName={""}
        />
      )}
    </div>
  );
}

export default LinktreeDashboard;
