import { Box, Button, Center, Group, Loader, Stack } from "@mantine/core";
import styles from "./landingPageDashboardPage.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateLandingPageModal from "./CreateLandingPageModal";
import { useDisclosure } from "@mantine/hooks";
import NothingFound from "../NothingFound/NothingFound";
import { useLandingPages } from "../../backend/landingPage/landingPage.query";
import LandingPageCardsList from "./LandingPageCardsList";

function LandingPageDashboard() {
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
        <p>Unable to get, Please try again later</p>
      </Center>
    );
  }

  if (!isPending && !isError && !data?.length) {
    componentToBeRendered = <NothingFound text="No LandingPages Found." />;
  } else if (data) {
    componentToBeRendered = <LandingPageCardsList landingPages={data} />;
  }

  return (
    <Stack className={`${styles["landingPage-dashboard-page-div"]}`}>
      <Group className={styles["heading-and-create-landingPage-btn-container"]}>
        <h1>LandingPage</h1>
        <Button
          className={styles["create-landingPage-btn"]}
          rightSection={<IconPlus />}
          onClick={createLandingPageModalHandlers.open}
        >
          Create LandingPage
        </Button>
      </Group>
      <Box className={styles["landingPage-list-container"]}>
        {componentToBeRendered}
      </Box>
      {isCreateLandingPageModalOpen && (
        <CreateLandingPageModal
          opened={isCreateLandingPageModalOpen}
          onClose={createLandingPageModalHandlers.close}
        />
      )}
    </Stack>
  );
}

export default LandingPageDashboard;
