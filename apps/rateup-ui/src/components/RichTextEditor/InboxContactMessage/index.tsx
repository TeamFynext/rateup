import { IconAddressBook, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import ContactPagination from "@/components/Contacts/ContactPagination.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { FieldTitle } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useMessageBodyStore } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayFooter/index.tsx";
import { PAGE_SIZE } from "@/utils/constants.ts";

const InboxContactsControl = () => {
  const [opened, setOpened] = useState(false);

  const { body, setBody, resetBody } = useMessageBodyStore();

  function handleSubmit(contacts: { contactIds: string[]; groupIds: string[] }) {
    setBody({ ...body, type: "contact", contacts });
    setOpened((o) => !o);
  }
  return (
    <Popover open={opened} onOpenChange={setOpened}>
      <PopoverTrigger render={<div className="relative inline-flex" />}>
        {(body.contacts.contactIds.length > 0 || body.contacts.groupIds.length > 0) && (
          <span className="absolute -top-2 -right-2 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap text-primary-foreground">
            {`${body.contacts.contactIds.length} contacts, ${body.contacts.groupIds.length} groups selected`}
          </span>
        )}
        <Button variant="ghost" size="icon" title="Contacts" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
          <IconAddressBook size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto">
        <SelectContacts
          submitbtnTitle={"Next"}
          onSubmit={handleSubmit}
          onCancel={() => {
            resetBody();
            setOpened((o) => !o);
          }}
          contactIds={body.contacts.contactIds}
          groupIds={body.contacts.groupIds}
        />
      </PopoverContent>
    </Popover>
  );
};

enum ContactMethods {
  Individual = "Individual",
  Group = "Group",
}

const SelectContacts = ({
  submitbtnTitle,
  onSubmit,
  onCancel,
  contactIds = [],
  groupIds = [],
}: {
  submitbtnTitle: string;
  onSubmit: (selection: { contactIds: string[]; groupIds: string[] }) => void;
  onCancel: () => void;
  contactIds?: string[];
  groupIds?: string[];
}) => {
  const { t: translations } = useTranslation();
  const [selectedTab, setSelectedTab] = useState(ContactMethods.Individual);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const { data: contacts, isLoading } = useContacts(pagination, searchText);
  const { data: groups, isPending } = useContactGroup();
  const totalPageCount = (contacts?.totalCount ?? 1) / pagination.pageSize;

  function handleCancel() {
    setSelectedContactIds([]);
    setSelectedContactIds([]);
    onCancel();
  }

  function handleSubmit() {
    onSubmit({ contactIds: selectedContactIds, groupIds: selectedGroupIds });
  }

  useEffect(() => {
    if (contactIds) setSelectedContactIds(contactIds);
    if (groupIds) setSelectedGroupIds(groupIds);
  }, [contactIds, groupIds]);

  if (isLoading || isPending) return <RateupLoader />;

  return (
    <Tabs
      value={selectedTab}
      onValueChange={(value) => setSelectedTab(value as ContactMethods)}
      className="flex flex-col gap-4 w-[350px]"
    >
      <div className="flex items-center justify-between gap-4">
        <TabsList className="min-w-38">
          {Object.values(ContactMethods).map((method) => (
            <TabsTrigger key={method} value={method} className="capitalize">
              {method}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            {submitbtnTitle}
          </Button>
        </div>
      </div>
      <InputGroup>
        <InputGroupInput
          placeholder={`Search ${selectedTab?.toLowerCase()}`}
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
        />
        <InputGroupAddon align="inline-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear input"
            onClick={() => setSearchText("")}
            className={searchText ? "" : "hidden"}
          >
            <IconX size={16} />
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex items-center justify-between mb-1">
        <h6 className="font-semibold text-sm">
          {translations("Select")} {selectedTab?.toLowerCase()} (Max 100 contacts/members)
        </h6>
      </div>
      <ScrollArea
        className="pr-3"
        style={{ height: selectedTab === ContactMethods.Individual ? 280 : 342 }}
      >
        <TabsContent value={ContactMethods.Individual}>
          {contacts.users?.length > 0 ? (
            <div className="flex flex-col">
              {contacts.users.map((contact) => (
                <ContactSelectCard
                  key={contact.id}
                  contact={contact}
                  checked={selectedContactIds.includes(contact.id)}
                  onToggle={(next) =>
                    setSelectedContactIds((prev) =>
                      next ? [...prev, contact.id] : prev.filter((id) => id !== contact.id),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p>{translations("No contacts found")}</p>
          )}
        </TabsContent>
        <TabsContent value={ContactMethods.Group}>
          {groups?.length > 0 ? (
            <div className="flex flex-col">
              {groups.map((group) => (
                <ContactGroupSelectCard
                  key={group.id}
                  group={group}
                  checked={selectedGroupIds.includes(group.id)}
                  onToggle={(next) =>
                    setSelectedGroupIds((prev) =>
                      next ? [...prev, group.id] : prev.filter((id) => id !== group.id),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p>{translations("No group found")}</p>
          )}
        </TabsContent>
      </ScrollArea>
      {selectedTab === ContactMethods.Individual && contacts?.users?.length > 0 && (
        <ContactPagination
          pagination={pagination}
          setPagination={setPagination}
          totalPageCount={totalPageCount}
        />
      )}
    </Tabs>
  );
};

const ContactSelectCard = ({
  contact,
  checked,
  onToggle,
}: {
  contact: ContactsData;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) => {
  if (!contact) return null;
  return (
    <FieldTitle
      data-checked={checked || undefined}
      className={"cursor-pointer rounded-md p-2 hover:bg-muted data-[checked]:bg-muted"}
    >
      <div className="flex items-center justify-between flex-nowrap">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{contact.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{contact.name}</span>
            <span className="text-xs text-muted-foreground">{contact.phone}</span>
          </div>
        </div>
        <Checkbox checked={checked} onCheckedChange={onToggle} />
      </div>
    </FieldTitle>
  );
};

const ContactGroupSelectCard = ({
  group,
  checked,
  onToggle,
}: {
  group: ContactGroup;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) => {
  if (!group) return null;
  return (
    <FieldTitle
      data-checked={checked || undefined}
      className={"cursor-pointer rounded-md p-2 hover:bg-muted data-[checked]:bg-muted"}
    >
      <div className="flex items-center justify-between flex-nowrap">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{group.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{group.name}</span>
            <span className="text-xs text-muted-foreground">{group._count.contacts} members</span>
          </div>
        </div>
        <Checkbox checked={checked} onCheckedChange={onToggle} />
      </div>
    </FieldTitle>
  );
};

export default InboxContactsControl;
