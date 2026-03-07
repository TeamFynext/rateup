"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Group, rem, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
      toast.success(translations("Organization Deleted Successfully!"), {
        id: "delete-data",
      });
      open();
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
    },
    onError: (error) => {
      toast.error(error?.message, {
        id: "delete-data",
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
          toast.loading(
            translations("Hold on, your organization is getting deleted"),
            {
              id: "delete-data",
            },
          );
          await orgDeleteMutation.mutateAsync({ id: orgId });
        }}
      />
      <ConfirmationModal
        opened={opened}
        onConfirm={() => router.push("/logout")}
        confirmLabel={translations("Continue")}
        headerLabel={translations(
          "Your Organization and all its related users, data has been permanently deleted",
        )}
        headerTitle={translations("Delete Success")}
        excludeCancelButton={true}
        onClose={close}
      />
    </Stack>
  );
};

export default PermanentDelete;
