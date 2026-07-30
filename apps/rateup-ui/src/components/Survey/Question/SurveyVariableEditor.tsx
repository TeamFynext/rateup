import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useContext, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import {
  useCreateSurveyVariableMutation,
  useDeleteSurveyVariableMutation,
  useUpdateSurveyVariableMutation,
} from "@/backend/surveys/surveys.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import SurveyContext from "@/context/SurveyContext.ts";
import { SurveyVariableType } from "@/types/enums.ts";

import { QuestionTabsEnum } from "../EditSurvey.tsx";

const SurveyVariableEditor = ({
  setActiveTab,
}: {
  setActiveTab: (tab: QuestionTabsEnum) => void;
}) => {
  const { variables, surveyId } = useContext(SurveyContext);
  const [openedCreateVariable, setOpenedCreateVariable] = useState(false);
  const [openedEditVariable, setOpenedEditVariable] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<SurveyVariable | null>(null);
  const deleteVariable = useDeleteSurveyVariableMutation(surveyId);

  const handleDeleteVariable = (variable: SurveyVariable) => {
    deleteVariable.mutate({ variableId: variable.id });
  };
  const { t: translations } = useTranslation();
  return (
    <div className="flex w-full flex-col gap-4">
      <ScrollArea className="h-[430px]">
        <div className="flex flex-col gap-3 p-3">
          <Card className="p-3">
            <h5 className="text-sm font-semibold">{translations("Default Variables")}</h5>
            <div className="flex flex-wrap items-center gap-2.5 pt-3">
              {variables
                ?.filter((variable) => variable?.type === SurveyVariableType.DEFAULT)
                .map((variable) => (
                  <Input key={variable?.id} readOnly value={variable?.name} />
                ))}
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">{translations("Custom Variables")}</h5>
              <Button variant="outline" onClick={() => setOpenedCreateVariable(true)}>
                <IconPlus data-icon="inline-start" />
                {translations("Add Variable")}
              </Button>
            </div>
            <div className="flex flex-col gap-2.5 pt-3">
              {variables
                ?.filter((variable) => variable?.type === SurveyVariableType.CUSTOM)
                .map((variable) => (
                  <div key={variable?.id} className="flex items-center gap-2">
                    <Input readOnly value={variable?.name} />
                    <Input readOnly value={variable?.value} />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setSelectedVariable(variable);
                        setOpenedEditVariable(true);
                      }}
                    >
                      <IconEdit />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteVariable(variable)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
          {translations("Cancel")}
        </Button>
      </div>
      <CreateSurveyVariableModal
        opened={openedCreateVariable}
        close={() => setOpenedCreateVariable(false)}
      />
      <CreateSurveyVariableModal
        opened={openedEditVariable}
        close={() => setOpenedEditVariable(false)}
        variable={selectedVariable}
        isEdit
      />
    </div>
  );
};

interface ICreateVariableProps {
  opened: boolean;
  close: () => void;
  variable?: SurveyVariable;
  isEdit?: boolean;
}

interface VariableFormValues {
  name: string;
  value: string;
}

const CreateSurveyVariableModal = ({ opened, close, variable, isEdit }: ICreateVariableProps) => {
  const { surveyId, variables } = useContext(SurveyContext);
  const variableCreation = useCreateSurveyVariableMutation(surveyId);
  const variableUpdation = useUpdateSurveyVariableMutation(surveyId);
  const { t: translations } = useTranslation();

  const variableSchema = z.object({
    name: z
      .string()
      .regex(
        /^[a-zA-Z0-9_]+$/,
        translations("Variable name can only have letters, numbers and underscore"),
      ),
    value: z.string().min(1, translations("Assign a value to variable")),
  });

  const { control, handleSubmit, reset, setError, setValue } = useForm<VariableFormValues>({
    resolver: zodResolver(variableSchema),
    defaultValues: {
      name: variable?.name || "",
      value: variable?.value || "",
    },
  });

  const isPending = isEdit ? variableUpdation.isPending : variableCreation.isPending;

  const onCreate = async (values: VariableFormValues) => {
    if (variables?.find((v) => v?.name == values.name)) {
      setError("name", { message: translations("Variable already exist") });
      return;
    }
    const data = { ...values, type: SurveyVariableType.CUSTOM };
    variableCreation.mutate(
      { surveyId, data },
      {
        onSuccess: () => {
          reset();
          close();
        },
        onError: () => {
          reset();
        },
      },
    );
  };

  const onUpdate = async (values: VariableFormValues) => {
    if (variables?.find((v) => v?.name == values.name) && variable?.name !== values.name) {
      setError("name", { message: translations("Variable already exist") });
      return;
    }
    variableUpdation.mutate(
      { variableId: variable?.id, data: values },
      {
        onSuccess: () => {
          reset();
          close();
        },
        onError: () => {
          reset();
        },
      },
    );
  };

  const onSubmit = isEdit ? onUpdate : onCreate;

  useEffect(() => {
    setValue("name", variable?.name || "");
    setValue("value", variable?.value || "");
  }, [variable]);

  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          close();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? translations("Update Variable") : translations("Create Variable")}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
            if (isSave) {
              e.preventDefault();
              handleSubmit(onSubmit)();
            }
          }}
        >
          <div className="flex flex-col gap-4">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("Name")}</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="value"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("Value")}</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                close();
              }}
            >
              {translations("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-start" />}
              {isEdit ? translations("Update") : translations("Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SurveyVariableEditor;
