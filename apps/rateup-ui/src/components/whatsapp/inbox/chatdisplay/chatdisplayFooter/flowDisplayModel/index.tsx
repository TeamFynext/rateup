import { IconSend } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSendFlowToUser, useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { RadioGroup } from "@/components/ui/radio-group.tsx";
import { WaFlowStatus } from "@/types/enums.ts";

import NothingFound from "../../../../../NothingFound/NothingFound.tsx";
import { usePhoneIdStore } from "../../../chatselect/accountSelectorStore.ts";
import WaInboxFlowSelectCard from "./flowSelectCard/index.tsx";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData;
  opened: boolean;
  close: () => void;
}

export default function WaInboxFlowDisplayModal(props: Props) {
  const [selectedDbFlowId, setSelectedDbFlowId] = useState<string>("");
  const { data, isLoading, error } = useWaFlowsFromDb();
  const [teamId, setTeamId] = useState(null);
  const sendFlowToUser = useSendFlowToUser(props?.contact?.phone);
  const { whatsappSettingsPhoneId } = usePhoneIdStore();

  const { t: translations } = useTranslation();
  function onClose() {
    setSelectedDbFlowId("");
    props?.close();
  }
  function handleSendFlow() {
    sendFlowToUser.mutate(
      {
        dbFlowId: selectedDbFlowId,
        teamId,
        flowId: data?.find((f) => f.dbFlowId === selectedDbFlowId)?.flowId,
        whatsappSettingsPhoneId,
      },
      {
        onSuccess: () => {
          setSelectedDbFlowId("");
          onClose();
        },
      },
    );
  }
  const acceptedFlows = data?.filter((flow) => flow?.status === WaFlowStatus.PUBLISHED);
  return (
    <Dialog
      open={props?.opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] w-full overflow-auto sm:max-w-125">
        <DialogHeader className="items-center">
          <DialogTitle className="text-2xl font-bold">Send Flow</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Badge variant="destructive">{translations("Error")}</Badge>
          </div>
        )}
        {data && acceptedFlows?.length > 0 ? (
          <>
            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto p-1">
              <TeamSelector
                label="Select Team"
                placeholder="Select a team of the flow"
                onChange={setTeamId}
                value={teamId}
              />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Select a Flow
              </h4>
              <RadioGroup value={selectedDbFlowId} onValueChange={setSelectedDbFlowId}>
                <div className="flex flex-col gap-2">
                  {acceptedFlows?.map((flow) => (
                    <WaInboxFlowSelectCard
                      key={flow.dbFlowId}
                      {...flow}
                      selected={selectedDbFlowId === flow.dbFlowId}
                    />
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-end pt-4 border-t border-border mt-4">
              <Button
                disabled={!selectedDbFlowId || sendFlowToUser.isPending}
                onClick={handleSendFlow}
              >
                {sendFlowToUser.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                <span>{translations("Send")}</span>
                {!sendFlowToUser.isPending && <IconSend className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          !isLoading && (
            <NothingFound
              text={translations(
                "No flows found, If you already have a flow, check if its PUBLISHED",
              )}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
