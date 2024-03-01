import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  createTicket,
  getTicket,
  getTickets,
  updateTicket,
  updateTicketStatus,
} from "./tickets.api";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { IUpdateTicketRequest, IUpdateTicketStatusRequest } from "./tickets";

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
    enabled: true,
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

//create ticket comment
export const useCreateCommentMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createComment,
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
