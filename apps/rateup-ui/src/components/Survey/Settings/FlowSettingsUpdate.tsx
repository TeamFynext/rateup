import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useUpdateFlowMetaDataMutation } from "@/backend/whatsapp/flow/flow.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";

const FlowSettingsUpdate = ({
  name,
  dbFlowId,
  anonymous,
}: {
  name: string;
  dbFlowId: string;
  anonymous: boolean;
}) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const updateFlowMetaDataMutation = useUpdateFlowMetaDataMutation();

  const { register, watch, setValue, handleSubmit } = useForm({
    defaultValues: {
      name: name ?? "",
      anonymous: anonymous ?? false,
    },
  });

  const isAnonymous = watch("anonymous");

  const onSubmit = (data: { name: string; anonymous: boolean }) => {
    updateFlowMetaDataMutation.mutate({ data, dbFlowId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations("Flow Settings")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${uid}-field`}>
                {translations("Flow Name")} <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id={`${uid}-field`}
                placeholder={translations("Enter Flow name")}
                {...register("name", { required: true })}
              />
            </Field>
          </FieldGroup>

          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
            <Switch checked={isAnonymous} onCheckedChange={(v) => setValue("anonymous", v)} />
            <span className="text-sm font-medium">{translations("Anonymous")}</span>
            <div />
            <p className="text-xs text-muted-foreground">
              {isAnonymous
                ? translations("Anonymous Flow is enabled")
                : translations("Anonymous Flow is disabled")}
            </p>
          </div>

          <div className="flex justify-center">
            <Button type="submit" disabled={updateFlowMetaDataMutation.isPending}>
              {updateFlowMetaDataMutation.isPending && <Spinner data-icon="inline-start" />}
              {translations("Save Changes")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FlowSettingsUpdate;
