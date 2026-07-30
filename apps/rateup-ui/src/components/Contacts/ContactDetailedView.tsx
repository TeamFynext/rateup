import { CircleCheck, Edit, Folder, Mail, MapPin, Phone, Plus, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useRemoveContactsFromGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { useConfirm } from "@/context/confirm-provider.tsx";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { FieldLabel, FieldTitle } from "../ui/field.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { getInitials } from "../ui/utils.ts";
import { getSourceBadge } from "./utils/utils.tsx";

const ContactDetailedView = ({
  opened,
  setOpened,
  selectedContact,
  setIsSendMessageOpen,
  setIsAddToGroupOpen,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  selectedContact: ContactsData;
  setIsSendMessageOpen: (open: boolean) => void;
  setIsAddToGroupOpen: (open: boolean) => void;
}) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(selectedContact.notes);
  const removeContacts = useRemoveContactsFromGroup(selectedGroup?.id);
  const updateContact = useEditContactMutation();
  const confirm = useConfirm();
  async function handleRemoveContactFromGroup(group: ContactGroup, contactIds: string[]) {
    const shouldRemove = await confirm({
      title: "Remove Contact from Group",
      description: `Are you sure you want to remove ${selectedContact.name} from group ${group?.name}?`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });

    if (!shouldRemove) {
      setSelectedGroup(null);
      return;
    }

    removeContacts.mutate(
      { contactIds, groupId: group.id },
      {
        onSuccess: () => {
          toast.success("contact removed from group");
        },
        onError: (error) => {
          toast.error(error?.message || "something went wrong");
        },
      },
    );
  }

  function handleSaveNotes() {
    updateContact.mutate(
      { contactId: selectedContact.id, data: { notes } },
      {
        onSuccess: () => {
          toast.success("notes saved");
          setEditNotes(false);
        },
        onError: (error) => {
          toast.error(error?.message || "Something went wrong");
        },
      },
    );
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={selectedContact.profilePic} />
              <AvatarFallback className="bg-linear-to-r from-primary to-blue-600 text-white">
                {getInitials(selectedContact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle>{selectedContact.name}</DialogTitle>
              <DialogDescription>View and manage contact details</DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {getSourceBadge(selectedContact.source)}
                {selectedContact.blockedOnWhatsApp && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    Blocked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        <Tabs defaultValue="details" className="mt-4 min-h-[250px]">
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="details" className="rounded-xl">
              Details
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-xl">
              Groups
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl">
              Activity
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-xl">
              Notes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedContact.phone}</p>
                </div>
              </div>
              {selectedContact.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedContact.email}</p>
                  </div>
                </div>
              )}
              {selectedContact.location && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm">{selectedContact.location}</p>
                  </div>
                </div>
              )}
              {(selectedContact.contactLabelMap?.length ?? 0) > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex gap-1 flex-wrap">
                    {selectedContact.contactLabelMap.map(
                      (label: { label?: { id?: string; name?: string; color?: string } }) => (
                        <Badge key={label.label.id} variant="outline">
                          {label.label.name}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="groups" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldTitle>Group Membership</FieldTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpened(false);
                    setIsAddToGroupOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Group
                </Button>
              </div>

              {selectedContact.contactGroups && selectedContact.contactGroups.length > 0 ? (
                <div className="space-y-2 overflow-auto">
                  {selectedContact.contactGroups.map(
                    (contactGroup: { contactGroup?: ContactGroup }) => {
                      const group = contactGroup.contactGroup;

                      return (
                        <Card key={group.id} className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Folder className="w-4 h-4 text-indigo-600" />
                              <span className="text-sm">{group.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove from ${group.name}`}
                              onClick={() => {
                                setSelectedGroup(group);
                                handleRemoveContactFromGroup(group, [selectedContact.id]);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Not a member of any groups</p>
                  <p className="text-xs mt-1">
                    Click "Add to Group" to add this contact to a group
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="activity" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>No activity history available</p>
            </div>
          </TabsContent>
          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-3">
              <FieldLabel htmlFor="contact-notes" className="sr-only">
                Notes
              </FieldLabel>
              <Textarea
                id="contact-notes"
                placeholder="Add notes about this contact..."
                rows={5}
                defaultValue={selectedContact.notes}
                readOnly={!editNotes}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
              />
              {!editNotes ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setNotes(selectedContact.notes);
                    setEditNotes(true);
                  }}
                >
                  <Edit />
                  Edit Notes
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditNotes(false);
                    }}
                    variant={"secondary"}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes}>
                    {updateContact.isPending ? <Spinner /> : <CircleCheck />}
                    Save Notes
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpened(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (selectedContact) {
                setOpened(false);
                setIsSendMessageOpen(true);
              }
            }}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetailedView;
