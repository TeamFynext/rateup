import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { IUpdateTicketRequest, IUpdateTicketStatusRequest } from "./tickets";
import type { Board } from "./tickets.api";
import {
  createBoard,
  createCard,
  createColumn,
  createComment,
  createLabel,
  createTicket,
  deleteBoard,
  deleteCard,
  deleteColumn,
  deleteComment,
  deleteLabel,
  deleteLabels,
  deleteTicket,
  fetchBoard,
  fetchBoards,
  fetchBoardTeamMemberById,
  fetchCardById,
  fetchCardTeamMemberById,
  fetchLabels,
  getTicket,
  getTickets,
  moveCard,
  moveColumnToBoard,
  reorderCard,
  reorderColumns,
  updateBoard,
  updateCard,
  updateColumn,
  updateLabel,
  updateTicket,
  updateTicketStatus,
} from "./tickets.api";

// get all tickets
export const useTickets = () =>
  useQuery({
    enabled: true,
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

// create ticket
export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      toast.success("Ticket Created...!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["allresponses"] });
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) => {
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
};

// get single ticket
export const useTicket = (id: string) =>
  useQuery({
    enabled: !!id,
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id),
  });

// update ticket status
export const useUpdateTicketStatusMutation = (ticketId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateTicketStatusRequest) => {
      const { id, ...rest } = data;
      const selectedTicketId = ticketId ?? id;
      return updateTicketStatus(selectedTicketId, rest);
    },
    onSuccess: () => {
      toast.success("Ticket Status Updated...!", {
        id: "update-status",
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (error) => {
      toast.error(error?.message, {
        id: "update-status",
      });
    },
  });
};

// update ticket
export const useUpdateTicketMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateTicketRequest) => {
      return updateTicket(id, data);
    },
    onSuccess: () => {
      toast.success("Ticket Updated...!", {
        id: "update-ticket",
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (error) => {
      toast.error(error?.message, {
        id: "update-ticket",
      });
    },
  });
};

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTicket(id),
    onSuccess: (_response) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["allresponses"] });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      toast.success("Deleted Ticket successfully", {
        id: "load-data",
      });
    },
    onError: (error) => {
      console.error("Error Deleting", error.message);
      toast.error(error.message, {
        id: "load-data",
      });
    },
  });
}

// create ticket comment
export const useCreateCommentMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      toast.success("Comment created successfully!", {
        id: "create-comment-success",
      });
      queryClient.invalidateQueries({ queryKey: ["card", id] });
    },
    onError: (error) => {
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
};

export function useBoardsQueries(enabled = true) {
  return useQuery({
    queryKey: ["boards"],
    queryFn: () => fetchBoards(),
    enabled,
  });
}
export function useUpdateBoardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["notification"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
      toast.success("Board updated successfully!", {
        id: "update-board-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update board.", {
        id: "update-board-error",
      });
    },
  });
}

export function useBoardQueries(enabled = true) {
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ["boards"],
    queryFn: () => fetchBoards(),
    enabled,
  });

  const createBoardMutation = useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board created successfully!", {
        id: "create-board-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create board.", {
        id: "create-board-error",
      });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: updateBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board updated successfully!", {
        id: "update-board-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update board.", {
        id: "update-board-error",
      });
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted successfully!", {
        id: "delete-board-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete board.", {
        id: "delete-board-error",
      });
    },
  });

  return {
    boards: boardsQuery.data || [],
    isLoading: boardsQuery.isLoading,
    error: boardsQuery.error,
    createBoard: createBoardMutation.mutate,
    updateBoard: updateBoardMutation.mutate,
    deleteBoard: deleteBoardMutation.mutate,
  };
}
export const useUpdateCardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      toast.success("Ticket updated successfully!", {
        id: "update-ticket-success",
      });
      queryClient.invalidateQueries({ queryKey: ["card"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
};

export function useBoard(boardId: string) {
  const queryClient = useQueryClient();

  const boardQuery = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => fetchBoard(boardId),
    enabled: !!boardId,
  });

  const createColumnMutation = useMutation({
    mutationFn: createColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Column created successfully!", {
        id: "create-column-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create column.", {
        id: "create-column-error",
      });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: updateColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Column updated successfully!", {
        id: "update-column-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update column.", {
        id: "update-column-error",
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Column deleted successfully!", {
        id: "delete-column-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete column.", {
        id: "delete-column-error",
      });
    },
  });

  const moveColumnMutation = useMutation({
    mutationFn: moveColumnToBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Column moved successfully!", {
        id: "move-column-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to move column.", {
        id: "move-column-error",
      });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Card created successfully!", {
        id: "create-card-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create card.", {
        id: "create-card-error",
      });
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Card updated successfully!", {
        id: "update-card-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update card.", {
        id: "update-card-error",
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Card deleted successfully!", {
        id: "delete-card-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete card.", {
        id: "delete-card-error",
      });
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: moveCard,
    // Add optimistic update
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous board state
      const previousBoard = queryClient.getQueryData<Board>(["board", boardId]);

      if (previousBoard) {
        // Create a copy of the board to make optimistic updates
        const optimisticBoard = JSON.parse(JSON.stringify(previousBoard)) as Board;

        // Find source and target columns
        const sourceColumnIndex = optimisticBoard.ticketColumns.findIndex(
          (col) => col.id === params.sourceColumnId,
        );
        const targetColumnIndex = optimisticBoard.ticketColumns.findIndex(
          (col) => col.id === params.targetColumnId,
        );

        if (sourceColumnIndex >= 0 && targetColumnIndex >= 0) {
          // Find the card to move

          const cardIndex = optimisticBoard.ticketColumns[sourceColumnIndex].ticketCards.findIndex(
            (card) => card.id === params.cardId,
          );

          if (cardIndex >= 0) {
            // Get the card
            const card = optimisticBoard.ticketColumns[sourceColumnIndex].ticketCards[cardIndex];

            // Create an updated version with movement activity
            const updatedCard = {
              ...card,
              activities: [
                ...(card.ticketActivities || []),
                {
                  id: `temp-${Date.now()}`,
                  type: "MOVED_CARD",
                  user: "you",
                  timestamp: new Date(),
                  details: {
                    columnName: optimisticBoard.ticketColumns[targetColumnIndex].title,
                    sourceColumnName: optimisticBoard.ticketColumns[sourceColumnIndex].title,
                  },
                },
              ],
            };

            // Remove from source
            optimisticBoard.ticketColumns[sourceColumnIndex].ticketCards.splice(cardIndex, 1);

            // Add to target
            optimisticBoard.ticketColumns[targetColumnIndex].ticketCards.push(updatedCard);

            // Update the query cache with our optimistic board
            queryClient.setQueryData(["board", boardId], optimisticBoard);
          }
        }
      }

      return { previousBoard };
    },
    // If the mutation fails, restore the previous board state
    onError: (error, __, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
        toast.error(error?.message || "Failed to move card.", {
          id: "move-card-error",
        });
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Card moved successfully!", {
        id: "move-card-success",
      });
    },
  });

  const reorderCardMutation = useMutation({
    mutationFn: reorderCard,
    // Update optimistic update for reordering
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous board state
      const previousBoard = queryClient.getQueryData<Board>(["board", boardId]);

      if (previousBoard) {
        // Create a copy of the board to make optimistic updates
        const optimisticBoard = JSON.parse(JSON.stringify(previousBoard)) as Board;

        // Find column
        const columnIndex = optimisticBoard.ticketColumns.findIndex(
          (col) => col.id === params.columnId,
        );

        if (columnIndex >= 0) {
          const column = optimisticBoard.ticketColumns[columnIndex];
          // Create a new cards array in the order specified by the params
          const orderedCards = params.cards.map((cardOrder) => {
            // Find the card in the original cards array
            const card = column.ticketCards.find((c) => c.id === cardOrder.id);
            return card; // Using ! because we know the card exists
          });

          // Replace the column's cards with the ordered cards
          column.ticketCards = orderedCards;

          // Update the query cache with optimistic update
          queryClient.setQueryData(["board", boardId], optimisticBoard);
        }
      }

      return { previousBoard };
    },
    // If the mutation fails, restore the previous board state
    onError: (error, __, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
        toast.error(error?.message || "Failed to reorder cards.", {
          id: "reorder-card-error",
        });
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Cards reordered successfully!", {
        id: "reorder-card-success",
      });
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: reorderColumns,
    // Add optimistic update for reordering columns
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["board", boardId] });

      // Snapshot the previous board state
      const previousBoard = queryClient.getQueryData<Board>(["board", boardId]);

      if (previousBoard) {
        // Create a copy of the board to make optimistic updates
        const optimisticBoard = JSON.parse(JSON.stringify(previousBoard)) as Board;

        // Create a new columns array in the order specified by the params
        const orderedColumns = params.columns.map((columnOrder) => {
          // Find the column in the original columns array
          const column = optimisticBoard.ticketColumns.find((c) => c.id === columnOrder.id);
          return column; // Using ! because we know the column exists
        });

        // Replace the board's columns with the ordered columns
        optimisticBoard.ticketColumns = orderedColumns;

        // Update the query cache with optimistic update
        queryClient.setQueryData(["board", boardId], optimisticBoard);
      }

      return { previousBoard };
    },
    // If the mutation fails, restore the previous board state
    onError: (error, __, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
        toast.error(error?.message || "Failed to reorder columns.", {
          id: "reorder-columns-error",
        });
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Columns reordered successfully!", {
        id: "reorder-columns-success",
      });
    },
  });

  return {
    board: boardQuery.data,
    isLoading: boardQuery.isLoading,
    error: boardQuery.error,
    createColumn: createColumnMutation.mutate,
    updateColumn: updateColumnMutation.mutate,
    deleteColumn: deleteColumnMutation.mutate,
    moveColumn: moveColumnMutation.mutate,
    createCard: createCardMutation.mutate,
    updateCard: updateCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    moveCard: moveCardMutation.mutate,
    // Add loading state for move operation
    isMoveCardLoading: moveCardMutation.isPending,
    reorderCard: reorderCardMutation.mutate,
    isReorderCardLoading: reorderCardMutation.isPending,
    reorderColumns: reorderColumnsMutation.mutate,
    isReorderColumnsLoading: reorderColumnsMutation.isPending,
  };
}

// Add useCardById hook
export function useCardById(cardId: string | undefined) {
  return useQuery({
    queryKey: ["card", cardId],
    queryFn: () => fetchCardById(cardId),
    enabled: !!cardId,
  });
}

export function useCardTeamMembersById(cardId: string | undefined) {
  return useQuery({
    queryKey: ["teamMembersByCardId", cardId],
    queryFn: () => fetchCardTeamMemberById(cardId),
    enabled: !!cardId,
  });
}

export function useBoardTeamMembersById(cardId: string | undefined) {
  return useQuery({
    queryKey: ["teamMembersByBoardId", cardId],
    queryFn: () => fetchBoardTeamMemberById(cardId),
    enabled: !!cardId,
  });
}
export function useDeleteCommentMutation(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      toast.success("Comment deleted successfully!", {
        id: "delete-comment-success",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete comment.", {
        id: "delete-comment-error",
      });
    },
  });
}

// Hooks for Labels
export function useLabels(boardId: string) {
  const queryClient = useQueryClient();

  const labelsQuery = useQuery({
    queryKey: ["labels", boardId],
    queryFn: () => fetchLabels(boardId),
    enabled: !!boardId,
  });

  const createLabelMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => createLabel(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      toast.success("Label created successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create label.");
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: (data: { id: string; label: { name?: string; color?: string } }) =>
      updateLabel(data.id, data.label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Label updated successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update label.");
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Label deleted successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete label.");
    },
  });

  const deleteLabelsMutation = useMutation({
    mutationFn: (labelIds: string[]) => deleteLabels(boardId, labelIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Labels deleted successfully!");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete labels.");
    },
  });

  return {
    labels: labelsQuery.data || [],
    isLoading: labelsQuery.isLoading,
    createLabel: createLabelMutation.mutate,
    updateLabel: updateLabelMutation.mutate,
    deleteLabel: deleteLabelMutation.mutate,
    deleteLabels: deleteLabelsMutation.mutate,
  };
}
