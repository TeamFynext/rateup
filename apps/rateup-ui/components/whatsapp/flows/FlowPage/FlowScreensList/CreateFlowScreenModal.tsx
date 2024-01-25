import { Box, Button, Modal, TextInput } from "@mantine/core";
import styles from "./FlowScreensList.module.css";
import { useForm } from "@mantine/form";
import { useCallback, useContext, useEffect, useRef } from "react";
import { FlowJsonObjContext } from "../EditFlow/FlowJsonObjContext";
import {
  getNewScreenObj,
  getScreenObjById,
  updateFlowJsonNavigateTerminalScreens,
} from "./utils";

function CreateFlowScreenModal({ opened, close, screenId = null }) {
  const { flowJsonObj, setFlowJsonObj } = useContext(FlowJsonObjContext);
  const formElementRef = useRef(null);

  const form = useForm({
    initialValues: {
      screenId: "",
      screenTitle: "",
      footerBtnLabel: "",
    },
    validate: {
      screenId: (value) => {
        const isDuplicateId = flowJsonObj.screens.find(
          ({ id }) => id === value,
        );
        if (isDuplicateId) {
          return "A Screen with given id already exist.";
        } else if (!/^[a-zA-Z,_]*$/.test(value)) {
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

  const handleFormSubmit = useCallback((values) => {
    setFlowJsonObj((draft) => {
      if (!screenId) {
        draft.screens.push(getNewScreenObj(values));
        updateFlowJsonNavigateTerminalScreens(draft);
      } else {
        const screenToBeEdited = getScreenObjById(draft.screens, screenId);
        const layoutChildren =
          screenToBeEdited.layout["children"][0]["children"];
        const footerObj = layoutChildren[layoutChildren.length - 1];
        screenToBeEdited["id"] = values.screenId;
        screenToBeEdited["title"] = values.screenTitle;
        footerObj["label"] = values.footerBtnLabel;
      }
    });
    close();
  }, []);

  useEffect(() => {
    if (screenId) {
      const screenToBeEdited = getScreenObjById(flowJsonObj.screens, screenId);
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
        onSubmit={form.onSubmit(handleFormSubmit)}
        className={styles["create-flow-screen-modal-form"]}
        ref={formElementRef}
      >
        <TextInput
          placeholder="Enter Screen Id"
          {...form.getInputProps("screenId")}
        />

        <TextInput
          placeholder="Enter Screen Title"
          {...form.getInputProps("screenTitle")}
        />

        <TextInput
          placeholder="Enter Footer Button Label"
          {...form.getInputProps("footerBtnLabel")}
        />

        <Button type="submit" className={styles["create-submit-btn"]}>
          {screenId ? "Edit" : "Create"}
        </Button>
      </form>
    </Modal>
  );
}

export default CreateFlowScreenModal;
