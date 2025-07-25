import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  Button,
  Card,
  Checkbox,
  Group,
  Radio,
  SegmentedControl,
  Stack,
  Switch,
  Tabs,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBrandMeta,
  IconExclamationCircle,
  IconMessageCircle,
  IconPhoto,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { AccountSelector } from "@/components/input/AccountSelector";
import { AssignInboxContent } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayHeader";
import { showSuccessToast } from "@/utils/notifications";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import {
  ContainedSwitchInput,
  ContainedTagInput,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";
import { WaAutomatedReplyMatchType } from "../../../../types/enums";
import {
  WaAutomatedReply,
  WaAutomatedReplyMatchData,
} from "../../../../types/global";

export default function CreateAutomatedReplyPage() {
  return (
    <Stack>
      <h1>Create Automation</h1>
      <AutomatedReplyForm />
    </Stack>
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
              // startMessage: rootForm?.values?.commands?.join(", "),
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
    whatsappSettingsPhoneId: "",
    isEnabled: true,
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

  const matchDataForm = useForm<WaAutomatedReplyMatchData>({
    initialValues: getInitialValues(initialValues).matchData,
  });
  const [activetab, setActiveTab] = useState("keywords");

  useEffect(() => {
    if (!initialValues) return;
    const init = getInitialValues(initialValues);
    rootForm.setInitialValues(init);
    matchDataForm.setInitialValues(init.matchData);
    setActiveTab(
      initialValues?.commands.includes("*")
        ? "allOthers"
        : initialValues?.commands.includes("lead")
          ? "leadgen"
          : "keywords",
    );
  }, [initialValues]);

  const qc = useQueryClient();
  const router = useRouter();
  let waAutomatedReplyId = router.query.waAutomatedReplyId as string;
  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation();

  function handleCancelClick() {
    rootForm.reset();
    matchDataForm.reset();
    close();
  }

  function handleSubmitClick() {
    let jsonData = matchDataForm.values.json;

    if (activetab === "leadgen" && !editMode) {
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
    <form onSubmit={rootForm.onSubmit(handleSubmitClick)}>
      <Stack>
        <ContainedTextField
          label="Name"
          placeholder="Enter name"
          required
          style={{ flex: 4 }}
          {...rootForm.getInputProps("name")}
        />
        <AccountSelector
          {...rootForm.getInputProps("whatsappSettingsPhoneId")}
        />

        <Tabs
          defaultValue="keywords"
          variant="pills"
          onChange={(e) => {
            if (e === "allOthers") {
              rootForm.setFieldValue("commands", ["*"]);
            } else if (e === "leadgen") {
              rootForm.setFieldValue("commands", ["lead"]);
            } else {
              rootForm.setFieldValue("commands", []);
            }
            setActiveTab(e);
          }}
          value={activetab}
        >
          <Tabs.List>
            <Tabs.Tab
              value="keywords"
              leftSection={<IconMessageCircle size={12} />}
            >
              Keywords
            </Tabs.Tab>
            <Tabs.Tab value="leadgen" leftSection={<IconBrandMeta size={12} />}>
              Lead generation
            </Tabs.Tab>
            <Tabs.Tab value="allOthers" leftSection={<IconPhoto size={12} />}>
              All Others
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="keywords">
            <Radio.Group
              label="Match Type"
              required
              {...rootForm.getInputProps("matchType")}
              onChange={(e) => {
                rootForm.setFieldValue("matchType", e as any);
                if (e === WaAutomatedReplyMatchType.Exact) {
                  rootForm.values?.commands?.length &&
                    rootForm.setFieldValue("commands", [
                      rootForm.values?.commands?.[0],
                    ]);
                }
              }}
            >
              <Group pl={"xs"} pt={"xs"}>
                <Radio
                  value={WaAutomatedReplyMatchType.ContainsAnyOf}
                  label={"Contains Any Of"}
                />
                <Radio
                  value={WaAutomatedReplyMatchType.ContainsAllOf}
                  label={"Contains All Of"}
                />
                <Radio
                  value={WaAutomatedReplyMatchType.Exact}
                  label={"Exactly Equals"}
                />
              </Group>
            </Radio.Group>
            <ContainedSwitchInput
              label="Enable WhatsApp Automation"
              {...rootForm.getInputProps("isEnabled", { type: "checkbox" })}
              defaultChecked={true}
              my={"xs"}
            />
            <Group>
              <ContainedTagInput
                required
                label="Keywords"
                placeholder="Enter keywords"
                {...rootForm.getInputProps("commands")}
                flex={1}
                maxTags={
                  rootForm?.values?.matchType ===
                  WaAutomatedReplyMatchType.Exact
                    ? 1
                    : Infinity
                }
              />
              <Checkbox
                mt={"lg"}
                label="Case Sensitive"
                {...matchDataForm.getInputProps("caseSensitive", {
                  type: "checkbox",
                })}
              />
            </Group>
          </Tabs.Panel>

          <Tabs.Panel value="allOthers">
            <ContainedTagInput
              required
              readOnly
              disabled
              label="Keywords"
              placeholder="Enter keywords"
              {...rootForm.getInputProps("commands")}
            />
          </Tabs.Panel>

          <Tabs.Panel value="leadgen">
            <ContainedTagInput
              required
              readOnly
              disabled
              label="Keywords"
              placeholder="Enter keywords"
              {...rootForm.getInputProps("commands")}
            />
          </Tabs.Panel>
        </Tabs>

        <Group justify={"space-between"}>
          <Button onClick={handleCancelClick} variant="light">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
