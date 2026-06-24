import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Users } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { useBoardTeamMembersById, useUpdateBoardMutation } from "@/backend/tickets/tickets.query";
import { Alert } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { MultiSelect } from "../ui/multi-select.tsx";
import type { Board } from "./types.ts";

const notificationSchema = z.object({
  id: z.string(),
  ticketCreatedEmail: z.boolean().optional(),
  ticketCreatedWhatsapp: z.boolean(),
  ticketAssignedEmail: z.boolean().optional(),
  ticketAssignedWhatsapp: z.boolean().optional(),
  assignedToIds: z.array(z.string().optional()),
  title: z.string().min(1, "Board title is required"),
  description: z.string().optional(),
  teamIds: z.array(z.string()),
});

export type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function TicketSettings({
  boardId,
  selectedBoard,
  teamOptions,
}: Readonly<{
  boardId: string;
  selectedBoard: Board;
  teamOptions: { value: string; label: string }[];
}>) {
  const updateBoardMutation = useUpdateBoardMutation();
  const { isPending: isMembersLoading } = useBoardTeamMembersById(boardId);
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      id: selectedBoard?.id || "",
      ticketCreatedEmail: selectedBoard?.ticketCreatedEmail || false,
      ticketCreatedWhatsapp: selectedBoard?.ticketCreatedWhatsapp || false,
      ticketAssignedEmail: selectedBoard?.ticketAssignedEmail || false,
      ticketAssignedWhatsapp: selectedBoard?.ticketAssignedWhatsapp || false,
      assignedToIds: selectedBoard?.notificationRecipients?.map((r) => r.userId) || [],
      title: selectedBoard?.title || "",
      description: selectedBoard?.description || "",
      teamIds: selectedBoard?.teams?.map((t) => t.teamId) || [],
    },
  });

  function onSubmit(values: NotificationFormValues) {
    updateBoardMutation.mutate(values);
  }

  if (isMembersLoading) {
    return (
      <div className="flex justify-center items-center min-h-40">
        <Loader className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 relative">
      <FormProvider {...form}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Board Settings</CardTitle>
                <CardDescription>
                  Update board title, teams, and notification preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Board Information */}
                <div>
                  <div className="mb-2 font-semibold text-base">Board Information</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Update board title and associated teams
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="title"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Board Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter board title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Multi-select Teams */}
                    <FormField
                      name="teamIds"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teams</FormLabel>
                          <FormControl>
                            <MultiSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={teamOptions}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="description"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter board description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Notification Recipients (users) */}
                <div>
                  <div className="mb-2 font-semibold text-base">Notification Recipients</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Select users who should receive notifications
                  </div>
                  {/* TODO: Replace with shadcn multi-select or checkbox group for users */}
                  <div className="rounded border p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      User selection coming soon
                    </div>
                  </div>
                </div>

                {/* Ticket Creation Notifications */}
                <div>
                  <div className="mb-2 font-semibold text-base">Ticket Creation</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Notifications to send when a new ticket is created
                  </div>
                  <div className="flex flex-col gap-3">
                    <FormField
                      name="ticketCreatedEmail"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4">
                          <FormLabel>Send email notification</FormLabel>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="ticketCreatedWhatsapp"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4">
                          <FormLabel>
                            Send WhatsApp notification (when session is available)
                          </FormLabel>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Ticket Assignment Notifications */}
                <div>
                  <div className="mb-2 font-semibold text-base">Ticket Assignment</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Notifications are sent when a ticket is assigned to a user, and the notification
                    is sent to the assigned user.
                  </div>
                  <div className="flex flex-col gap-3">
                    <FormField
                      name="ticketAssignedEmail"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4">
                          <FormLabel>Send email notification</FormLabel>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="ticketAssignedWhatsapp"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4">
                          <FormLabel>Send WhatsApp notification</FormLabel>
                          <FormControl>
                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-end gap-2">
                {updateBoardMutation.isError && (
                  <Alert variant="destructive" className="w-full">
                    {updateBoardMutation.error instanceof Error
                      ? updateBoardMutation.error.message
                      : "Failed to save settings"}
                  </Alert>
                )}
                <Button type="submit" disabled={updateBoardMutation.isPending}>
                  <Bell className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </FormProvider>
    </div>
  );
}
