"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import _ from "lodash";

import {
  useUpdateFlowMutation,
  useWaFlowFromDb,
} from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader";

import ElementsList from "./ElementsList";
import WhatsAppPreview from "./Preview/WhatsAppPreview";
import ScreensList from "./ScreensList";
import useFlowStoreV3 from "./utils/store";
import styles from "./EditFlow.module.css";

interface EditFlowV3Props {
  previewOpened?: boolean;
  setPreviewOpened?: (opened: boolean) => void;
}

function EditFlowV3({ previewOpened = true, setPreviewOpened }: EditFlowV3Props = {}) {
  const params = useParams();
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
        const screenExists = getScreens().some(
          (screen) => screen.id === currentScreenId,
        );
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
      const screensChanged = !_.isEqual(dbFlow.json.screens, getScreens());
      const logicJumpsChanged = !_.isEqual(dbFlow.logicJumps, logicJumps);
      const ticketsChanged = ticketIssued && !_.isEqual(dbFlow.ticketIssued, ticketIssued);

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
    <div className={`${styles["edit-flow-container"]} ${!previewOpened ? styles["no-preview"] : ""}`}>
      {/* Column 1: Screens List */}
      <div className={styles["column-1"]}>
        <ScreensList />
      </div>

      {/* Column 2: Elements List with inline editing */}
      <div className={styles["column-2"]}>
        <ElementsList />
      </div>

      {/* Column 3: WhatsApp Preview */}
      {previewOpened && (
        <div className={styles["column-3"]}>
          <WhatsAppPreview />
        </div>
      )}
    </div>
  );
}

export default EditFlowV3;
