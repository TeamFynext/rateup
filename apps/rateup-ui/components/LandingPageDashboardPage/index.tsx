import { Box, Button, Center, Group, Loader, Stack } from "@mantine/core";
import styles from "./landingPageDashboardPage.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateLandingPageModal from "./CreateLandingPageModal";
import { useDisclosure } from "@mantine/hooks";
import NothingFound from "../NothingFound/NothingFound";
import { useLandingPages } from "../../backend/landingPage/landingPage.query";
import LandingPageCardsList from "./LandingPageCardsList";
import { useEffect } from "react";
import { useRouter } from "next/router";

function LandingPageDashboard() {
  const router = useRouter();
  const { action } = router.query;
  const [isCreateLandingPageModalOpen, createLandingPageModalHandlers] =
    useDisclosure();

  const { data, isPending, isError } = useLandingPages();

  let componentToBeRendered = null;

  if (isPending) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <Loader type="bars" />
      </Center>
    );
  }

  if (isError) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <p>Unable to get data, Please try again later</p>
      </Center>
    );
  }

  if (!isPending && !isError && !data?.length) {
    componentToBeRendered = <NothingFound text="No LandingPages Found." />;
  } else if (data) {
    componentToBeRendered = <LandingPageCardsList landingPages={data} />;
  }
  useEffect(() => {
    if (action === "create") {
      createLandingPageModalHandlers.open();
    }
  }, [action]);

  return (
    <Stack className={`${styles["landingPage-dashboard-page-div"]}`}>
      <Group className={styles["heading-and-create-landingPage-btn-container"]}>
        <h1>Landing Pages</h1>
        <Button
          className={styles["create-landingPage-btn"]}
          rightSection={<IconPlus />}
          onClick={createLandingPageModalHandlers.open}
        >
          Create Landing Page
        </Button>
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
