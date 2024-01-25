import { ActionIcon, Box } from "@mantine/core";
import styles from "./EditFlowScreenQs.module.css";
import { EditFlowTabs } from "../EditFlow/EditFlow";
import { IconArrowNarrowLeft } from "@tabler/icons";
import QuestionsList from "./QuestionsList";

function EditFlowScreenQs({ setActiveEditFlowTab, screenId }) {
  return (
    <Box className={styles["edit-flow-screen-qs-container"]}>
      <ActionIcon
        className={styles["back-btn"]}
        onClick={() => setActiveEditFlowTab(EditFlowTabs.screensList)}
      >
        <IconArrowNarrowLeft />
      </ActionIcon>
      <h1 className={styles["edit-flow-screen-qs-heading"]}>
        Edit Flow screen Qs
      </h1>
      <QuestionsList screenId={screenId} />
    </Box>
  );
}

export default EditFlowScreenQs;
