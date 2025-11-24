"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconBrandWhatsapp,
  IconChevronDown,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import {
  Edit,
  EllipsisVertical,
  Eye,
  Folder,
  Instagram,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Trash,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { MessagePlatform } from "@/types/enums";
import { CreateOrEditContactModal } from "@/app/dashboard/contacts/components/data-table-toolbar";
import { useContactTableStore } from "@/app/dashboard/contacts/store/contact-table-store";
import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { PAGE_SIZE } from "@/utils/constants";

import {
  useAddExistingContactMutation,
  useContactGroup,
  useContactGroupById,
  useDeleteGroupMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { useContactDeleteMutation } from "../../backend/campaign/contacts/contacts.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import CreateContactModal from "../Contacts/CreateContactModal";
import CreateGroupModal from "../Contacts/CreateGroupModal";
import { getSourceBadge } from "../Contacts/utils/utils";
import { AccountSelector } from "../input/AccountSelector";
import FormModalLayout from "../Modal/FormModalLayout";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { getInitials } from "../ui/utils";

export const ContactMenu = ({ contact, groupId }) => {
  const translations = useTranslations();
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: translations("Delete contact"),
      centered: true,
      children: (
        <p className="text-sm">
          {translations("Are you sure you want to delete this contact?")}
        </p>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContact(),
    });
  };
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);
  const deleteMutation = useContactDeleteMutation(groupId);
  const [viewDetails, setViewDetails] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const deleteContact = () => {
    deleteMutation.mutate(contact?.id);
  };
  const {
    ContactLabelMap,
    contactGroups,
    customFields,
    campaignParticipants,
    loyaltyCustomer,
    ...rest
  } = contact;
  const initialValues = {
    ...rest,
    labels: ContactLabelMap ? ContactLabelMap.map((c) => c.label.id) : [],
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => {
            setViewDetails(true);
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          {translations("View Details")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOpenedEditModal(true)}>
          <Edit className="w-4 h-4 mr-2" />
          {translations("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsSendMessageOpen(true)}>
          <Send className="w-4 h-4 mr-2" />
          {translations("Send Message")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          color="red"
          onClick={openDeleteModal}
          className="text-red-500"
        >
          <Trash className="text-red-500 w-4 h-4 mr-2" />
          {translations("Delete contact")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateOrEditContactModal
        opened={openedEditModal}
        setOpened={setOpenedEditModal}
        initialValues={initialValues}
      />

      <ContactDetailedView
        setIsAddToGroupOpen={setIsAddToGroupOpen}
        opened={viewDetails}
        setOpened={setViewDetails}
        selectedContact={contact}
        setIsSendMessageOpen={setIsSendMessageOpen}
      />
      <SendMessageModal
        opened={isSendMessageOpen}
        setOpened={setIsSendMessageOpen}
        selectedContact={contact}
      />
      <AddToGroupModal
        opened={isAddToGroupOpen}
        setOpened={setIsAddToGroupOpen}
        selectedContact={contact}
      />
    </DropdownMenu>
  );
};

export const ContactGroupMenu = ({ groupId }) => {
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const { data } = useContactGroupById(groupId?.toString(), openedEditModal, {
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const deleteGroupMutation = useDeleteGroupMutation();
  const router = useRouter();
  const translations = useTranslations();
  const openDeleteModal = (e) => {
    e.stopPropagation();
    modals.openConfirmModal({
      title: translations("Delete Group"),
      centered: true,
      children: (
        <p className="text-sm">
          {translations(
            "Are you sure you want to delete this group? This action is destructive and you will have to contact support to restore your data.",
          )}
        </p>
      ),
      labels: { confirm: translations("Ok"), cancel: translations("cancel") },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContactGroup(),
    });
  };
  const deleteContactGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        router.push("/dashboard/contacts?tab=groups");
      },
    });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <RateupButtonPrimary
          title={translations("Select action")}
          variant="light"
          rightIcon={<IconChevronDown size="1rem" />}
          size="xs"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setOpenedEditModal(true);
          }}
        >
          <Edit />
          {translations("Edit")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem color="red" onClick={openDeleteModal}>
          <Trash />
          {translations("Delete contact Group")}
        </DropdownMenuItem>
      </DropdownMenuContent>

      <CreateGroupModal
        opened={openedEditModal}
        setOpened={setOpenedEditModal}
        isEdit={true}
        groupDetails={data}
      />
    </DropdownMenu>
  );
};

const ContactDetailedView = ({
  opened,
  setOpened,
  selectedContact,
  setIsSendMessageOpen,
  setIsAddToGroupOpen,
}) => {
  function handleRemoveContactFromGroup(group) {}

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedContact.profilePic} />
              <AvatarFallback className="bg-gradient-to-r from-rateup-blue to-blue-600 text-white">
                {getInitials(selectedContact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle>{selectedContact.name}</DialogTitle>
              <DialogDescription>
                View and manage contact details
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                {getSourceBadge(selectedContact.source)}
                {selectedContact.blockedOnWhatsApp && (
                  <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-700"
                  >
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
              {selectedContact.contactLabelMap?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex gap-1 flex-wrap">
                    {selectedContact.contactLabelMap.map((label) => (
                      <Badge key={label.label.id} variant="outline">
                        {label.label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="groups" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Group Membership</Label>
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

              {selectedContact.contactGroups &&
              selectedContact.contactGroups.length > 0 ? (
                <div className="space-y-2 overflow-auto">
                  {selectedContact.contactGroups.map((contactGroup) => {
                    const group = contactGroup.contactGroup;

                    return (
                      <Card key={group.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Folder className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm">{group.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveContactFromGroup(group)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
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
              <Textarea
                id="contact-notes"
                placeholder="Add notes about this contact..."
                rows={5}
                defaultValue={selectedContact.notes}
              />
              <Button
                size="sm"
                className="bg-gradient-to-r from-rateup-blue to-rateup-orange"
                onClick={() => {}}
              >
                Save Notes
              </Button>
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

const SendMessageModal = ({ opened, setOpened, selectedContact }) => {
  const [whatsappSettingsPhoneId, setWhatsappSettingsPhoneId] = useState("");
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<string>(MessagePlatform.WHATSAPP);
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContact.id,
    whatsappSettingsPhoneId,
    platform as MessagePlatform,
  );
  function handleSendMessage() {
    sendnewWaMessage.mutate(
      { type: "text", text: message },
      {
        onSuccess: () => {
          toast.success("message has been sent");
          setOpened(false);
        },
      },
    );
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>
            {`Send a message to ${selectedContact.name}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2 w-full">
            <Label htmlFor="message-channel">Select Channel</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="message-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MessagePlatform.WHATSAPP}>
                  <div className="flex items-center gap-2">
                    <IconBrandWhatsapp className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </div>
                </SelectItem>
                <SelectItem value={MessagePlatform.INSTAGRAM}>
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-full">
            <Label htmlFor="message-account">Account</Label>
            <AccountSelector
              value={whatsappSettingsPhoneId}
              onChange={(value) => setWhatsappSettingsPhoneId(value)}
              platform={platform as MessagePlatform}
            />
          </div>
          <div className="space-y-2 w-full">
            <Label htmlFor="message-text">Message</Label>
            <Textarea
              id="message-text"
              placeholder="Type your message here..."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (message.trim()) {
                handleSendMessage();
              } else {
                toast.error("Please enter a message");
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
const AddToGroupModal = ({ opened, setOpened, selectedContact }) => {
  const { data: groups, isLoading } = useContactGroup();
  const [contactGroupId, setContactGroupId] = useState("");
  const addExistingContactsMutation =
    useAddExistingContactMutation(contactGroupId);
  const handleAddExistingContacts = async () => {
    if (!contactGroupId.length) {
      return toast.error("Please select a group");
    }
    addExistingContactsMutation.mutate(
      {
        customerList: [selectedContact.id],
        groupId: contactGroupId,
      },
      {
        onSuccess: () => {
          toast.success("contact added to group");
          setOpened(false);
        },
        onError: () => {
          toast.error("error adding contact to group");
          setOpened(false);
        },
      },
    );
  };

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact to Group</DialogTitle>
          <DialogDescription>Select Group to add the contact</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input readOnly defaultValue={selectedContact.name} />
          <Label>Phone</Label>
          <Input readOnly defaultValue={selectedContact.phone} />
          <Label>Group</Label>
          {isLoading ? (
            <Spinner />
          ) : (
            <Select
              value={contactGroupId}
              onValueChange={setContactGroupId}
              defaultValue={groups?.[0]?.id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={"Select a group"} />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((g) => (
                  <SelectItem value={g.id} key={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <DialogClose>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddExistingContacts}>
            {addExistingContactsMutation.isPending && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
