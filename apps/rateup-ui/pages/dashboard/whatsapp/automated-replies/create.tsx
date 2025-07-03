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
  Tabs,
  Text,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconExclamationCircle,
  IconMessageCircle,
  IconPhoto,
} from "@tabler/icons-react";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import { AccountSelector } from "@/components/input/AccountSelector";
import {
  AssignInbox,
  AssignInboxContent,
} from "@/components/whatsapp/inbox/chatdisplay/chatdisplayHeader";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import {
  ContainedTagInput,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";
import { WaAutomatedReplyMatchType } from "../../../../types/enums";
import {
  WaAutomatedReply,
  WaAutomatedReplyMatchData,
} from "../../../../types/global";
import useContactStore from "../inbox/store";

export default function CreateAutomatedReplyPage() {
  return (
    <Stack>
      <h1>Create Automation</h1>
      <AutomatedReplyForm />
    </Stack>
  );
}

function getInitialValues(initialValues?: WaAutomatedReply) {
  if (initialValues)
    return {
      ...initialValues,
      other: {
        ...initialValues.other,
        assignType: initialValues?.other?.assignType ?? "",
      },
      assignedUserIds:
        initialValues?.WaAutomatedReplyAssignedUser?.map(
          (data) => data?.userId,
        ) ?? [],
    };
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
    teamId: "",
    assignedUserIds: [],
    other: {
      assignType: "me",
      choice: "manual",
    },
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
  const [memberChoice, setMemberChoice] = useState("manual");
  const { data: teamMembers, isLoading } = useTeamsMembersOfOrg();

  const rootForm = useForm({
    initialValues: getInitialValues(initialValues),
    validate: {
      // assignedUserIds: memberChoice === "manual" && isNotEmpty("required"),
    },
  });

  const matchDataForm = useForm<WaAutomatedReplyMatchData>({
    initialValues: getInitialValues(initialValues).matchData,
  });

  useEffect(() => {
    if (!initialValues) return;
    const init = getInitialValues(initialValues);
    rootForm.setInitialValues(init);
    matchDataForm.setInitialValues(init.matchData);
    setMemberChoice(init.other?.choice ?? "manual");
  }, [initialValues]);

  const router = useRouter();
  let automatedId = router.query.waAutomatedReplyId as string;
  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation(automatedId);

  function handleCancelClick() {
    rootForm.reset();
    matchDataForm.reset();
    close();
  }

  function handleSubmitClick() {
    const jsonData = matchDataForm.values.json;

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

    const data = {
      ...rootForm.values,
      other: {
        ...rootForm.values.other,
        choice: memberChoice,
      },
      matchData: {
        ...matchDataForm.values,
        json: jsonData,
      },
    };

    if (editMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data, {
        onSettled: () => {
          handleCancelClick();
        },
      });
    }
  }

  const members = useMemo(
    () =>
      teamMembers?.data
        ?.filter((user) =>
          user.teams.some((t) => t.team_id === rootForm.values.teamId),
        )
        .map((user) => ({ value: user.id, label: user.name })),
    [teamMembers, rootForm.values.teamId],
  );

  return (
    <form onSubmit={rootForm.onSubmit((values) => handleSubmitClick())}>
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
        <SegmentedControl
          {...rootForm.getInputProps("other.assignType")}
          data={[
            { label: "Assign To Me", value: "me" },
            { label: "Assign To Staff", value: "staff" },
          ]}
        />
        {rootForm.values?.other?.assignType === "staff" && (
          <Card withBorder radius={"lg"}>
            <Group justify="center" gap={2}>
              <IconExclamationCircle size={"1rem"} />
              <Text size="xs">Assign the chat</Text>
            </Group>
            <AssignInboxContent
              form={rootForm}
              memberChoice={memberChoice}
              setMemberChoice={setMemberChoice}
              isLoading={isLoading}
              members={members}
            />
          </Card>
        )}
        <Tabs
          defaultValue="keywords"
          variant="pills"
          onChange={(e) => {
            if (e === "allOthers") {
              rootForm.setFieldValue("commands", ["*"]);
            } else {
              rootForm.setFieldValue("commands", []);
            }
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value="keywords"
              leftSection={<IconMessageCircle size={12} />}
            >
              Keywords
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
        </Tabs>

        <Group justify={"space-between"}>
          <Button onClick={handleCancelClick} variant="light">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            Submit
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
