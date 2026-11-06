import { IconSearch, IconUserSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

import { LeadAvatar } from "../shared/LeadAvatar.tsx";

/** The fields a lead copies off the contact it is created from. */
export interface PickedContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ContactPickerProps {
  value: PickedContact | null;
  onChange: (contact: PickedContact | null) => void;
}

const PAGE = { pageIndex: 0, pageSize: 20 };

/**
 * Picks the customer a lead is about from the contacts already in the org,
 * rather than typing a new name in. The lead then carries that contact's id, so
 * the board, the inbox and the contact record all agree on who this is.
 */
export function ContactPicker({ value, onChange }: Readonly<ContactPickerProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 300);

  const { data, isFetching } = useContacts(PAGE, search);
  const contacts = data?.users ?? [];

  const pick = (contact: ContactsData) => {
    onChange({
      id: contact.id,
      name: contact.name,
      phone: contact.phone || null,
      email: contact.email || null,
    });
    setOpen(false);
    setQuery("");
  };

  if (value) {
    return (
      <div className="border-border flex items-center gap-2.5 rounded-lg border p-2.5">
        <LeadAvatar name={value.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-sm font-semibold">{value.name}</div>
          <div className="text-muted-foreground truncate text-xs">
            {[value.phone, value.email].filter(Boolean).join(" · ") || t("No phone or email")}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 text-xs"
          onClick={() => onChange(null)}
        >
          <IconX className="size-3.5" />
          {t("Change")}
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="border-border text-muted-foreground hover:bg-muted flex w-full items-center gap-2.5 rounded-lg border border-dashed p-2.5 text-left text-sm transition-colors"
          >
            <IconUserSearch className="size-4 shrink-0" />
            {t("Search your contacts…")}
          </button>
        }
      />

      <PopoverContent align="start" className="w-(--anchor-width) min-w-80 p-0">
        <div className="border-border relative border-b">
          <IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search by name, phone or email")}
            className="border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
          {isFetching && contacts.length === 0 ? (
            <div className="flex flex-col gap-1.5 p-1">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-9 w-full" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-muted-foreground p-3 text-center text-xs">
              {search ? t("Nobody matches “{query}”.", { query: search }) : t("No contacts yet.")}
            </p>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => pick(contact)}
                className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors"
              >
                <LeadAvatar name={contact.name} photo={contact.profilePic} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate text-xs font-medium">
                    {contact.name || t("Unnamed contact")}
                  </span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {contact.phone || contact.email || t("No phone or email")}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
