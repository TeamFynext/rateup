import React from "react";
import { useRouter } from "next/router";

import { Group, rem, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { deleteOrg } from "../../../../backend/org/org.api";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import ConfirmationModal from "../../../../components/Modal/ConfirmationModal";
import PaperLayout from "../../../../components/styled/Layouts/PaperLayout";

const PermanentDelete = ({ orgId }) => {
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const translations = useTranslations();

  const orgDeleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteOrg(id),
    onSuccess: (msg) => {
      notifications.update({
        id: "delete-data",
        color: "teal",
        title: translations("Success"),
        message: translations("Organization Deleted Successfully!"),
        loading: false,
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        autoClose: 2000,
      });
      open();
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
    },
    onError: (error: any) => {
      notifications.update({
        id: "delete-data",
        loading: false,
        color: "red",
        title: translations("Delete Failed..!"),
        message: error?.response?.data?.error,
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
  });

  return (
    <Stack>
      <Text size="lg" fw={500}>
        {translations("Permanent Deletion")}
      </Text>
      <PaperLayout shadow="xl" p={"xl"}>
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={4}>DANGER ZONE</Title>
            <Text c="dimmed">
              {translations(
                "Permanently Deletes All Users & Organization Data",
              )}
            </Text>
          </Stack>
          <Stack>
            <RateupButtonBlue
              color="red"
              title={translations("Delete Organization & All data")}
              onClick={toggle}
            />
          </Stack>
        </Group>
      </PaperLayout>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel={translations("Are you sure to delete this Survey?")}
        headerTitle={translations("Delete Survey?")}
        confirmLabel={translations("Delete")}
        includeEmailConfirmation={true}
        onConfirm={async (e) => {
          notifications.show({
            id: "delete-data",
            loading: true,
            title: translations("Deleting Organization.."),
            message: translations(
              "Hold on, your organization is getting deleted...",
            ),
            autoClose: false,
            withCloseButton: false,
          });
          await orgDeleteMutation.mutateAsync({ id: orgId });
        }}
      />

      <ConfirmationModal
        opened={opened}
        onConfirm={() => router.push("/logout")}
        confirmLabel={translations("Continue")}
        headerLabel={translations(
          "Your Organization and all its related users, data has been permanently deleted.",
        )}
        headerTitle={translations("Delete Success")}
        excludeCancelButton={true}
        onClose={close}
      />
    </Stack>
  );
};

export default PermanentDelete;
