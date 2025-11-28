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
  CircleCheck,
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
import { useContactTableStore } from "@/app/dashboard/contacts/store/contact-table-store";
import { useSendNewWaMessage } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { PAGE_SIZE } from "@/utils/constants";

import {
  useAddExistingContactMutation,
  useContactGroup,
  useContactGroupById,
  useDeleteGroupMutation,
  useRemoveContactsFromGroup,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import {
  useContactDeleteMutation,
  useEditContactMutation,
} from "../../backend/campaign/contacts/contacts.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { AccountSelector } from "../input/AccountSelector";
import FormModalLayout from "../Modal/FormModalLayout";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import CustomAlertDialog from "../ui/custom/CustomAlertDialog";
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
import { MultiSelect } from "../ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { getInitials } from "../ui/utils";
import CreateContactModal from "./CreateContactModal";
import CreateGroupModal from "./CreateGroupModal";
import CreateOrEditContactModal from "./CreatOrEditContactModal";
import { getSourceBadge } from "./utils/utils";

const ContactGroupMenu = ({ groupId }) => {
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

export default ContactGroupMenu;
