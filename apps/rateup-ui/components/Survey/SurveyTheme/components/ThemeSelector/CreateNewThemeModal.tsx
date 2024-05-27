import { ActionIcon, TextInput, Tooltip } from "@mantine/core";
import styles from "./ThemeSelector.module.css";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useCreateNewThemeMutation } from "../../../../../backend/surveyTheme/surveyTheme.query";
import { IconPlus } from "@tabler/icons-react";
import FormModalLayout from "../../../../Modal/FormModalLayout";

function CreateNewThemeModal() {
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
          : "Name should be alphanumeric, should start with a letter, length sould be greater than 5 characters",
    },
  });

  const { mutateAsync: createNewThemeMutationAsync } =
    useCreateNewThemeMutation();

  const handleFormSubmit = useCallback(async ({ name }) => {
    try {
      await createNewThemeMutationAsync(name);
      close();
    } catch (err) {
      console.log(err);
    }
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

      <FormModalLayout
        opened={opened}
        onClose={close}
        title={"Create New Theme"}
        centered
        onSubmit={form.onSubmit(handleFormSubmit)}
        buttonTitle="Create"
        includeCancelButton
      >
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
          <TextInput
            label="Theme Name"
            placeholder="Enter Theme Name"
            {...form.getInputProps("name")}
          />
        </form>
      </FormModalLayout>
    </>
  );
}

export default CreateNewThemeModal;
