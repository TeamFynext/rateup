"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useForm } from "@mantine/form";
import { IconBrandInstagram, IconBrandWhatsapp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { AutomationPlatform } from "@/types/platform";
import { AccountSelector } from "@/components/input/AccountSelector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccessToast } from "@/utils/notifications";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import {
  useCreateInstagramAutomationMutation,
  useUpdateInstagramAutomationMutation,
} from "../../../../backend/whatsapp/instagram-automation/instagramAutomation.query";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";
import { WaAutomatedReply } from "../../../../types/global";

export default function CreateAutomatedReplyPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Chatbot</h1>
        <p className="text-muted-foreground">
          Set up automated replies for your WhatsApp conversations
        </p>
      </div>
      <AutomatedReplyForm />
    </div>
  );
}

function getInitialValues(initialValues?: WaAutomatedReply) {
  if (initialValues) return initialValues;
  return {
    name: "",
    platform: AutomationPlatform.WHATSAPP,
    matchData: {
      json: {
        nodes: [
          {
            id: `startNode-${Date.now()}`,
            type: "startNode",
            position: {
              x: 225,
              y: 45,
            },
            data: {
              label: "Start",
              type: "startNode",
              startMessage: "",
            },
            measured: {
              width: 220,
              height: 126,
            },
          },
        ],
        edges: [],
        viewport: {},
      },
      caseSensitive: false,
    },
    whatsappSettingsPhoneId: null,
  };
}

interface AutoPilotFormProps {
  initialValues?: WaAutomatedReply;
  editMode?: boolean;
  close?: () => void;
}
export function AutomatedReplyForm({
  initialValues,
  editMode,
  close,
}: Readonly<AutoPilotFormProps>) {
  const rootForm = useForm({
    initialValues: getInitialValues(initialValues),
  });

  useEffect(() => {
    if (!initialValues) return;
    const init = getInitialValues(initialValues);
    rootForm.setInitialValues(init);
  }, [initialValues]);

  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const waAutomatedReplyId = searchParams.get("waAutomatedReplyId");

  // WhatsApp mutations
  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation();

  // Instagram mutations
  const createInstagramMutation = useCreateInstagramAutomationMutation();
  const updateInstagramMutation = useUpdateInstagramAutomationMutation();

  const isInstagram = rootForm.values.platform === AutomationPlatform.INSTAGRAM;

  function handleCancelClick() {
    rootForm.reset();
    close();
  }

  function handleSubmitClick() {
    const data = rootForm.values;

    if (editMode) {
      // Update based on platform
      if (isInstagram) {
        updateInstagramMutation.mutate(data, {
          onSuccess: () => {
            qc.invalidateQueries({
              queryKey: [
                "instagramAutomation",
                { automationId: waAutomatedReplyId },
              ],
            });
            showSuccessToast("Instagram Automation Updated Successfully");
          },
        });
      } else {
        updateMutation.mutate(data, {
          onSuccess: () => {
            qc.invalidateQueries({
              queryKey: ["waAutomatedReply", { waAutomatedReplyId }],
            });
            showSuccessToast("Automated Reply Updated Successfully");
          },
        });
      }
    } else {
      // Create based on platform
      if (isInstagram) {
        createInstagramMutation.mutate(data, {
          onSettled: () => {
            handleCancelClick();
          },
        });
      } else {
        createMutation.mutate(data, {
          onSettled: () => {
            handleCancelClick();
          },
        });
      }
    }
  }

  return (
    <form onSubmit={rootForm.onSubmit(handleSubmitClick)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure the basic settings for your automation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContainedTextField
            label="Name"
            placeholder="Enter automation name"
            required
            {...rootForm.getInputProps("name")}
          />

          {/* Platform Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform</label>
            <Select
              value={rootForm.values.platform}
              onValueChange={(value) =>
                rootForm.setFieldValue("platform", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {rootForm.values.platform ===
                    AutomationPlatform.WHATSAPP ? (
                      <>
                        <IconBrandWhatsapp size={16} />
                        <span>WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <IconBrandInstagram size={16} />
                        <span>Instagram</span>
                      </>
                    )}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AutomationPlatform.WHATSAPP}>
                  <div className="flex items-center gap-2">
                    <IconBrandWhatsapp size={16} />
                    <span>WhatsApp</span>
                  </div>
                </SelectItem>
                <SelectItem value={AutomationPlatform.INSTAGRAM}>
                  <div className="flex items-center gap-2">
                    <IconBrandInstagram size={16} />
                    <span>Instagram</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AccountSelector
            optional={true}
            label="WhatsApp Account (only needed if there is a lead automation)"
            {...rootForm.getInputProps("whatsappSettingsPhoneId")}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6">
        <Button type="button" variant="outline" onClick={handleCancelClick}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            createInstagramMutation.isPending ||
            updateInstagramMutation.isPending
          }
        >
          {createMutation.isPending ||
          updateMutation.isPending ||
          createInstagramMutation.isPending ||
          updateInstagramMutation.isPending ? (
            <>
              <span className="mr-2">Saving</span>
              <span className="animate-spin">⏳</span>
            </>
          ) : (
            "Save Automation"
          )}
        </Button>
      </div>
    </form>
  );
}
