// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { useMemo, useState } from "react";

import type { Board, Column } from "@/components/Tickets/types.ts";

import { Select } from "../editor-ui.tsx";
import { useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// TicketNode Component
export const TicketNodeEditor: React.FC<
  NodeComponentProps<"ticketNode"> & { options?: Board[] }
> = ({ nodeData, handleInputChange, options }) => {
  const typedData = nodeData;
  const ticketError = useFieldError("ticket");
  const [selectedBoard, setSelectedBoard] = useState<{
    selectedBoardId?: string;
    selectedBoardColumnId?: string;
  }>({
    selectedBoardId: typedData.ticket?.selectedBoardId,
    selectedBoardColumnId: typedData.ticket?.selectedBoardColumnId,
  });

  // Transform boards for Select component
  const boards = useMemo(
    () => options?.map((board: Board) => ({ value: board.id, label: board.title })),
    [],
  );

  // Get columns for selected board
  const columns = useMemo(() => {
    const board = options?.find((board: Board) => board.id === selectedBoard?.selectedBoardId);
    return board
      ? board.ticketColumns.map((col: Column) => ({
          value: col.id,
          label: col.title,
        }))
      : [];
  }, [options, selectedBoard?.selectedBoardId]);

  return (
    <div className="flex flex-col gap-2">
      <Select
        label="Select Board"
        placeholder="Choose a board"
        value={typedData.ticket?.selectedBoardId}
        data={boards}
        onChange={(boardId, values) => {
          setSelectedBoard({
            selectedBoardId: boardId,
            selectedBoardColumnId: typeof values?.label === "string" ? values.label : undefined,
          });
        }}
      />
      {selectedBoard && (
        <Select
          label="Select Column"
          placeholder="Choose a column"
          value={typedData.ticket?.selectedBoardColumnId}
          data={columns}
          onChange={(columnId, values) => {
            handleInputChange("ticket", {
              selectedBoardId: selectedBoard?.selectedBoardId,
              selectedBoardName: selectedBoard?.selectedBoardColumnId,
              selectedBoardColumnId: columnId,
              selectedBoardColumnName: values?.label,
            });
          }}
          error={ticketError}
        />
      )}
    </div>
  );
};
