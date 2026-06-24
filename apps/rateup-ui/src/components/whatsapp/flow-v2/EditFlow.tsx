import { useParams } from "@tanstack/react-router";
import { isEqual } from "lodash";
import { useEffect } from "react";

import { useUpdateFlowMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

import ElementsList from "./ElementsList/index.tsx";
import WhatsAppPreview from "./Preview/WhatsAppPreview.tsx";
import ScreensList from "./ScreensList/index.tsx";
import useFlowStoreV3 from "./utils/store.ts";

interface EditFlowV3Props {
  previewOpened?: boolean;
  setPreviewOpened?: (opened: boolean) => void;
}

function EditFlowV3({ previewOpened = true, setPreviewOpened }: EditFlowV3Props = {}) {
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;

  const { data: dbFlow, isPending } = useWaFlowFromDb(dbFlowId);
  const {
    getScreens,
    screens,
    addScreens,
    setCurrentScreenId,
    currentScreenId,
    setTicketIssued,
    ticketIssued,
    logicJumps,
    setAllLogicJumps,
  } = useFlowStoreV3();
  const updateFlow = useUpdateFlowMutation();

  // Initialize screens from DB
  useEffect(() => {
    if (dbFlow) {
      // Normalize elements to ensure they have metaType
      const normalizedScreens = (dbFlow.json.screens || []).map((screen: any) => ({
        ...screen,
        layout: {
          ...screen.layout,
          children: (screen.layout.children || []).map((element: any) => ({
            ...element,
            // Ensure metaType is set, fallback to type if missing
            metaType: element.metaType || element.type,
          })),
        },
      }));

      addScreens(normalizedScreens as any);
      if (currentScreenId) {
        const screenExists = getScreens().some((screen) => screen.id === currentScreenId);
        if (!screenExists) {
          setCurrentScreenId(normalizedScreens?.[0]?.id);
        }
      } else {
        setCurrentScreenId(normalizedScreens?.[0]?.id);
      }
    }
  }, [dbFlow?.dbFlowId]);

  // Initialize ticket data
  useEffect(() => {
    if (dbFlow?.ticketIssued) {
      setTicketIssued(dbFlow.ticketIssued);
    }
  }, [dbFlow?.ticketIssued]);

  // Initialize logic jumps
  useEffect(() => {
    if (dbFlow?.logicJumps) {
      setAllLogicJumps(dbFlow.logicJumps);
    }
  }, [dbFlow?.logicJumps]);

  // Auto-save when screens or logic jumps change
  useEffect(() => {
    if (!isPending && dbFlow && screens.length > 0) {
      // Deep comparison to avoid unnecessary saves
      const screensChanged = !isEqual(dbFlow.json.screens, getScreens());
      const logicJumpsChanged = !isEqual(dbFlow.logicJumps, logicJumps);
      const ticketsChanged = ticketIssued && !isEqual(dbFlow.ticketIssued, ticketIssued);

      if (screensChanged || logicJumpsChanged || ticketsChanged) {
        const timeoutId = setTimeout(() => {
          updateFlow.mutate({
            dbFlowId,
            data: {
              json: {
                screens: getScreens() as any,
                version: "7.2",
              },
              logicJumps: logicJumpsChanged ? logicJumps : undefined,
              ticketIssued: ticketsChanged ? ticketIssued : undefined,
            },
          });
        }, 1000); // Debounce for 1 second

        return () => clearTimeout(timeoutId);
      }
    }
  }, [dbFlowId, screens, logicJumps, isPending, ticketIssued]);

  if (isPending) return <RateupLoader />;

  return (
    <div
      className="grid h-full overflow-hidden relative"
      style={{
        gridTemplateColumns: previewOpened ? "280px 1fr 400px" : "280px 1fr",
      }}
    >
      {/* Column 1: Screens List */}
      <div className="border-r border-border overflow-y-auto">
        <ScreensList />
      </div>

      {/* Column 2: Elements List with inline editing */}
      <div className="border-r border-border overflow-y-auto">
        <ElementsList />
      </div>

      {/* Column 3: WhatsApp Preview */}
      {previewOpened && (
        <div className="overflow-y-auto">
          <WhatsAppPreview />
        </div>
      )}
    </div>
  );
}

export default EditFlowV3;
