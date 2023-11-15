import { Dialog, Group, Text } from "@mantine/core";
import React from "react";
import {
  RateupButtonSecondary,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";

const DeleteConfirmationBox = ({
  dialogOpened,
  closeDialog,
  mutation,
  data,
  text,
}) => {
  return (
    <Dialog
      opened={dialogOpened}
      withCloseButton
      onClose={closeDialog}
      size="lg"
      radius="md"
      position={{ top: "20", right: "40vw" }}
      onClick={(e) => e.stopPropagation()}
    >
      <Text size="md" mb="xs" fw={500}>
        {text || "Are you sure to delete this Menu?"}
      </Text>

      <Group align="center" pt="lg">
        <RateupButtonSecondary
          onClick={(e) => {
            e.stopPropagation();
            closeDialog();
          }}
          disabled={mutation.isPending}
          size="md"
          title="Cancel"
        />

        <RateupButtonPrimary
          onClick={(e) => {
            e.stopPropagation();
            mutation.mutate(data);
            closeDialog();
          }}
          loading={mutation.isPending}
          size="md"
          title="Yes, Delete"
        />
      </Group>
    </Dialog>
  );
};

export default DeleteConfirmationBox;
