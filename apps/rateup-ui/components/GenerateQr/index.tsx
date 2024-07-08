import { Box, Button, Center, Group, Loader, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useGetAllGeneratedQrsQuery } from "backend/generateQr/generateQr.query";
import { useState } from "react";
import RefreshButton from "../Button/RefreshButton";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import CreateQrModal from "./CreateQrModal";
import styles from "./GenerateQr.module.css";
import GeneratedQrCardsList from "./GeneratedQrCardsList";

function GenerateQr() {
  const [isCreateQrModalOpen, createQrModalHandlers] = useDisclosure();
  const {
    data: generatedQrs,
    isPending,
    isError,
  } = useGetAllGeneratedQrsQuery();

  const [sortOption, setSortOption] = useState("latest");

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
          shortUrlId={""}
          initialName={""}
        />
      )}
    </Stack>
  );
}

export default GenerateQr;
