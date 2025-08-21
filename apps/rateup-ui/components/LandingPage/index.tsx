import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useLandingPages } from "../../backend/landingPage/landingPage.query";
import { docsPath } from "../../utils/constants";
import InfoButton from "../Button/InfoButton";
import RefreshButton from "../Button/RefreshButton";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import LPTourSteps from "../WelcomeTour/components/LPTourSteps";
import WelcomeTour from "../WelcomeTour/WelcomeTour";
import CreateLandingPageModal from "./CreateLandingPageModal";
import LandingPageCardsList from "./LandingPageCardsList";
import styles from "./landingPageDashboardPage.module.css";

function LandingPageDashboard() {
  const router = useRouter();
  const action = router.query.action;
  const [isCreateLandingPageModalOpen, createLandingPageModalHandlers] =
    useDisclosure(action === "create");
  const { data, isPending, isError } = useLandingPages();

  const [landingPages, setLandingPages] = useState([]);
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
        <p>{translations("Unable to get data, please try again later.")}</p>
      </Center>
    );
  } else if (!isPending && !isError && !landingPages.length) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <NothingFound text={translations("No Landing Pages Found.")} />;
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
          <Button
            className={styles["create-landingPage-btn"]}
            rightSection={<IconPlus />}
            onClick={createLandingPageModalHandlers.open}
          >
            {translations("Create Landing Page")}
          </Button>
          <InfoButton docUrl={`${docsPath}/landingpage`} />
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["landingPages"]} />
        </Group>
        <div className={styles["sort-dropdown"]}>
          <SortDropdown
            onSortChange={handleSortChange}
            defaultSortOption={sortOption}
          />
        </div>
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
