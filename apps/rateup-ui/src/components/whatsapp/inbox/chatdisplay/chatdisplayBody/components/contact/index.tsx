import { IconChevronRight, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";

import { useImportCSVContactMutation } from "@/backend/campaign/contacts/contacts.query";
import CreateContactModal from "@/components/Contacts/CreateContactModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { WaSendMessageBody } from "@/types/global";
import { importMethod } from "@/utils/enums/index.ts";

const WaInboxContact = ({ messageContent }: { messageContent: WaSendMessageBody["contacts"] }) => {
  const contacts = [...messageContent];
  const [opened, setOpened] = useState(false);
  if (contacts.length === 1) {
    return <Contact contact={contacts[0]} showAddtoContact={true} />;
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center gap-2">
        <CreativeAvatar
          name={contacts[0].name ? contacts[0].name.formatted_name : contacts[0].phones[0].phone}
          size="xs"
        />
        <span className="text-sm font-medium">
          {contacts[0].name ? contacts[0].name.formatted_name : contacts[0].phones[0].phone} and{" "}
          {contacts.length - 1} other contacts
        </span>
      </div>
      <Separator />
      <Button
        variant="ghost"
        className="w-full text-xs text-primary h-8 hover:bg-muted/40"
        onClick={() => setOpened(true)}
      >
        View All
      </Button>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="max-w-md p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All contacts</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {contacts?.map((contact, index) => (
              <div key={index} className="flex flex-col gap-3">
                <Contact contact={contact} />
                {index + 1 !== contacts.length && <Separator />}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Contact = ({
  contact,
  showAddtoContact = false,
}: {
  contact: WaSendMessageBody["contacts"][0];
  showAddtoContact?: boolean;
}) => {
  const [opened, setOpened] = useState(false);
  const initialValues = {
    name: contact.name ? contact.name.formatted_name : "",
    phone: contact.phones[0].phone.trim().replaceAll(" ", ""),
    email: contact.emails?.[0]?.email ?? "",
    dob: contact.birthday,
    source: importMethod.MANUAL,
    contactType: [],
    tags: {},
    updateExisting: false,
    external_id: "",
  };
  const importCSVContactMutation = useImportCSVContactMutation();
  return (
    <div className="border border-border rounded-lg p-3 bg-card shadow-xs">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreativeAvatar
              name={contact.name ? contact.name.formatted_name : contact.phones[0].phone}
              size="xs"
            />
            <span className="text-sm font-semibold text-foreground">
              {contact.name ? contact.name.formatted_name : contact.phones[0].phone}
            </span>
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                />
              }
            >
              <IconChevronRight size={16} />
            </PopoverTrigger>
            <PopoverContent align="end" className="p-4 w-72">
              <ContactInfo
                contact={contact}
                showAddtoContact={!showAddtoContact}
                open={() => setOpened(true)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {showAddtoContact && (
          <>
            <Separator />
            <Button
              variant="ghost"
              className="w-full text-xs text-indigo-600 gap-1.5 h-8 justify-center hover:bg-muted/40"
              onClick={() => setOpened(true)}
            >
              <IconUserPlus size={16} />
              <span>Add to contact</span>
            </Button>
          </>
        )}

        <Dialog open={opened} onOpenChange={setOpened}>
          <DialogContent className="max-w-xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add to contact</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <CreateContactModal
                initialValues={initialValues}
                close={() => setOpened(false)}
                contactClose={() => setOpened(false)}
                importCSVContactMutation={importCSVContactMutation}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const ContactInfo = ({
  contact,
  open,
  showAddtoContact = false,
}: {
  contact: WaSendMessageBody["contacts"][0];
  open?: () => void;
  showAddtoContact?: boolean;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreativeAvatar
            name={contact.name ? contact.name.formatted_name : contact.phones[0].phone}
            size="xs"
          />
          <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
            {contact.name ? contact.name.formatted_name : contact.phones[0].phone}
          </span>
        </div>
        {showAddtoContact && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1 h-8 shrink-0 hover:bg-muted/40"
            onClick={open}
          >
            <IconUserPlus size={14} />
            <span>Add</span>
          </Button>
        )}
      </div>

      {contact.emails?.map((email, idx) => (
        <div className="flex flex-col gap-0.5" key={idx}>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            {email.type}
          </span>
          <span className="text-xs text-foreground break-all">{email.email}</span>
          <Separator className="mt-2" />
        </div>
      ))}

      {contact.phones?.map((phone, idx) => (
        <div className="flex flex-col gap-0.5" key={idx}>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            {phone.type}
          </span>
          <span className="text-xs text-foreground">{phone.phone}</span>
          <Separator className="mt-2" />
        </div>
      ))}

      {contact.addresses?.map((address, idx) => (
        <div className="flex flex-col gap-0.5" key={idx}>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
            {address.type}
          </span>
          <span className="text-xs text-foreground">
            {address.city}, {address.country}
          </span>
          <Separator className="mt-2" />
        </div>
      ))}
    </div>
  );
};

export default WaInboxContact;
