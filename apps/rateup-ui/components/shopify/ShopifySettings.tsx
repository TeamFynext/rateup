"use client";

import { useState } from "react";

import {
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { IntegratedApps, ShopifyEvents } from "@/types/enums";
import { ShopifyIntegration } from "@/types/global";
import {
  useDeleteIntegrationMutation,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import {
  useDeleteAllWebhooks,
  useDeleteWebhookByTopic,
  useGetRegisteredWebhooks,
  useRegisterWebhookByTopic,
  useRegisterWebhooks,
} from "@/backend/appsIntegration/shopify/shopify.query";
import { shopifyEventData } from "@/utils/constants";
import { showLoadingToast } from "@/utils/notifications";

import { RateupButtonPrimary } from "../Button/RateupButtons";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../Modal/ConfirmationModal";
import PaperLayout from "../styled/Layouts/PaperLayout";

const ShopifySettings = ({
  shopifyInfo,
}: {
  shopifyInfo: ShopifyIntegration;
}) => {
  const [openedConfirm, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  const [showEvents, { toggle }] = useDisclosure(false);
  const [deleteCase, setDeleteCase] = useState(null);
  const [isWebhookEnabled, setIsWebhookEnabled] = useState(
    shopifyInfo?.credential?.isWebhookRegistered,
  );
  const deleteAllWebhooksmt = useDeleteAllWebhooks();
  const registerWebhooksmutate = useRegisterWebhooks();
  const registerWebhookByTopicMt = useRegisterWebhookByTopic();
  const deleteWebhookbyTopicMt = useDeleteWebhookByTopic();
  const deleteIntgration = useDeleteIntegrationMutation(IntegratedApps.shopify);
  const updateIntegration = useUpdateIntegrationMutation(
    IntegratedApps.shopify,
  );
  const translations = useTranslations();
  const { data: webhooks } = useGetRegisteredWebhooks(showEvents);
  const session = shopifyInfo.credential.session;
  const handleDeleteWehooks = () => {
    if (!session) return;
    showLoadingToast(
      translations("hold ondeleting webhooks"),
      "webhooks",
      true,
    );
    deleteAllWebhooksmt.mutate(session.shop, {
      onSuccess: () => {
        setIsWebhookEnabled(false);
      },
    });
  };
  const handleDeleteSession = () => {
    if (!session) return;
    showLoadingToast(
      translations("hold ondeleting connection"),
      "integration-delete",
      true,
    );
    deleteIntgration.mutate();
  };
  const registerWebhooks = () => {
    showLoadingToast(
      translations("Hold OnRegistering webhooks"),
      "webhooks",
      true,
      "Loading",
      "",
      false,
    );
    registerWebhooksmutate.mutate(null, {
      onSuccess: () => {
        setIsWebhookEnabled(true);
      },
    });
  };

  const handleWebhookRegistration = (isEnabled) => {
    if (isEnabled) {
      registerWebhooks();
    } else {
      setDeleteCase(getLabelsforConfirmModal("webhooks", handleDeleteWehooks));
      openConfirm();
    }
  };

  const handleDeleteAllShopifySurveys = () => {
    const updateData = {
      ...shopifyInfo.credential,
      shopifySurveys: [],
    };
    showLoadingToast(
      translations("hold ondeleting surveys delivery settings"),
      "integration-update",
      true,
    );
    updateIntegration.mutate({ credential: updateData });
  };

  const handleDeleteAllSchedules = () => {
    const shopifySurveys = shopifyInfo.credential.shopifySurveys;
    shopifySurveys.forEach((s) => {
      s.schedules = [];
    });
    const updateData = {
      ...shopifyInfo.credential,
      shopifySurveys: shopifySurveys,
    };
    showLoadingToast(
      translations("hold ondeleting schedules"),
      "integration-update",
      true,
    );
    updateIntegration.mutate({ credential: updateData });
  };

  const handleChangeWebhookByTopic = (event, isEnabled) => {
    if (isEnabled) {
      showLoadingToast(
        translations("Hold OnRegistering webhooks"),
        "webhooks",
        true,
        "Loading",
        "",
        false,
      );
      registerWebhookByTopicMt.mutate({ topic: event.value });
    } else {
      setDeleteCase(
        getLabelsforConfirmModal(
          "ShopifyWebhookTopic",
          handleDeleteWebhookByTopic,
          [event.value],
          { event: event.label },
        ),
      );
      openConfirm();
    }
  };

  const handleDeleteWebhookByTopic = (topic) => {
    showLoadingToast(
      translations("hold ondeleting webhooks"),
      "webhooks",
      true,
    );
    deleteWebhookbyTopicMt.mutate({ topic: topic });
  };

  return (
    <Stack>
      <SimpleGrid cols={2}>
        <PaperLayout p={"sm"}>
          <Stack>
            <Title order={4}>{translations("Connected Store")}</Title>
            <ContainedTextField value={session?.shop} disabled />
            {/* <Group justify="flex-end">
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
            </Group> */}
          </Stack>
        </PaperLayout>
        <PaperLayout>
          <Stack w={"fit-content"}>
            <Title order={4}>{translations("Danger Zone")}</Title>
            <RateupButtonPrimary
              color="red"
              leftIcon={<IconTrash size={"1rem"} />}
              title={translations("Delete All Survey Delivery Settings")}
              onClick={() => {
                setDeleteCase(
                  getLabelsforConfirmModal(
                    "ShopifySurveyAll",
                    handleDeleteAllShopifySurveys,
                  ),
                );
                openConfirm();
              }}
              disabled={updateIntegration.isPending}
            />
            <RateupButtonPrimary
              color="red"
              leftIcon={<IconTrash size={"1rem"} />}
              title={translations("Delete All Schedules")}
              onClick={() => {
                setDeleteCase(
                  getLabelsforConfirmModal(
                    "Schedules",
                    handleDeleteAllSchedules,
                  ),
                );
                openConfirm();
              }}
              disabled={updateIntegration.isPending}
            />
          </Stack>
        </PaperLayout>
        <PaperLayout>
          <Stack>
            <Title order={4}>Webhooks</Title>
            <Group justify="space-between">
              <Switch
                label={translations(
                  "Allow rateup to subscribe to your store events",
                )}
                styles={{
                  label: {
                    color: "dimgray",
                  },
                }}
                disabled={
                  registerWebhooksmutate.isPending ||
                  deleteAllWebhooksmt.isPending
                }
                size="md"
                checked={isWebhookEnabled}
                onChange={(e) =>
                  handleWebhookRegistration(e.currentTarget.checked)
                }
              />
              <Tooltip label={translations("Show Events")}>
                {showEvents ? (
                  <IconChevronUp onClick={toggle} cursor={"pointer"} />
                ) : (
                  <IconChevronDown onClick={toggle} cursor={"pointer"} />
                )}
              </Tooltip>
            </Group>
            {showEvents && (
              <Stack>
                {shopifyEventData.map((event) =>
                  event.value === ShopifyEvents.ABANDONED_CHECKOUTS ? null : (
                    <Switch
                      key={event.value}
                      label={event.label}
                      checked={webhooks?.includes(event.value)}
                      size="md"
                      styles={{
                        label: {
                          color: "dimgray",
                        },
                      }}
                      onChange={(e) =>
                        handleChangeWebhookByTopic(
                          event,
                          e.currentTarget.checked,
                        )
                      }
                    />
                  ),
                )}
              </Stack>
            )}
          </Stack>
        </PaperLayout>
      </SimpleGrid>
      <ConfirmationModal
        confirmLabel={deleteCase?.confirmLabel || translations("Delete")}
        headerTitle={deleteCase?.headerTitle}
        headerLabel={deleteCase?.headerLabel}
        onClose={() => {
          closeConfirm();
        }}
        opened={openedConfirm}
        onConfirm={() => {
          const funcArgs = deleteCase?.confirmFuncArgs;
          if (funcArgs) deleteCase?.confirmFunction(...funcArgs);
          else deleteCase?.confirmFunction();
        }}
        closeLabel={translations("Cancel")}
        forDeleteFunctionality
        deleteQuotion={deleteCase?.deleteQuotion}
      />
    </Stack>
  );
};

export function getLabelsforConfirmModal(
  deletionCase,
  confirmFunc,
  confirmFuncArgs?,
  data?,
) {
  switch (deletionCase) {
    case "webhooks":
      return {
        headerTitle: "Disable All Webhook Subcriptions",
        headerLabel: "Are you sure to disable all webhooks?",
        deleteQuotion: "All survey schedules will be deleted",
        confirmFunction: confirmFunc,
        confirmLabel: "Disable",
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
        deleteQuotion: "All schedules with this event will be deleted",
        confirmFunction: confirmFunc,
      };
    case "ShopifySurveyAll":
      return {
        headerTitle: "Delete All Survey Delivery Settings",
        headerLabel: "Are you sure to delete?",
        deleteQuotion: "All schedules will also be deleted",
        confirmFunction: confirmFunc,
      };
    case "Schedules":
      return {
        headerTitle: "Delete All Schedues",
        headerLabel: "Are you sure to delete?",
        deleteQuotion: "All undelivered schedules will also be deleted",
        confirmFunction: confirmFunc,
      };
    case "ShopifyWebhookTopic":
      return {
        headerTitle: `Disable ${data.event} event`,
        headerLabel: "Are you sure to disable this webhook?",
        confirmFunction: confirmFunc,
        confirmFuncArgs,
        confirmLabel: "Disable",
      };
  }
}

export default ShopifySettings;
