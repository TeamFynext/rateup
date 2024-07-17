import { useState } from "react";

import {
  useDeleteAllWebhooks,
  useDeleteShopifySession,
  useRegisterWebhooks,
} from "@/backend/shopify/shopify.query";
import { showLoadingToast } from "@/utils/notifications";
import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";

import { RateupButtonPrimary } from "../Button/RateupButtons";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../Modal/ConfirmationModal";
import PaperLayout from "../styled/Layouts/PaperLayout";

const ShopifySettings = ({ session }) => {
  const [openedConfirm, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const [deleteCase, setDeleteCase] = useState(null);
  const deleteAllWebhooksmt = useDeleteAllWebhooks();
  const deleteSessionmt = useDeleteShopifySession();
  const registerWebhooksmutate = useRegisterWebhooks();
  const handleDeleteWehooks = () => {
    if (!session) return;
    showLoadingToast("hold on..deleting webhooks", "webhooks", true);
    deleteAllWebhooksmt.mutate(session.shop);
  };
  const handleDeleteSession = () => {
    if (!session) return;
    showLoadingToast("hold on..deleting connection", "session", true);
    deleteSessionmt.mutate(session.shop);
  };
  const registerWebhooks = () => {
    showLoadingToast(
      "Hold On..Registering webhooks",
      "webhooks",
      true,
      "Loading",
      "",
      false,
    );
    registerWebhooksmutate.mutate();
  };

  return (
    <Stack>
      <SimpleGrid cols={2}>
        <PaperLayout p={"sm"}>
          <Stack>
            <Title order={4}>Connected Store</Title>
            <ContainedTextField value={session?.shop} disabled />
            <Group justify="flex-end">
              <RateupButtonPrimary
                color="red"
                leftIcon={<IconTrash size={"1rem"} />}
                title="Delete connection"
                onClick={() => {
                  setDeleteCase(
                    getLabelsforConfirmModal("session", handleDeleteSession),
                  );
                  openConfirm();
                }}
              />
            </Group>
          </Stack>
        </PaperLayout>
        <PaperLayout>
          <Stack w={"fit-content"}>
            <Title order={4}>Webhooks</Title>
            {session?.isWebhookRegistered ? (
              <>
                <Text c={"dimmed"}>Webhooks enabled</Text>
                <RateupButtonPrimary
                  color="red"
                  leftIcon={<IconTrash size={"1rem"} />}
                  title="Delete All Webhooks"
                  onClick={() => {
                    setDeleteCase(
                      getLabelsforConfirmModal("webhooks", handleDeleteWehooks),
                    );
                    openConfirm();
                  }}
                />
              </>
            ) : (
              <>
                <Text c={"dimmed"}>
                  Register webhooks to access the survey schedules
                </Text>
                <RateupButtonPrimary
                  color="#95bf47"
                  title="Register webhooks"
                  disabled={registerWebhooksmutate.isPending}
                  onClick={registerWebhooks}
                />
              </>
            )}
          </Stack>
        </PaperLayout>
      </SimpleGrid>
      <ConfirmationModal
        confirmLabel="Delete"
        headerTitle={deleteCase?.headerTitle}
        headerLabel={deleteCase?.headerLabel}
        onClose={closeConfirm}
        opened={openedConfirm}
        onConfirm={deleteCase?.confirmFunction}
        closeLabel="Cancel"
        forDeleteFunctionality
        deleteQuotion={deleteCase?.deleteQuotion}
      />
    </Stack>
  );
};

export function getLabelsforConfirmModal(deletionCase, confirmFunc) {
  switch (deletionCase) {
    case "webhooks":
      return {
        headerTitle: "Delete All Webhook Subcriptions",
        headerLabel: "Are you sure to delete all webhooks?",
        deleteQuotion: "All survey schedules will be deleted",
        confirmFunction: confirmFunc,
      };
    case "session":
      return {
        headerTitle: "Delete Connection with Shopify",
        headerLabel:
          "Are you sure to delete your shopify store connection with RateUp?",
        deleteQuotion: "All survey schedules and webhooks will be deleted",
        confirmFunction: confirmFunc,
      };
    case "ShopifySurvey":
      return {
        headerTitle: "Delete Scheduled Event",
        headerLabel: "Are you sure to delete?",
        deleteQuotion: "All upcoming schedules with this event will be deleted",
        confirmFunction: confirmFunc,
      };
  }
}

export default ShopifySettings;
