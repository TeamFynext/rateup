"use client";

import { useCallback, useContext, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { useForm } from "@mantine/form";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import { useWaFlowFromDb } from "../../../../../backend/whatsapp/flow/flow.query";
import { getUniqueRandomAlphaId } from "../../../../../utils/misc/random.utils";
import {
  getNewScreenObj,
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "../../../../../utils/whatsapp/flow.utils";
import { ContainedTextField } from "../../../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../../../Modal/FormModalLayout";
import { EditFlowContext } from "../EditFlow/EditFlowContext";

function getInitialValues(screens) {
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
  const params = useParams();
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const translations = useExtracted();
  const form = useForm({
    initialValues: getInitialValues(flowJson.screens),
    validate: {
      screenId: (value) => {
        if (!/^[a-zA-Z,_]*$/.test(value)) {
          toast.error(
            translations(
              "Error Occured. Please report this bug to the developer. code: #flowsidval",
            ),
          );
          return "Id should contain only alphabets and _";
        } else if (value === "") {
          return translations("Screen Id is required");
        } else {
          return null;
        }
      },
      screenTitle: (value) => {
        if (value === "") return translations("Screen Title is required");
        else return null;
      },
      footerBtnLabel: (value) => {
        if (value === "") return translations("Screen Title is required");
        else return null;
      },
    },
  });

  const handleCreate = useCallback((values) => {
    updateFlowJson((draft) => {
      if (!screenId) {
        draft.screens.push(getNewScreenObj(values));
        updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
      } else {
        const screenToBeEdited = getScreenObjById(draft.screens, screenId);
        screenToBeEdited["title"] = values.screenTitle;
      }
      form.setValues(getInitialValues(draft.screens));
    });
    close();
  }, []);

  useEffect(() => {
    if (screenId) {
      const screenToBeEdited = getScreenObjById(flowJson.screens, screenId);
      const layoutChildren = screenToBeEdited.layout["children"][0]["children"];
      const footerObj = layoutChildren[layoutChildren.length - 1];
      form.setValues({
        screenId: screenToBeEdited.id,
        screenTitle: screenToBeEdited.title,
        footerBtnLabel: footerObj.label,
      });
    }
  }, []);

  return (
    <FormModalLayout
      opened={opened}
      title={
        screenId ? translations("Edit Screen") : translations("Create Screen")
      }
      onClose={close}
      centered
      onSubmit={form.onSubmit(handleCreate)}
      buttonTitle={screenId ? translations("Edit") : translations("Create")}
    >
      <ContainedTextField
        placeholder={translations("Enter Screen Title")}
        {...form.getInputProps("screenTitle")}
      />
    </FormModalLayout>
  );
}

export default CreateFlowScreenModal;
