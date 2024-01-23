import { Box, Button, Modal, TextInput } from "@mantine/core";
import styles from "./FlowScreensList.module.css";
import { useForm } from "@mantine/form";
import { useCallback, useContext, useRef } from "react";
import { FlowJsonObjContext } from "../EditFlow/FlowJsonObjContext";
import { updateFlowJson } from "./utils";

function CreateFlowScreenModal({ opened, close }) {
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
      updateFlowJson(draft, values);
    });
    close();
  }, []);

  return (
    <Modal
      opened={opened}
      title={"Create Flow Screen"}
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
          Create
        </Button>
      </form>
    </Modal>
  );
}

export default CreateFlowScreenModal;
