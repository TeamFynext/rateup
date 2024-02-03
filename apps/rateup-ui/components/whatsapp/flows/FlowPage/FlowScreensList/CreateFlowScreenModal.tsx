import { Box, Button, Modal, TextInput } from "@mantine/core";
import styles from "./FlowScreensList.module.css";
import { useForm } from "@mantine/form";
import { useCallback, useContext, useEffect, useRef } from "react";
import {
  getNewScreenObj,
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "../../../../../utils/whatsapp/flow.utils";
import { getUniqueRandomAlphaId } from "../../../../../utils/misc/random.utils";
import { showErrorToast } from "../../../../../utils/notifications";
import { WaFlowJson } from "../../../../../types/global";
import { Updater } from "use-immer";
import { EditFlowContext } from "../EditFlow/EditFlowContext";

function getInitialValues(screens) {
  return {
    screenId: getUniqueRandomAlphaId(
      6,
      screens.map(({ id }) => id),
    ),
    screenTitle: "",
    footerBtnLabel: "Next",
  };
}
interface CreateFlowScreenModalProps {
  opened: boolean;
  close: () => void;
  screenId?: string;
}
function CreateFlowScreenModal({
  opened,
  close,
  screenId = null,
}: CreateFlowScreenModalProps) {
  const formElementRef = useRef(null);
  const { flowJson, updateFlowJson } = useContext(EditFlowContext);

  const form = useForm({
    initialValues: getInitialValues(flowJson.screens),
    validate: {
      screenId: (value) => {
        if (!/^[a-zA-Z,_]*$/.test(value)) {
          showErrorToast(
            "Error Occured. Please report this bug to the developer. code: #flowsidval",
          );
          return "Id should contain only alphabets and _";
        } else if (value === "") {
          return "Screen Id is required";
        } else {
          return null;
        }
      },
      screenTitle: (value) => {
        if (value === "") return "Screen Title is required";
        else return null;
      },
      footerBtnLabel: (value) => {
        if (value === "") return "Screen Title is required";
        else return null;
      },
    },
  });

  const handleCreate = useCallback((values) => {
    updateFlowJson((draft) => {
      if (!screenId) {
        draft.screens.push(getNewScreenObj(values));
        updateFlowJsonNavigationAndDataPassing(draft);
      } else {
        const screenToBeEdited = getScreenObjById(draft.screens, screenId);
        screenToBeEdited["title"] = values.screenTitle;
      }
      form.setValues(getInitialValues(draft.screens));
    });
    close();
  }, []);

  useEffect(() => {
    if (screenId) {
      const screenToBeEdited = getScreenObjById(flowJson.screens, screenId);
      const layoutChildren = screenToBeEdited.layout["children"][0]["children"];
      const footerObj = layoutChildren[layoutChildren.length - 1];
      form.setValues({
        screenId: screenToBeEdited.id,
        screenTitle: screenToBeEdited.title,
        footerBtnLabel: footerObj.label,
      });
    }
  }, []);

  return (
    <Modal
      opened={opened}
      title={screenId ? "Edit Flow Screen" : "Create Flow Screen"}
      onClose={close}
      centered
      classNames={{ root: styles["create-flow-screen-modal-root"] }}
    >
      <form
        onSubmit={form.onSubmit(handleCreate)}
        className={styles["create-flow-screen-modal-form"]}
        ref={formElementRef}
      >
        <TextInput
          placeholder="Enter Screen Title"
          {...form.getInputProps("screenTitle")}
        />

        <Button type="submit" className={styles["create-submit-btn"]}>
          {screenId ? "Edit" : "Create"}
        </Button>
      </form>
    </Modal>
  );
}

export default CreateFlowScreenModal;
