// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconExclamationCircle } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";

import { TeamSelector } from "@/components/input/TeamSelector.tsx";

import {
  ContainedMultiSelect,
  isNotEmpty,
  Radio,
  RadioGroup,
  SegmentedControl,
  Switch,
  useForm,
} from "../editor-ui.tsx";
import type { AutomationUser, NodeComponentProps } from "./shared.tsx";

// TicketNode Component
export const AssignNodeEditor: React.FC<
  NodeComponentProps<"assignNode"> & {
    options?: Partial<MembersResponse> & { currentUserId?: string };
  }
> = ({ nodeData, handleInputChange, options }) => {
  const typedData = nodeData;

  const form = useForm({
    initialValues: {
      teamId: "",
      assignedUserIds: [],
      choice: "manual",
      teamName: "",
      roundRobin: false,
      assignIfOnline: true,
    },
    validate: {
      teamId: isNotEmpty("required"),
      assignedUserIds: (value, values) =>
        values?.choice === "manual" ? isNotEmpty("required")(value) : undefined,
    },
    onValuesChange: async (values) => {
      const validationRes = await form.validate();
      if (validationRes.hasErrors) return;
      const teamName =
        options?.data
          ?.flatMap((user: AutomationUser) => user.teams)
          ?.find((team: { team_id?: string }) => team.team_id === values.teamId)?.team_name ?? "";
      handleInputChange("assign", {
        ...typedData?.assign,
        teamId: values.teamId,
        assignedUserIds: values.assignedUserIds,
        choice: values.choice,
        teamName: teamName,
        roundRobin: values.roundRobin,
        assignIfOnline: values.assignIfOnline,
      });
    },
  });

  const members = useMemo(
    () =>
      options?.data
        ?.filter((user: AutomationUser) =>
          user.teams.some((t: { team_id?: string }) => t.team_id === form.values.teamId),
        )
        .map((user: AutomationUser) => ({ value: user.id, label: user.name })),
    [options, form.values.teamId],
  );

  useEffect(() => {
    form.setFieldValue("teamId", typedData.assign?.teamId);
    form.setFieldValue("assignedUserIds", typedData.assign?.assignedUserIds ?? []);
    form.setFieldValue("choice", typedData.assign?.choice || "manual");
    form.setFieldValue("teamName", typedData.assign?.teamName || "");
    form.setFieldValue("roundRobin", typedData.assign?.roundRobin ?? false);
    form.setFieldValue("assignIfOnline", typedData.assign?.assignIfOnline ?? true);
  }, [typedData.assign]);

  return (
    <div className="flex flex-col gap-2">
      {typedData?.assign?.assignType === "staff" && (
        <Switch
          label="Assign only if assignee is online"
          {...form.getInputProps("assignIfOnline", { type: "checkbox" })}
          description="If enabled, assignment will only happen when the assignee is online. If disabled, assignment happens regardless of online status."
        />
      )}
      <SegmentedControl
        value={typedData?.assign?.assignType}
        onChange={(value) => {
          if (value === "me") {
            handleInputChange("assign", {
              ...typedData?.assign,
              assignType: value,
              assignedUserIds: [options?.currentUserId], // set to current user
            });
          } else {
            handleInputChange("assign", {
              ...typedData?.assign,
              assignType: value,
            });
          }
        }}
        data={[
          { label: "Assign To Me", value: "me" },
          { label: "Assign To Staff", value: "staff" },
        ]}
      />

      {typedData?.assign?.assignType === "staff" && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-0.5">
            <IconExclamationCircle size={"1rem"} />
            <p className="text-xs">Assign the chat</p>
          </div>
          <div className="flex flex-col gap-4">
            <TeamSelector label="Select Team" {...form.getInputProps("teamId")} />
            <RadioGroup {...form.getInputProps("choice")}>
              <div className="flex flex-wrap items-center gap-2.5">
                <Radio value={"all"} label={"All Members"} />
                <Radio value={"manual"} label={"Select Manually"} />
              </div>
            </RadioGroup>
            {form.values?.choice === "manual" && (
              <ContainedMultiSelect
                data={members}
                {...form.getInputProps("assignedUserIds")}
                label={"Select Members"}
                placeholder="click to select"
                searchable
              />
            )}
            <Switch
              label="Enable Round Robin Assignment"
              {...form.getInputProps("roundRobin", { type: "checkbox" })}
              description="Assign chats to team members in a round robin fashion"
            />
          </div>
        </>
      )}
    </div>
  );
};
