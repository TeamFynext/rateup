import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "@tanstack/react-router";
import { useCallback, useContext, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import { getUniqueRandomAlphaId } from "@/utils/misc/random.utils";
import {
  getNewScreenObj,
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "../EditFlow/EditFlowContext.ts";

interface FlowScreenFormValues {
  screenId: string;
  screenTitle: string;
  footerBtnLabel: string;
}

function getInitialValues(screens): FlowScreenFormValues {
  return {
    screenId: getUniqueRandomAlphaId(
      6,
      screens?.map(({ id }) => id),
    ),
    screenTitle: "",
    footerBtnLabel: "Next",
  };
}

interface CreateFlowScreenModalProps {
  opened: boolean;
  close: () => void;
  screenId?: string;
}

function CreateFlowScreenModal({
  opened,
  close,
  screenId = null,
}: Readonly<CreateFlowScreenModalProps>) {
  const { flowJson, updateFlowJson } = useContext(EditFlowContext);
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const { t: translations } = useTranslation();

  const schema = z.object({
    screenId: z
      .string()
      .min(1, translations("Screen Id is required"))
      .regex(/^[a-zA-Z,_]*$/, translations("Id should contain only alphabets and _")),
    screenTitle: z.string().min(1, translations("Screen Title is required")),
    footerBtnLabel: z.string().min(1, translations("Screen Title is required")),
  });

  const form = useForm<FlowScreenFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getInitialValues(flowJson.screens),
  });

  const handleCreate = useCallback(
    (values: FlowScreenFormValues) => {
      updateFlowJson((draft) => {
        if (!screenId) {
          draft.screens.push(getNewScreenObj(values));
          updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
        } else {
          const screenToBeEdited = getScreenObjById(draft.screens, screenId);
          screenToBeEdited["title"] = values.screenTitle;
        }
        form.reset(getInitialValues(draft.screens));
      });
      close();
    },
    [screenId, dbFlow, updateFlowJson, close, form],
  );

  useEffect(() => {
    if (screenId) {
      const screenToBeEdited = getScreenObjById(flowJson.screens, screenId);
      const layoutChildren = screenToBeEdited.layout["children"][0]["children"];
      const footerObj = layoutChildren[layoutChildren.length - 1];
      form.reset({
        screenId: screenToBeEdited.id,
        screenTitle: screenToBeEdited.title,
        footerBtnLabel: footerObj.label,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = form.handleSubmit(handleCreate);

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-medium">
            {screenId ? translations("Edit Screen") : translations("Create Screen")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, submit]])}>
          <FieldGroup>
            <Controller
              name="screenTitle"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Enter Screen Title")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <DialogFooter className="sm:justify-center">
              <Button type="submit">
                {screenId ? translations("Edit") : translations("Create")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateFlowScreenModal;
