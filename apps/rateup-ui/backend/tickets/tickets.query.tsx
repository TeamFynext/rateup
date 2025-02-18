import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { IUpdateTicketRequest, IUpdateTicketStatusRequest } from "./tickets";
import {
  createComment,
  createTicket,
  deleteTicket,
  getTicket,
  getTickets,
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
export const useUpdateTicketStatusMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IUpdateTicketStatusRequest) => {
      return updateTicketStatus(id, data);
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
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
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
      notifications.show({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Ticket Created...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["waTickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
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
