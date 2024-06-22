import React from "react";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";
import { Group, Stack, Text, Title, rem } from "@mantine/core";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import ConfirmationModal from "../../../../components/Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import { deleteOrg } from "../../../../backend/org/org.api";

const PermanentDelete = ({ orgId }) => {
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

  const orgDeleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOrg(id),
    onSuccess: () => {
      notifications.update({
        id: "delete-data",
        color: "teal",
        title: "Success",
        message: "Organization Deleted Successfully!",
        loading: false,
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        autoClose: 2000,
      });
      //   queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (error: any) => {
      //console.error("Error deleting Survey:", error.message);
      notifications.update({
        id: "delete-data",
        loading: false,
        color: "red",
        title: "Delete Failed..!",
        message: error?.response?.data?.error,
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
  });

  return (
    <Stack>
      <Text size="lg" fw={500}>
        Permanent Deletion
      </Text>
      <PaperLayout shadow="xl" p={"xl"}>
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={4}>DANGER ZONE</Title>
            <Text c="dimmed">
              Permanently Deletes All Users & Organization Data
            </Text>
          </Stack>
          <Stack>
            {/* <RateupButtonBlue
              color="red"
              title="Delete My Account"
              onClick={open}
            /> */}
            <RateupButtonBlue
              color="red"
              title="Delete Organization & All data"
              onClick={toggle}
            />
          </Stack>
        </Group>
      </PaperLayout>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel="Are you sure to delete this Survey?"
        headerTitle="Delete Survey?"
        confirmLabel="Delete"
        includeEmailConfirmation={true}
        onConfirm={async (e) => {
          notifications.show({
            id: "delete-data",
            loading: true,
            title: "Deleting Organization..",
            message: `Hold on, your organization is getting deleted...`,
            autoClose: false,
            withCloseButton: false,
          });
          await orgDeleteMutation.mutateAsync({ id: orgId });
          //   refetchSurveys();
        }}
      />
    </Stack>
  );
};

export default PermanentDelete;
