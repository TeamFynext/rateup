"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useForm } from "@mantine/form";
import {
  IconBrandMeta,
  IconInfoCircle,
  IconMessageCircle,
  IconPhoto,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useGetAllBusinessHours } from "@/backend/org/business-hours/business-hours.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { AccountSelector } from "@/components/input/AccountSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { showSuccessToast } from "@/utils/notifications";
import { hasFeature } from "@/utils/subscription/subscription";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import {
  ContainedMultiSelect,
  ContainedSelection,
  ContainedTagInput,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";
import {
  SubscriptionFeaturePathName,
  WaAutomatedReplyMatchType,
} from "../../../../types/enums";
import { WaAutomatedReply } from "../../../../types/global";

export default function CreateAutomatedReplyPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create Automation</h1>
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
    matchType: WaAutomatedReplyMatchType.ContainsAnyOf,
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
    commands: [],
    whatsappSettingsPhoneIds: [],
    isEnabled: true,
    sendOnceIn24Hours: true,
    businessHourId: null,
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
  const { data: contactGroups } = useContactGroup();
  const { data: businessHours, isPending } = useGetAllBusinessHours();
  const { customFields } = useCustomFieldsContext();

  const matchDataForm = useForm<any>({
    initialValues: {
      ...getInitialValues(initialValues).matchData,
      contactFilters: {
        newContactsOnly: false,
        inGroups: [],
        requiredFieldsWithAnyValue: [],
        ...(getInitialValues(initialValues).matchData as any)?.contactFilters,
      },
    },
  });
  const [activeTab, setActiveTab] = useState<string>("keywords");

  useEffect(() => {
    if (!initialValues) return;
    const init = getInitialValues(initialValues);
    rootForm.setInitialValues(init);

    const initMatch = (init.matchData || {}) as any;
    const mergedMatch = {
      ...initMatch,
      contactFilters: {
        newContactsOnly: false,
        inGroups: [],
        hasLabels: [],
        requiredFieldsWithAnyValue: [],
        ...(initMatch?.contactFilters || {}),
      },
    };
    matchDataForm.setInitialValues(mergedMatch);
    matchDataForm.setValues(mergedMatch);

    setActiveTab(
      initialValues?.commands.includes("*")
        ? "allOthers"
        : initialValues?.commands[0]?.startsWith("lead")
          ? "leadgen"
          : "keywords",
    );
  }, [initialValues]);

  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const waAutomatedReplyId = searchParams.get("waAutomatedReplyId");

  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation();
  const { data: subscription } = useSubscription();

  function handleCancelClick() {
    rootForm.reset();
    matchDataForm.reset();
    close();
  }

  function handleSubmitClick() {
    let jsonData = matchDataForm.values.json;

    if (activeTab === "leadgen" && !editMode) {
      jsonData = {
        nodes: [
          {
            id: `leadgenNode-${Date.now()}`,
            type: "leadgenNode",
            position: {
              x: 225,
              y: 45,
            },
            data: {
              label: "Lead",
              type: "leadgenNode",
              fbPageId: "",
              adAccountId: "",
              ad: {
                id: "",
                name: "",
              },
              phone: "",
              phoneField: "",
              leadgenFormId: "",
              pageAccessToken: "",
            },
            measured: {
              width: 220,
              height: 126,
            },
          },
        ],
        edges: [],
        viewport: {},
      };
    } else {
      // Update startMessage in all nodes of type "startNode"
      jsonData.nodes = jsonData.nodes.map((node) => {
        if (node.type === "startNode") {
          return {
            ...node,
            data: {
              ...node.data,
              startMessage: rootForm?.values?.commands?.join(", "),
            },
          };
        }
        return node;
      });
    }

    const data = {
      ...rootForm.values,
      matchData: {
        ...matchDataForm.values,
        json: jsonData,
      },
    };

    if (editMode) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          qc.invalidateQueries({
            queryKey: ["waAutomatedReply", { waAutomatedReplyId }],
          });
          showSuccessToast("Automated Reply Updated Successfully");
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

  return (
    <form
      onSubmit={rootForm.onSubmit(handleSubmitClick)}
      className="space-y-6 "
    >
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
          <div className="space-y-2">
            <Label>WhatsApp Accounts</Label>
            <AccountSelector
              multiple
              {...rootForm.getInputProps("whatsappSettingsPhoneIds")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger Configuration</CardTitle>
          <CardDescription>
            Define when this automation should be triggered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="keywords"
            value={activeTab}
            onValueChange={(e) => {
              if (e === "allOthers") {
                rootForm.setFieldValue("commands", ["*"]);
              } else if (e === "leadgen") {
                rootForm.setFieldValue("commands", ["lead"]);
              } else {
                rootForm.setFieldValue("commands", []);
              }
              setActiveTab(e);
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="keywords">
                <IconMessageCircle size={16} />
                <span>Keywords</span>
              </TabsTrigger>
              <TabsTrigger
                value="leadgen"
                disabled={
                  !subscription ||
                  !hasFeature(
                    subscription,
                    SubscriptionFeaturePathName.LeadAdAutomation,
                  )
                }
              >
                <IconBrandMeta size={16} />
                <span>Lead Generation</span>
              </TabsTrigger>
              <TabsTrigger value="allOthers">
                <IconPhoto size={16} />
                <span>All Others</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keywords">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base">Match Type</Label>
                  <RadioGroup
                    value={rootForm.values.matchType}
                    onValueChange={(e) => {
                      rootForm.setFieldValue("matchType", e as any);
                      if (e === WaAutomatedReplyMatchType.Exact) {
                        rootForm.values?.commands?.length &&
                          rootForm.setFieldValue("commands", [
                            rootForm.values?.commands?.[0],
                          ]);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={WaAutomatedReplyMatchType.ContainsAnyOf}
                        id="contains-any"
                      />
                      <Label
                        htmlFor="contains-any"
                        className="font-normal cursor-pointer"
                      >
                        Contains Any Of
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={WaAutomatedReplyMatchType.ContainsAllOf}
                        id="contains-all"
                      />
                      <Label
                        htmlFor="contains-all"
                        className="font-normal cursor-pointer"
                      >
                        Contains All Of
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={WaAutomatedReplyMatchType.Exact}
                        id="exact"
                      />
                      <Label
                        htmlFor="exact"
                        className="font-normal cursor-pointer"
                      >
                        Exactly Equals
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Enable WhatsApp Automation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on to activate this automation
                    </p>
                  </div>
                  <Switch
                    checked={rootForm.values.isEnabled}
                    onCheckedChange={(checked) =>
                      rootForm.setFieldValue("isEnabled", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Send only once in 24 hours
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent duplicate messages to the same user
                    </p>
                  </div>
                  <Switch
                    checked={rootForm.values.sendOnceIn24Hours}
                    onCheckedChange={(checked) =>
                      rootForm.setFieldValue("sendOnceIn24Hours", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <ContainedTagInput
                    required
                    label="Keywords"
                    placeholder="Enter keywords to trigger automation"
                    {...rootForm.getInputProps("commands")}
                    maxTags={
                      rootForm?.values?.matchType ===
                      WaAutomatedReplyMatchType.Exact
                        ? 1
                        : Infinity
                    }
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="case-sensitive"
                      checked={matchDataForm.values.caseSensitive}
                      onCheckedChange={(checked) =>
                        matchDataForm.setFieldValue(
                          "caseSensitive",
                          checked as boolean,
                        )
                      }
                    />
                    <Label
                      htmlFor="case-sensitive"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Case Sensitive
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="allOthers">
              <div className="space-y-4">
                <Alert>
                  <IconInfoCircle className="h-4 w-4" />
                  <AlertDescription>
                    This automation will trigger for all messages that don't
                    match other automations.
                  </AlertDescription>
                </Alert>
                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Enable WhatsApp Automation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on to activate this automation
                    </p>
                  </div>
                  <Switch
                    checked={rootForm.values.isEnabled}
                    onCheckedChange={(checked) =>
                      rootForm.setFieldValue("isEnabled", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Send only once in 24 hours
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent duplicate messages to the same user
                    </p>
                  </div>
                  <Switch
                    checked={rootForm.values.sendOnceIn24Hours}
                    onCheckedChange={(checked) =>
                      rootForm.setFieldValue("sendOnceIn24Hours", checked)
                    }
                  />
                </div>
                <Separator />

                <ContainedTagInput
                  required
                  readOnly
                  disabled
                  label="Keywords"
                  placeholder="Matches all other messages"
                  {...rootForm.getInputProps("commands")}
                />
              </div>
            </TabsContent>

            <TabsContent value="leadgen">
              <Alert>
                <IconBrandMeta className="h-4 w-4" />
                <AlertDescription>
                  This automation will trigger when leads are generated from
                  Meta ads.
                </AlertDescription>
              </Alert>
              <ContainedTagInput
                required
                readOnly
                disabled
                label="Keywords"
                placeholder="Triggered by lead generation"
                {...rootForm.getInputProps("commands")}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger Conditions</CardTitle>
          <CardDescription>
            Set additional conditions for when this automation should run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm">Contact Filters</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New contacts only</Label>
                <p className="text-sm text-muted-foreground">
                  Only trigger for contacts who message for the first time
                </p>
              </div>
              <Switch
                checked={matchDataForm.values.contactFilters?.newContactsOnly}
                onCheckedChange={(checked) =>
                  matchDataForm.setFieldValue(
                    "contactFilters.newContactsOnly",
                    checked,
                  )
                }
              />
            </div>

            <ContainedMultiSelect
              placeholder="Select contact groups"
              label="Contact groups (match if contact is in any)"
              data={contactGroups?.map((group) => ({
                value: group.id,
                label: group.name,
              }))}
              {...matchDataForm.getInputProps("contactFilters.inGroups")}
            />

            <ContainedMultiSelect
              label="Required fields with any value"
              placeholder="Select fields that must have a value"
              data={customFields.map((field) => ({
                value: field.id,
                label: field.name,
              }))}
              {...matchDataForm.getInputProps(
                "contactFilters.requiredFieldsWithAnyValue",
              )}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Hours</Label>
              {isPending ? (
                "Loading business hours..."
              ) : (
                <ContainedSelection
                  placeholder="Select business hours (optional)"
                  label="Select business hours (optional)"
                  data={businessHours?.map((businessHour) => ({
                    value: businessHour.id,
                    label: businessHour.name,
                  }))}
                  {...rootForm.getInputProps("businessHourId")}
                />
              )}

              <p className="text-sm text-muted-foreground">
                Only trigger automation during specified business hours
              </p>
            </div>

            {rootForm.values.businessHourId && (
              <Alert>
                <IconInfoCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This automation will only trigger during the selected business
                  hours.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6">
        <Button type="button" variant="outline" onClick={handleCancelClick}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <>
              <span className="mr-2">Saving...</span>
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
