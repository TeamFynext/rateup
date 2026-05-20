"use client";

import { useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { useSearch } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGetAllGeneratedQrsQuery } from "@/backend/generateQr/generateQr.query";

import SortDropdown, { sortData } from "../dashboard/SortDropDown.tsx";
import NothingFound from "../NothingFound/NothingFound.tsx";
import { Button } from "../ui/button.tsx";
import { Loader } from "../ui/loader.tsx";
import CreateQrModal from "./CreateQrModal/index.tsx";
import GeneratedQrCardsList from "./GeneratedQrCardsList/index.tsx";

function GenerateQr() {
  const searchParams = useSearch({ strict: false });
  const action = searchParams.action;

  const [isCreateQrModalOpen, createQrModalHandlers] = useDisclosure(
    action === "create",
  );
  const {
    data: generatedQrs,
    isPending,
    isError,
  } = useGetAllGeneratedQrsQuery();

  const [sortOption, setSortOption] = useState("latest");
  const { t: translations } = useTranslation();
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
