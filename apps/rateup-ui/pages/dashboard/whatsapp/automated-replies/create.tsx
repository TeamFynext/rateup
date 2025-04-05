import { useEffect } from "react";
import { useRouter } from "next/router";

import { Button, Checkbox, Group, Radio, Stack, Tabs } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMessageCircle, IconPhoto } from "@tabler/icons-react";

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
      json: {},
      caseSensitive: false,
    },
    commands: [],
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
}: AutoPilotFormProps) {
  const rootForm = useForm({
    initialValues: getInitialValues(initialValues),
  });

  const matchDataForm = useForm<WaAutomatedReplyMatchData>({
    initialValues: getInitialValues(initialValues).matchData,
  });

  useEffect(() => {
    if (!initialValues) return;
    const init = getInitialValues(initialValues);
    rootForm.setInitialValues(init);
    matchDataForm.setInitialValues(init.matchData);
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
    const data = {
      ...rootForm.values,
      matchData: {
        ...matchDataForm.values,
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
                startMessage: rootForm?.values?.commands?.join(", "),
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
