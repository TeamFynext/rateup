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

import { useLinktrees } from "../../backend/linktree/linktree.query";
import { docsPath } from "../../utils/constants";
import InfoButton from "../Button/InfoButton";
import RefreshButton from "../Button/RefreshButton";
import SortDropdown, { sortData } from "../Dashboard/SortDropDown";
import NothingFound from "../NothingFound/NothingFound";
import LPTourSteps from "../WelcomeTour/components/LPTourSteps";
import WelcomeTour from "../WelcomeTour/WelcomeTour";
import CreateLinktreeModal from "./CreateLinktreeModal";
import LinktreeCardsList from "./LinktreeCardsList";
import styles from "./linktreeDashboardPage.module.css";

function LinktreeDashboard() {
  const router = useRouter();
  const { action } = router.query;
  const [isCreateLinktreeModalOpen, createLinktreeModalHandlers] =
    useDisclosure(action === "create");
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useLinktrees();
  const [linktrees, setLinktrees] = useState([]);
  const [sortOption, setSortOption] = useState("latest");
  const translations = useTranslations();
  const tourSteps = LPTourSteps({ styles });

  useEffect(() => {
    if (data) {
      setLinktrees(data);
    }
  }, [data]);

  const handleSortChange = (value) => {
    setSortOption(value);
  };

  const sortedLinktrees = sortData(
    linktrees.map((s) => ({ ...s, data: { name: s.name } })),
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
  } else if (!isPending && !isError && !linktrees.length) {
    componentToBeRendered = (
      <Center h={"100%"} w={"100%"}>
        <NothingFound text={translations("No Landing Pages Found.")} />;
      </Center>
    );
  } else {
    componentToBeRendered = <LinktreeCardsList linktrees={sortedLinktrees} />;
  }

  return (
    <Stack className={`${styles["linktree-dashboard-page-div"]}`}>
      <Group justify="space-between">
        <Group className={styles["heading-and-create-linktree-btn-container"]}>
          <Button
            className={styles["create-linktree-btn"]}
            rightSection={<IconPlus />}
            onClick={createLinktreeModalHandlers.open}
          >
            {translations("Create Quick Access Link")}
          </Button>
          <WelcomeTour steps={tourSteps} />
          <RefreshButton queryKeys={["linktrees"]} />
        </Group>
        <div className={styles["sort-dropdown"]}>
          <SortDropdown
            onSortChange={handleSortChange}
            defaultSortOption={sortOption}
          />
        </div>
      </Group>
      <Box className={`${styles["linktree-list-container"]}`}>
        {componentToBeRendered}
      </Box>
      {isCreateLinktreeModalOpen && (
        <CreateLinktreeModal
          opened={isCreateLinktreeModalOpen}
          onClose={createLinktreeModalHandlers.close}
          mode="create"
          shortUrlId={""}
          initialName={""}
        />
      )}
    </Stack>
  );
}

export default LinktreeDashboard;
