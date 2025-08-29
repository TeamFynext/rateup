"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Box, Button, Center, Group, Loader, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useGetAllGeneratedQrsQuery } from "backend/generateQr/generateQr.query";
import { useTranslations } from "next-intl";

import RefreshButton from "../Button/RefreshButton";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import CreateQrModal from "./CreateQrModal";
import GeneratedQrCardsList from "./GeneratedQrCardsList";
import styles from "./GenerateQr.module.css";

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
  const translations = useTranslations();
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
      <Center h={"100%"} w={"100%"}>
        <Loader type="bars" />
      </Center>
    );
  } else if (isError) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <p>{translations("Unable to get data, please try again later")}</p>
      </Center>
    );
  } else if (!isPending && !isError && !generatedQrs.length) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <NothingFound text={translations("No QRs Found")} />
      </Center>
    );
  } else {
    componentToBeRendered = (
      <GeneratedQrCardsList generatedQrs={sortedGeneratedQrs} />
    );
  }

  return (
    <Stack className={`${styles["generate-qr-dashboard-page-div"]}`}>
      <Group justify="space-between">
        <Group className={styles["heading-and-create-qr-btn-container"]}>
          <Button
            className={styles["create-qr-btn"]}
            rightSection={<IconPlus />}
            onClick={createQrModalHandlers.open}
          >
            {translations("Create QR")}
          </Button>
          <RefreshButton queryKeys={["generatedQrs"]} />
        </Group>
        <SortDropdown
          onSortChange={handleSortChange}
          defaultSortOption={sortOption}
        />
      </Group>
      <Box className={`${styles["generated-qrs-list-container"]}`}>
        {componentToBeRendered}
      </Box>
      {isCreateQrModalOpen && (
        <CreateQrModal
          opened={isCreateQrModalOpen}
          onClose={createQrModalHandlers.close}
          mode="create"
          shortUrlId={""}
          initialName={""}
        />
      )}
    </Stack>
  );
}

export default GenerateQr;
