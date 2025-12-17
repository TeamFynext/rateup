import React from "react";

import { PlusIcon, Trash2Icon, TrashIcon } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
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
  const { data } = useAllWaAutomatedReplies();
  const { data: labelsData } = useContactLabels();
  const { data: lifecyclesData } = useLifeCyclesQuery();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { data: teamsData } = useTeamsByUser();
  const { data: templatesData } = useWaTemplates();
  const { data: flowsData } = useWaFlowsFromDb();
  const actionType = useWatch({
    control,
    name: `actions.${index}.type`,
  }) as ActionType;

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
  // if (actionType === "SEND_TEMPLATE") {
  //   return (
  //     <Select
  //       onValueChange={valueField.onChange}
  //       value={valueField.value || ""}
  //     >
  //       <SelectTrigger className="w-full bg-background">
  //         <SelectValue placeholder="Select template" />
  //       </SelectTrigger>
  //       <SelectContent>
  //         {templatesData?.map((t) => (
  //           <SelectItem key={t.id} value={t.id}>
  //             {t?.data?.name}
  //           </SelectItem>
  //         ))}
  //       </SelectContent>
  //     </Select>
  //   );
  // }
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
          {data?.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-primary rounded-full"></div>
          <h2 className="font-semibold text-lg ">Actions</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ type: "TRIGGER_CHATBOT", value: "" })}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
        >
          <PlusIcon className="w-4 h-4" /> Add Action
        </Button>
      </div>

      <Card className="bg-secondary/10 p-3">
        {fields.length === 0 && (
          <div className="text-gray-400 text-sm italic">No actions added.</div>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-center">
            <FormField
              control={control}
              name={`actions.${index}.type`}
              render={({ field }) => (
                <FormItem className="w-full">
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      setValue(`actions.${index}.value`, "");
                    }}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Action Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTION_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`actions.${index}.value`}
              render={({ field: valueField }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <ActionValueInput index={index} valueField={valueField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              title="Delete Action"
              className="text-gray-400 hover:text-red-500 h-10 w-10"
            >
              <Trash2Icon className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </Card>
      {errors.actions?.root?.message && (
        <p className="text-sm font-medium text-destructive mt-2">
          {errors.actions?.root?.message}
        </p>
      )}
    </div>
  );
};

export default ActionList;
