"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDisclosure } from "@mantine/hooks";
import { Plus, RefreshCw } from "lucide-react";
import { useExtracted } from "next-intl";

import { useGetAllGeneratedQrsQuery } from "@/backend/generateQr/generateQr.query";

import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import { Button } from "../ui/button";
import { Loader } from "../ui/loader";
import CreateQrModal from "./CreateQrModal";
import GeneratedQrCardsList from "./GeneratedQrCardsList";

function GenerateQr() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const [isCreateQrModalOpen, createQrModalHandlers] = useDisclosure(
    action === "create",
  );
  const {
    data: generatedQrs,
    isPending,
    isError,
  } = useGetAllGeneratedQrsQuery();

  const [sortOption, setSortOption] = useState("latest");
  const translations = useExtracted();
  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const sortedGeneratedQrs = sortData(
    generatedQrs?.map((s) => ({ ...s, data: { name: s.name } })),
    sortOption,
  );

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
        <p>{translations("Unable to get data, please try again later.")}</p>
      </div>
    );
  } else if (!isPending && !isError && !generatedQrs.length) {
    componentToBeRendered = (
      <div className="flex w-full h-screen items-center justify-center">
        <NothingFound text={translations("No QRs Found.")} />
      </div>
    );
  } else {
    componentToBeRendered = (
      <GeneratedQrCardsList generatedQrs={sortedGeneratedQrs} />
    );
  }
  return (
    <div className="flex p-4 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-2xl">{translations("QR Studio")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {translations("Create, manage and track your QR codes")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SortDropdown
            onSortChange={handleSortChange}
            defaultSortOption={sortOption}
          />
          <Button
            className="flex items-center gap-2 px-6 shadow-sm bg-primary"
            onClick={createQrModalHandlers.open}
          >
            <Plus className="w-4 h-4" />
            {translations("Create QR Code")}
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div>{componentToBeRendered}</div>
      <div>
        {isCreateQrModalOpen && (
          <CreateQrModal
            opened={isCreateQrModalOpen}
            onClose={createQrModalHandlers.close}
            mode="create"
            shortUrlId={""}
            initialName={""}
          />
        )}
      </div>
    </div>
  );
}
export default GenerateQr;
