"use client";

import { useState } from "react";

import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconPlugConnected,
  IconTrash,
  IconWebhook,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { IntegratedApps, ShopifyEvents } from "@/types/enums.ts";
import type { ShopifyIntegration } from "@/types/global";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { shopifyEventData } from "@/utils/constants.ts";

import { ContainedTextField } from "../input/ContainedInput/ContainedInput.tsx";
import ConfirmationModal from "../Modal/ConfirmationModal.tsx";

const ShopifySettings = ({
  shopifyInfo,
}: {
  shopifyInfo: ShopifyIntegration;
}) => {
  const [openedConfirm, setOpenedConfirm] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
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
  const { t: translations } = useTranslation();
  const { data: webhooks } = useGetRegisteredWebhooks(showEvents);
  const session = shopifyInfo.credential.session;

  const handleDeleteWehooks = () => {
    if (!session) return;
    toast.loading(translations("hold on..deleting webhooks"), {
      id: "webhooks",
    });
    deleteAllWebhooksmt.mutate(session.shop, {
      onSuccess: () => {
        setIsWebhookEnabled(false);
      },
    });
  };

  const handleDeleteSession = () => {
    if (!session) return;
    toast.loading(translations("hold on..deleting connection"), {
      id: "integration-delete",
    });
    deleteIntgration.mutate();
  };

  const registerWebhooks = () => {
    toast.loading(translations("Hold On..Registering webhooks"), {
      id: "webhooks",
    });
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
      setOpenedConfirm(true);
    }
  };

  const handleDeleteAllShopifySurveys = () => {
    const updateData = {
      ...shopifyInfo.credential,
      shopifySurveys: [],
    };
    toast.loading(translations("hold on..deleting surveys delivery settings"), {
      id: "integration-update",
    });
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
    toast.loading(translations("hold on..deleting schedules"), {
      id: "integration-update",
    });
    updateIntegration.mutate({ credential: updateData });
  };

  const handleChangeWebhookByTopic = (event, isEnabled) => {
    if (isEnabled) {
      toast.loading(translations("Hold On..Registering webhooks"), {
        id: "webhooks",
      });
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
      setOpenedConfirm(true);
    }
  };

  const handleDeleteWebhookByTopic = (topic) => {
    toast.loading(translations("hold on..deleting webhooks"), {
      id: "webhooks",
    });
    deleteWebhookbyTopicMt.mutate({ topic: topic });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Connected Store */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconPlugConnected className="size-4 text-muted-foreground" />
            <CardTitle>{translations("Connected Store")}</CardTitle>
          </div>
          <CardDescription>
            {translations("Your active Shopify store connection")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ContainedTextField value={session?.shop} disabled />
          <Separator />
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteCase(
                  getLabelsforConfirmModal("session", handleDeleteSession),
                );
                setOpenedConfirm(true);
              }}
            >
              <IconTrash data-icon="inline-start" />
              {translations("Delete connection")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWebhook className="size-4 text-muted-foreground" />
              <CardTitle>Webhooks</CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowEvents((v) => !v)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={translations("Show Events")}
                  >
                    {showEvents ? (
                      <IconChevronUp className="size-4" />
                    ) : (
                      <IconChevronDown className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{translations("Show Events")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            {translations("Allow rateup to subscribe to your store events")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              id="webhook-master"
              disabled={
                registerWebhooksmutate.isPending ||
                deleteAllWebhooksmt.isPending
              }
              checked={isWebhookEnabled}
              onCheckedChange={(checked) => handleWebhookRegistration(checked)}
            />
            <Label htmlFor="webhook-master" className="font-normal">
              {isWebhookEnabled
                ? translations("Webhooks enabled")
                : translations("Webhooks disabled")}
            </Label>
          </div>

          {showEvents && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {translations("Event subscriptions")}
                </p>
                {shopifyEventData.map((event) =>
                  event.value === ShopifyEvents.ABANDONED_CHECKOUTS ? null : (
                    <div
                      key={event.value}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <Label
                        htmlFor={`webhook-${event.value}`}
                        className="cursor-pointer font-normal"
                      >
                        {event.label}
                      </Label>
                      <Switch
                        id={`webhook-${event.value}`}
                        checked={webhooks?.includes(event.value)}
                        onCheckedChange={(checked) =>
                          handleChangeWebhookByTopic(event, checked)
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Alert variant="destructive" className="border-destructive/50">
        <IconAlertTriangle className="size-4" />
        <AlertTitle className="font-semibold">
          {translations("Danger Zone")}
        </AlertTitle>
        <AlertDescription>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="destructive"
              size="sm"
              disabled={updateIntegration.isPending}
              onClick={() => {
                setDeleteCase(
                  getLabelsforConfirmModal(
                    "ShopifySurveyAll",
                    handleDeleteAllShopifySurveys,
                  ),
                );
                setOpenedConfirm(true);
              }}
            >
              <IconTrash data-icon="inline-start" />
              {translations("Delete All Survey Delivery Settings")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={updateIntegration.isPending}
              onClick={() => {
                setDeleteCase(
                  getLabelsforConfirmModal(
                    "Schedules",
                    handleDeleteAllSchedules,
                  ),
                );
                setOpenedConfirm(true);
              }}
            >
              <IconTrash data-icon="inline-start" />
              {translations("Delete All Schedules")}
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <ConfirmationModal
        confirmLabel={deleteCase?.confirmLabel || translations("Delete")}
        headerTitle={deleteCase?.headerTitle}
        headerLabel={deleteCase?.headerLabel}
        onClose={() => setOpenedConfirm(false)}
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
    </div>
  );
};

function getLabelsforConfirmModal(
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
