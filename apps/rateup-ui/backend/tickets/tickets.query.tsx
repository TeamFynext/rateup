import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { IUpdateTicketRequest, IUpdateTicketStatusRequest } from "./tickets";
import {
  Board,
  createBoard,
  createCard,
  createColumn,
  createComment,
  createTicket,
  deleteBoard,
  deleteCard,
  deleteColumn,
  deleteComment,
  deleteTicket,
  fetchBoard,
  fetchBoards,
  fetchBoardTeamMemberById,
  fetchCardById,
  fetchCardTeamMemberById,
  getTicket,
  getTickets,
  moveCard,
  moveColumnToBoard,
  reorderCard,
  reorderColumns,
  updateBoard,
  updateCard,
  updateColumn,
  updateTicket,
  updateTicketStatus,
} from "./tickets.api";

//get all tickets
export const useTickets = () =>
  useQuery({
    enabled: true,
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

//create ticket
export const useCreateTicketMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Ticket Created...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["allresponses"] });
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error: any) => {
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 6000,
      });
    },
  });
};

//get single ticket
export const useTicket = (id: string) =>
  useQuery({
    enabled: !!id,
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id),
  });

//update ticket status
export const useUpdateTicketStatusMutation = (ticketId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateTicketStatusRequest) => {
      const { id, ...rest } = data;
      const selectedTicketId = ticketId ?? id;
      return updateTicketStatus(selectedTicketId, rest);
    },
    onSuccess: () => {
      notifications.update({
        id: "update-status",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Ticket Status Updated...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (error: any) => {
      notifications.update({
        id: "update-status",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
};

//update ticket
export const useUpdateTicketMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateTicketRequest) => {
      return updateTicket(id, data);
    },
    onSuccess: () => {
      notifications.update({
        id: "update-ticket",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Ticket Updated...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: (error: any) => {
      notifications.update({
        id: "update-ticket",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
};

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTicket(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["allresponses"] });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      notifications.update({
        id: "load-data",
        loading: false,
        color: "green",
        title: "Success",
        message: "Deleted Ticket successfully",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      console.error("Error Deleting", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed Delete",
        message: error.message,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

//create ticket comment
export const useCreateCommentMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      showSuccessToast(
        "Comment created successfully!",
        "create-comment-success",
      );
      queryClient.invalidateQueries({ queryKey: ["card", id] });
    },
    onError: (error: any) => {
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
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
      showSuccessToast("Board updated successfully!", "update-board-success");
    },
    onError: () => {
      showErrorToast("Failed to update board.", "update-board-error");
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
      showSuccessToast("Board created successfully!", "create-board-success");
    },
    onError: () => {
      showErrorToast("Failed to create board.", "create-board-error");
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: updateBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      showSuccessToast("Board updated successfully!", "update-board-success");
    },
    onError: () => {
      showErrorToast("Failed to update board.", "update-board-error");
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      showSuccessToast("Board deleted successfully!", "delete-board-success");
    },
    onError: () => {
      showErrorToast("Failed to delete board.", "delete-board-error");
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
      showSuccessToast("Ticket updated successfully!", "update-ticket-success");
      queryClient.invalidateQueries({ queryKey: ["card"] });
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
      showSuccessToast("Column created successfully!", "create-column-success");
    },
    onError: () => {
      showErrorToast("Failed to create column.", "create-column-error");
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: updateColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Column updated successfully!", "update-column-success");
    },
    onError: () => {
      showErrorToast("Failed to update column.", "update-column-error");
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Column deleted successfully!", "delete-column-success");
    },
    onError: () => {
      showErrorToast("Failed to delete column.", "delete-column-error");
    },
  });

  const moveColumnMutation = useMutation({
    mutationFn: moveColumnToBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      showSuccessToast("Column moved successfully!", "move-column-success");
    },
    onError: () => {
      showErrorToast("Failed to move column.", "move-column-error");
    },
  });

  const createCardMutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Card created successfully!", "create-card-success");
    },
    onError: () => {
      showErrorToast("Failed to create card.", "create-card-error");
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Card updated successfully!", "update-card-success");
    },
    onError: () => {
      showErrorToast("Failed to update card.", "update-card-error");
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Card deleted successfully!", "delete-card-success");
    },
    onError: () => {
      showErrorToast("Failed to delete card.", "delete-card-error");
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
        const optimisticBoard = JSON.parse(
          JSON.stringify(previousBoard),
        ) as Board;

        // Find source and target columns
        const sourceColumnIndex = optimisticBoard.ticketColumns.findIndex(
          (col) => col.id === params.sourceColumnId,
        );
        const targetColumnIndex = optimisticBoard.ticketColumns.findIndex(
          (col) => col.id === params.targetColumnId,
        );

        if (sourceColumnIndex >= 0 && targetColumnIndex >= 0) {
          // Find the card to move

          const cardIndex = optimisticBoard.ticketColumns[
            sourceColumnIndex
          ].ticketCards.findIndex((card) => card.id === params.cardId);

          if (cardIndex >= 0) {
            // Get the card
            const card =
              optimisticBoard.ticketColumns[sourceColumnIndex].ticketCards[
                cardIndex
              ];

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
                    columnName:
                      optimisticBoard.ticketColumns[targetColumnIndex].title,
                    sourceColumnName:
                      optimisticBoard.ticketColumns[sourceColumnIndex].title,
                  },
                },
              ],
            };

            // Remove from source
            optimisticBoard.ticketColumns[sourceColumnIndex].ticketCards.splice(
              cardIndex,
              1,
            );

            // Add to target
            optimisticBoard.ticketColumns[targetColumnIndex].ticketCards.push(
              updatedCard,
            );

            // Update the query cache with our optimistic board
            queryClient.setQueryData(["board", boardId], optimisticBoard);
          }
        }
      }

      return { previousBoard };
    },
    // If the mutation fails, restore the previous board state
    onError: (_, __, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
        showErrorToast("Failed to move card.", "move-card-error");
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Card moved successfully!", "move-card-success");
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
        const optimisticBoard = JSON.parse(
          JSON.stringify(previousBoard),
        ) as Board;

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
            return card!; // Using ! because we know the card exists
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
    onError: (_, __, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
        showErrorToast("Failed to reorder cards.", "reorder-card-error");
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast("Cards reordered successfully!", "reorder-card-success");
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
        const optimisticBoard = JSON.parse(
          JSON.stringify(previousBoard),
        ) as Board;

        // Create a new columns array in the order specified by the params
        const orderedColumns = params.columns.map((columnOrder) => {
          // Find the column in the original columns array
          const column = optimisticBoard.ticketColumns.find(
            (c) => c.id === columnOrder.id,
          );
          return column!; // Using ! because we know the column exists
        });

        // Replace the board's columns with the ordered columns
        optimisticBoard.ticketColumns = orderedColumns;

        // Update the query cache with optimistic update
        queryClient.setQueryData(["board", boardId], optimisticBoard);
      }

      return { previousBoard };
    },
    // If the mutation fails, restore the previous board state
    onError: (_, __, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(["board", boardId], context.previousBoard);
        showErrorToast("Failed to reorder columns.", "reorder-columns-error");
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      showSuccessToast(
        "Columns reordered successfully!",
        "reorder-columns-success",
      );
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
    queryFn: () => fetchCardById(cardId as string),
    enabled: !!cardId,
  });
}

export function useCardTeamMembersById(cardId: string | undefined) {
  return useQuery({
    queryKey: ["teamMembersByCardId", cardId],
    queryFn: () => fetchCardTeamMemberById(cardId as string),
    enabled: !!cardId,
  });
}

export function useBoardTeamMembersById(cardId: string | undefined) {
  return useQuery({
    queryKey: ["teamMembersByBoardId", cardId],
    queryFn: () => fetchBoardTeamMemberById(cardId as string),
    enabled: !!cardId,
  });
}
export function useDeleteCommentMutation(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      showSuccessToast(
        "Comment deleted successfully!",
        "delete-comment-success",
      );
    },
    onError: () => {
      showErrorToast("Failed to delete comment.", "delete-comment-error");
    },
  });
}
