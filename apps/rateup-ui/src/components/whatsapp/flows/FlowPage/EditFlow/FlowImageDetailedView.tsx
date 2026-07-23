import { IconDeviceSdCard } from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { getWaFlowFormElementTypeLabel } from "@/utils/enums/index.ts";
import { fileToBase64 } from "@/utils/misc/base64.utils";
import { getFlowFormElementById, getFormObjFromScreenId } from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext.ts";

export function FlowImageDetailedView() {
  const { selectedFormElementId, flowJson, updateFlowJson, selectedScreenId } =
    useContext(EditFlowContext);
  const selectedFormElement = getFlowFormElementById(selectedFormElementId, flowJson);

  const form = useForm<any>({
    defaultValues: {
      type: selectedFormElement.type,
      id: selectedFormElement.id,
      "scale-type": "cover",
      src: "",
      height: selectedFormElement.height || 200,
      width: selectedFormElement.width || 300,
    },
  });
  const { t: translations } = useTranslation();

  // TODO: figure out why this can't be set in defaultValues above
  useEffect(() => {
    if (!form.getValues("src")) {
      form.setValue("src", selectedFormElement.src);
      form.setValue("height", selectedFormElement.height || 200);
      form.setValue("width", selectedFormElement.width || 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormElement]);

  function handleChange(updatedData: any) {
    Object.entries(updatedData).forEach(([key, value]) => form.setValue(key, value));
  }
  function handleSaveElement() {
    if (!form.getValues("src")?.length) return toast.error(translations("Unable to Save Image"));
    const flowForm = getFormObjFromScreenId(flowJson.screens, selectedScreenId);
    const index = flowForm.children.findIndex((fe) => fe === selectedFormElement);
    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, selectedScreenId);
      formEl.children[index] = form.getValues() as any;
    });
  }

  const height = form.watch("height");
  const width = form.watch("width");
  const src = form.watch("src");

  return (
    <div className="relative flex h-full flex-col justify-between">
      <ScrollArea className="max-h-[65dvh]">
        <div className="flex justify-between">
          <Badge variant="outline" className="text-muted-foreground">
            {getWaFlowFormElementTypeLabel(selectedFormElement.type)}
          </Badge>
        </div>
        <div className="flex gap-0.5 p-0.5 pr-10">
          <div className="flex flex-1 flex-col gap-2 overflow-x-clip overflow-y-auto p-3">
            <FlowImageElementEditor
              onChange={handleChange}
              height={height}
              width={width}
              src={src}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex flex-col gap-3">
        <Separator />
        <div className="flex items-center justify-end p-2 px-3">
          <Button size="lg" onClick={handleSaveElement}>
            <IconDeviceSdCard />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// currently not allowing user to edit width
function FlowImageElementEditor({ onChange, src, height, width }) {
  const [file, setFile] = useState<File | null>(null);
  const [base64, setBase64] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (base64) onChange({ src: base64.split(",")[1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base64]);

  useEffect(() => {
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error(translations("Size must be under 300kb"));
      return;
    }

    (async () => {
      const base64 = await fileToBase64(file);
      setBase64(base64);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" className="w-fit" onClick={() => inputRef.current?.click()}>
        {file ? translations("Change Image") : translations("Upload image")}
      </Button>
      {src && (
        <>
          <img
            src={`data:image/jpg;base64,${src}`}
            style={{ height, width: width - 100, maxHeight: height }}
            alt="flow Image"
          />
          <div className="flex flex-col gap-1">
            <Label>{translations("Width")}</Label>
            <Input
              type="number"
              min={100}
              max={400}
              value={width}
              onChange={(e) => onChange({ width: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{translations("Height")}</Label>
            <Input
              type="number"
              min={100}
              max={600}
              value={height}
              onChange={(e) => onChange({ height: Number(e.target.value) })}
            />
          </div>
        </>
      )}
    </div>
  );
}
