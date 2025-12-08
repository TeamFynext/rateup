"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, RefreshCw, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { useLandingPages } from "../../backend/landingPage/landingPage.query";
import LCard from "../Card/CardALandLP";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader } from "../ui/loader";
import LPTourSteps from "../WelcomeTour/components/LPTourSteps";
import CreateLandingPageModal from "./CreateLandingPageModal";
import MoreOptionsMenu from "./LandingPageCard/MoreOptionsMenu";
import styles from "./landingPageDashboardPage.module.css";

function LandingPageDashboard() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const baseURL = "/dashboard/landingPages";
  const shareUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/lp`;

  const [isCreateLandingPageModalOpen, createLandingPageModalHandlers] =
    useDisclosure(action === "create");
  const { data, isPending, isError } = useLandingPages();
  const queryClient = useQueryClient();

  const [landingPages, setLandingPages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const translations = useTranslations();
  const tourSteps = LPTourSteps({ styles });

  useEffect(() => {
    if (data) {
      setLandingPages(data);
    }
  }, [data]);

  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const searchedLandingPage = landingPages.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedLandingPages = sortData(
    searchedLandingPage.map((s) => ({ ...s, data: { name: s.name } })),
    sortOption,
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["landingPages"] });
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
  } else if (!isPending && !isError && !landingPages.length) {
    componentToBeRendered = (
      <div className="flex w-full h-screen items-center justify-center">
        <NothingFound text={translations("No Landing Pages Found")} />;
      </div>
    );
  } else {
    componentToBeRendered = (
      <LCard
        sortedValue={sortedLandingPages}
        shareURL={shareUrl}
        Icon={BookOpen}
        baseURL={baseURL}
        MoreOptions={MoreOptionsMenu}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* headetr */}
      <div className="border-b px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {translations("Landing Pages")}
            </h1>
            <p className="text-sm text-gray-600">
              {translations("Create and manage your landing pages")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="h-9 w-9"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
          <Button
            onClick={createLandingPageModalHandlers.open}
            className="bg-primary h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            {translations("New Landing Page")}
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={translations("Search landing pages")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <SortDropdown
              onSortChange={handleSortChange}
              defaultSortOption={sortOption}
            />
          </div>
        </div>
      </div>

      <div>{componentToBeRendered}</div>
      {isCreateLandingPageModalOpen && (
        <CreateLandingPageModal
          opened={isCreateLandingPageModalOpen}
          onClose={createLandingPageModalHandlers.close}
          mode="create"
          shortUrlId={""}
          initialName={""}
        />
      )}
    </div>
  );
}

export default LandingPageDashboard;
