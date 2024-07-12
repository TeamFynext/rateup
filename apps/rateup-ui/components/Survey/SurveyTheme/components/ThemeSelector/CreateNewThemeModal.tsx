import {
  ActionIcon,
  Box,
  Button,
  Modal,
  TextInput,
  Tooltip,
} from "@mantine/core";
import styles from "./ThemeSelector.module.css";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useRef } from "react";
import { useForm } from "@mantine/form";
import modalStyles from "styles/commonCssModules/modal.module.css";
import { useCreateNewThemeMutation } from "../../../../../backend/surveyTheme/surveyTheme.query";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";

function CreateNewThemeModal({ setThemeSelectorState, surveyThemeDispatch }) {
  const router = useRouter();
  const surveyId = router.query.surveyId;

  const [opened, { open, close }] = useDisclosure();

  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      // must start with a letter, can contain underscores, numbers, spaces, length must be 6 or more characters.
      name: (value) =>
        /^[a-zA-Z][a-zA-Z0-9_\s]{5,}$/.test(value)
          ? null
          : "Name should be alphanumeric, should start with a letter, length should be greater than 5 characters",
    },
  });

  const { mutateAsync: createNewThemeMutationAsync } =
    useCreateNewThemeMutation(surveyId);

  const submitBtnRef = useRef(null);

  const handleFormSubmit = useCallback(async ({ name }) => {
    try {
      const themeData = await createNewThemeMutationAsync({ name, surveyId });
      setThemeSelectorState(themeData.id);
      surveyThemeDispatch({
        type: "set-survey-theme",
        payload: themeData.theme,
      });
      close();
    } catch (err) {
      console.log(err);
      close();
    }
  }, []);

  const handleCreateLinkBtnClick = useCallback(() => {
    submitBtnRef?.current.click();
  }, []);

  useEffect(() => {
    if (!opened) form.reset();
  }, [opened]);

  return (
    <>
      <Tooltip label="Create New Theme">
        <ActionIcon className={styles["new-theme-btn"]} onClick={open}>
          <IconPlus size={"1.25rem"} color="white" />
        </ActionIcon>
      </Tooltip>

      <Modal
        title={"Create New Theme"}
        opened={opened}
        onClose={close}
        centered
        classNames={{
          header: modalStyles["modal-header"],
          body: modalStyles["modal-body"],
          content: modalStyles["modal-content"],
        }}
      >
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <TextInput
            label="Theme Name"
            placeholder="Enter Theme Name"
            {...form.getInputProps("name")}
          />
          <Button
            style={{ display: "none" }}
            type="submit"
            ref={submitBtnRef}
          />
        </form>
        <Box className={modalStyles["cancel-save-btns-container"]}>
          <Button onClick={close} className={modalStyles["cancel-btn"]}>
            Cancel
          </Button>
          <Button onClick={handleCreateLinkBtnClick}>Create</Button>
        </Box>
      </Modal>
    </>
  );
}

export default CreateNewThemeModal;
