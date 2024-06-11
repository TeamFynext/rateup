import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Tooltip,
} from "@mantine/core";
import styles from "./landingPageDashboardPage.module.css";
import {
  IconCheck,
  IconPlus,
  IconRefresh,
  IconSelector,
} from "@tabler/icons-react";
import CreateLandingPageModal from "./CreateLandingPageModal";
import { useDisclosure } from "@mantine/hooks";
import NothingFound from "../NothingFound/NothingFound";
import { useLandingPages } from "../../backend/landingPage/landingPage.query";
import LandingPageCardsList from "./LandingPageCardsList";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getLandingPages } from "../../backend/landingPage/landingPage.api";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { notifications } from "@mantine/notifications";
import SortDropdown from "../Dashboard/SortDropDown";

function LandingPageDashboard() {
  const router = useRouter();
  const { action } = router.query;
  const [isCreateLandingPageModalOpen, createLandingPageModalHandlers] =
    useDisclosure();

  const { data, isPending, isError } = useLandingPages();
  const [landingPages, setLandingPages] = useState([]);
  const [sortOption, setSortOption] = useState("");

  const fetchLandingPages = useCallback(async () => {
    const data = await getLandingPages();
    setLandingPages(data);
  }, []);

  useEffect(() => {
    fetchLandingPages();
  }, [fetchLandingPages]);

  const handleRefresh = async () => {
    notifications.show({
      color: "teal",
      title: "Data Refreshed",
      message: "Landing Page Updated Successfully",
      autoClose: 1000,
      loading: false,
      icon: <IconCheck />,
    });
    await fetchLandingPages();
  };

  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const sortedLandingPages = [...landingPages].sort((a, b) => {
    switch (sortOption) {
      case "latest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "a-z":
        return a.name.localeCompare(b.name);
      case "z-a":
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

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
    componentToBeRendered = <NothingFound text="No Landing Pages Found." />;
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
          <Button
            className={styles["create-landingPage-btn"]}
            rightSection={<IconPlus />}
            onClick={createLandingPageModalHandlers.open}
          >
            Create Landing Page
          </Button>
          <Tooltip label="Refresh data">
            <ActionIcon
              variant="light"
              aria-label="Refresh"
              onClick={handleRefresh}
            >
              <IconRefresh
                style={{ width: "90%", height: "90%" }}
                stroke={1.5}
              />
            </ActionIcon>
          </Tooltip>
        </Group>
        <SortDropdown onSortChange={handleSortChange} />
      </Group>
      <Box className={styles["landingPage-list-container"]}>
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
