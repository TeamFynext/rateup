import { Box, Button } from "@mantine/core";
import styles from "./FlowScreensList.module.css";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useCallback, useContext } from "react";
import { FlowJsonObjContext } from "../EditFlow/FlowJsonObjContext";
import { updateFlowJson } from "./utils";

function ScreenListItem({ screenId }) {
  const { flowJsonObj, setFlowJsonObj } = useContext(FlowJsonObjContext);

  const handleDeleteBtnClick = useCallback(() => {
    setFlowJsonObj((draft) => {
      draft.screens = draft.screens.filter((screenObj) => {
        return screenObj.id !== screenId;
      });
      updateFlowJson(draft);
    });
  }, [screenId]);

  return (
    <Box className={styles["screen-list-item"]}>
      <h2 className={styles["screen-id-h2"]}>{screenId}</h2>
      <Box className={styles["screen-action-conainer"]}>
        <Button leftSection={<IconEdit size={"1rem"} />}>Edit</Button>
        <Button
          leftSection={<IconTrash size={"1rem"} />}
          onClick={handleDeleteBtnClick}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
}

export default ScreenListItem;
