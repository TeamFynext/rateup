import { Box, Button, Center, Group, Loader, Stack } from "@mantine/core";
import styles from "./landingPageDashboardPage.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateLandingPageModal from "./CreateLandingPageModal";
import { useDisclosure } from "@mantine/hooks";
import NothingFound from "../NothingFound/NothingFound";
import { useLandingPages } from "../../backend/landingPage/landingPage.query";
import LandingPageCardsList from "./LandingPageCardsList";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import { useQueryClient } from "@tanstack/react-query";
import RefreshButton from "../Button/RefreshButton";
import { docsPath } from "../../utils/constants";
import InfoButton from "../Button/InfoButton";

function LandingPageDashboard() {
  const router = useRouter();
  const { action } = router.query;
  const [isCreateLandingPageModalOpen, createLandingPageModalHandlers] =
    useDisclosure();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useLandingPages();
  const [landingPages, setLandingPages] = useState([]);
  const [sortOption, setSortOption] = useState("");

  useEffect(() => {
    if (data) {
      setLandingPages(data);
    }
  }, [data]);

  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const sortedLandingPages = sortData(
    landingPages.map((s) => ({ ...s, data: { name: s.name } })),
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
  } else if (!isPending && !isError && !landingPages.length) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <NothingFound text="No Landing Pages Found." />;
      </Center>
    );
  } else {
    componentToBeRendered = (
      <LandingPageCardsList landingPages={sortedLandingPages} />
    );
  }

  return (
    <Stack className={`${styles["landingPage-dashboard-page-div"]}`}>
      <Group justify="space-between">
        <Group
          className={styles["heading-and-create-landingPage-btn-container"]}
        >
          <h1>Landing Pages</h1>
          <InfoButton docUrl={`${docsPath}/landingpage`} />
          <RefreshButton queryKeys={["landingPages"]} />
          <Button
            className={styles["create-landingPage-btn"]}
            rightSection={<IconPlus />}
            onClick={createLandingPageModalHandlers.open}
          >
            Create Landing Page
          </Button>
        </Group>
        <SortDropdown
          onSortChange={handleSortChange}
          defaultSortOption={sortOption}
        />
      </Group>
      <Box className={`${styles["landingPage-list-container"]}`}>
        {componentToBeRendered}
      </Box>
      {isCreateLandingPageModalOpen && (
        <CreateLandingPageModal
          opened={isCreateLandingPageModalOpen}
          onClose={createLandingPageModalHandlers.close}
          mode="create"
          shortUrlId={""}
          initialName={""}
        />
      )}
    </Stack>
  );
}

export default LandingPageDashboard;
