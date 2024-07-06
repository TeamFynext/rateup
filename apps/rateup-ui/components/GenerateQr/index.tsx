import { Box, Button, Center, Group, Loader, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import RefreshButton from "../Button/RefreshButton";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import CreateQrModal from "./CreateQrModal";
import styles from "./GenerateQr.module.css";
import GeneratedQrCardsList from "./GeneratedQrCardsList";

import { data as tempdata } from "./tempdata";
import { useGetAllGeneratedQrsQuery } from "backend/generateQr/generateQr.query";

function GenerateQr() {
  const router = useRouter();

  const [isCreateQrModalOpen, createQrModalHandlers] = useDisclosure();
  const queryClient = useQueryClient();

  const {
    data: generatedQrs,
    isPending,
    isError,
  } = useGetAllGeneratedQrsQuery();
  // const [generatedQrs, setLandingPages] = useState([]);

  console.log(generatedQrs, "Generate Qrssssssss");

  // const {
  //   data: generatedQrs,
  //   isPending,
  //   isError,
  // } = { data: tempdata, isPending: false, isError: false };

  const [sortOption, setSortOption] = useState("latest-first");

  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const sortedGeneratedQrs = sortData(
    generatedQrs?.map((s) => ({ ...s, data: { name: s.name } })),
    sortOption,
  );

  console.log(sortedGeneratedQrs, "Sorted Generated Qrs");

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
        <p>Unable to get data, please try again later.</p>
      </Center>
    );
  } else if (!isPending && !isError && !generatedQrs.length) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <NothingFound text="No Qrs Found." />
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
          <h1>Generate Qr</h1>
          <RefreshButton queryKeys={["generatedQrs"]} />
          <Button
            className={styles["create-qr-btn"]}
            rightSection={<IconPlus />}
            onClick={createQrModalHandlers.open}
          >
            Create Qr
          </Button>
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
          shortId={""}
          initialName={""}
        />
      )}
    </Stack>
  );
}

export default GenerateQr;
