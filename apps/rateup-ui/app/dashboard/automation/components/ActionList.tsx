import React, { useMemo } from "react";

import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useAllSurveysSummary } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ACTION_TYPES, ActionType, CreateRuleInput } from "./schema";

const ActionValueInput = ({
  index,
  valueField,
}: {
  index: number;
  valueField: any;
}) => {
  const { control } = useFormContext<CreateRuleInput>();
  const { data: waData } = useAllWaAutomatedReplies();
  const { data: igData } = useAllInstagramAutomations();
  const { data: labelsData } = useContactLabels();
  const { data: lifecyclesData } = useLifeCyclesQuery();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { data: teamsData } = useTeamsByUser();
  const { data: flowsData } = useWaFlowsFromDb();
  const { data: surveysSummary } = useAllSurveysSummary();

  // Combine both WhatsApp and Instagram automations
  const allAutomations = useMemo(() => {
    return [...(waData || []), ...(igData || [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [waData, igData]);

  const webSurveyOptions = useMemo(() => {
    if (!surveysSummary?.surveys?.length) return [];

    return surveysSummary.surveys
      ?.filter((survey) => survey?.type === "web")
      .flatMap((survey) =>
        (survey.teams || []).map((team) => ({
          value: team.mapId,
          label: `${survey.title} (${team.teamName})`,
        })),
      );
  }, [surveysSummary]);

  const actionType: ActionType = useWatch({
    control,
    name: `actions.${index}.type`,
  });

  if (actionType === "SEND_MESSAGE") {
    return (
      <Input
        placeholder="Message text"
        {...valueField}
        value={valueField.value || ""}
        className="w-full bg-background"
      />
    );
  }
  if (actionType === "ATTACH_LABEL") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select label" />
        </SelectTrigger>
        <SelectContent>
          {labelsData.map((l) => (
            <SelectItem key={l?.id} value={l?.id}>
              {l?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "ASSIGN_USER") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {teamMembers?.data?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "ASSIGN_TEAM") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          {teamsData?.data?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "SEND_FLOW") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select flow" />
        </SelectTrigger>
        <SelectContent>
          {flowsData?.map((t) => (
            <SelectItem key={t.dbFlowId} value={t.dbFlowId}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "TRIGGER_CHATBOT") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select automation" />
        </SelectTrigger>
        <SelectContent>
          {allAutomations?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "SEND_WEB_SURVEY") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select web survey" />
        </SelectTrigger>
        <SelectContent>
          {webSurveyOptions.map((survey) => (
            <SelectItem key={survey.value} value={survey.value}>
              {survey.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (actionType === "CALL_EXTERNAL_API") {
    return (
      <Input
        type="url"
        placeholder="https://example.com/webhook"
        {...valueField}
        value={valueField.value || ""}
        className="w-full bg-background"
      />
    );
  }
  if (actionType === "ASSIGN_LIFECYCLE") {
    return (
      <Select
        onValueChange={valueField.onChange}
        value={valueField.value || ""}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select lifecycle" />
        </SelectTrigger>
        <SelectContent>
          {lifecyclesData?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input placeholder="Value" {...valueField} value={valueField.value || ""} />
  );
};

const ActionList: React.FC = () => {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CreateRuleInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "actions",
  });

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <div className="text-muted-foreground text-sm italic p-4 text-center bg-muted/50 rounded-lg border border-dashed">
          No actions added.
        </div>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex gap-3 items-center p-4 bg-white dark:bg-card rounded-lg border border-border"
        >
          <Controller
            control={control}
            name={`actions.${index}.type`}
            render={({ field, fieldState }) => (
              <Field className="flex-1" data-invalid={fieldState.invalid}>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue(`actions.${index}.value`, "");
                  }}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name={`actions.${index}.value`}
            render={({ field: valueField, fieldState }) => (
              <Field className="flex-1" data-invalid={fieldState.invalid}>
                <ActionValueInput index={index} valueField={valueField} />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            title="Delete Action"
            className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 h-10 w-10"
          >
            <Trash2Icon className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30"
        onClick={() => append({ type: "TRIGGER_CHATBOT", value: "" })}
      >
        <PlusIcon className="w-4 h-4 mr-2" /> Add action
      </Button>

      {errors.actions?.root?.message && (
        <p className="text-sm font-medium text-destructive mt-2">
          {errors.actions?.root?.message}
        </p>
      )}
    </div>
  );
};

export default ActionList;
