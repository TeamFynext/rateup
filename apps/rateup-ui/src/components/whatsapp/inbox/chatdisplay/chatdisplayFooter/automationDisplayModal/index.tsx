import { IconSend } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAllWaAutomatedReplies,
  useInitiateWaAutomatedReplyMutation,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils.ts";

interface Props {
  sessionExpired: boolean;
  opened: boolean;
  close: () => void;
  contact: ContactsData | null;
}

export default function WaInboxAutomationDisplayModal(props: Props) {
  const [selectedAutomationId, setSelectedAutomationId] = useState<string>("");
  const { data: automations, isLoading, error } = useAllWaAutomatedReplies();
  const initiate = useInitiateWaAutomatedReplyMutation(selectedAutomationId);
  function onClose() {
    setSelectedAutomationId("");
    props?.close();
  }
  const { t: translations } = useTranslation();
  function handleSendAutomatedReply() {
    initiate.mutate(
      { phone: props?.contact?.phone ?? "" },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={props?.opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-full overflow-auto sm:max-w-125">
        <DialogHeader className="items-center">
          <DialogTitle className="text-2xl font-bold">Initiate Automation</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Badge variant="destructive">error</Badge>
          </div>
        )}
        {automations && automations?.length > 0 ? (
          <>
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto p-1">
              <FieldSet>
                <FieldLegend
                  variant="label"
                  className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Select an automation
                </FieldLegend>
                <RadioGroup value={selectedAutomationId} onValueChange={setSelectedAutomationId}>
                  {automations?.map((automation) => (
                    <FieldLabel
                      key={automation?.id}
                      htmlFor={automation?.id}
                      className={cn(
                        "flex-row items-center justify-between p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50",
                        selectedAutomationId === automation?.id
                          ? "border-primary bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <RadioGroupItem value={automation?.id} id={automation?.id} />
                        <span className="text-xs font-medium select-none">{automation?.name}</span>
                      </div>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </FieldSet>
            </div>
            <div className="flex justify-end pt-4 border-t border-border mt-4">
              <Button
                disabled={!selectedAutomationId || initiate.isPending}
                onClick={handleSendAutomatedReply}
              >
                {initiate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                <span>{translations("Send")}</span>
                {!initiate.isPending && <IconSend className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          !isLoading && <NothingFound text={"No Automations found"} />
        )}
      </DialogContent>
    </Dialog>
  );
}
