import { Box, Flex } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";

import { useEditContactLabelsMutation } from "../../backend/campaign/contacts/contacts.query";
import { SAVE_HOTKEY } from "../../utils/constants";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";

import "react-phone-number-input/style.css";

import { useTranslations } from "next-intl";

import { useTagsContext } from "@/context/TagsContext";

import { ContainedMultiSelect } from "../input/ContainedInput/ContainedInput";

const EditContactLabelModal = ({
  id,
  closeEditModal,
  labels,
}: {
  id: string;
  closeEditModal: () => void;
  labels: string[];
}) => {
  const translations = useTranslations();
  const { tags } = useTagsContext();
  const inboxLabels = tags.inboxLabels.map((label) => label?.name);
  const form = useForm({
    initialValues: {
      labels: labels || [],
    },
  });
  const editContactMutation = useEditContactLabelsMutation(id);
  const handleSubmit = () => {
    const values = form.getValues();
    editContactMutation.mutate(
      { data: values, contactId: id },
      {
        onSuccess: () => {
          closeEditModal();
          form.reset();
        },
      },
    );
  };

  return (
    <Box
      onKeyDown={getHotkeyHandler([
        [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
      ])}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <ContainedMultiSelect
          label="Labels"
          placeholder="Add labels"
          data={inboxLabels}
          {...form.getInputProps("labels")}
        />
        <Flex justify={"flex-end"} gap={"sm"} mt={"sm"}>
          <RateupButtonSecondary
            title={translations("cancel")}
            onClick={closeEditModal}
          />
          <RateupButtonBlue
            title={translations("Save")}
            loading={editContactMutation.isPending}
            onClick={handleSubmit}
          />
        </Flex>
      </form>
    </Box>
  );
};

export default EditContactLabelModal;
