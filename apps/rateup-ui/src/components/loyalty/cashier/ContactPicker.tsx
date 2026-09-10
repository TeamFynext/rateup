import { IconArrowLeft, IconLoader2, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { EnrolmentContact } from "@/backend/loyalty/customer/customer.api";
import { useEnrolmentContacts } from "@/backend/loyalty/customer/customer.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";

import { maskPhone } from "./maskPhone.ts";

interface ContactPickerProps {
  onBack: () => void;
  /** A contact who is not a member yet — carry their details into the register form. */
  onPick: (contact: EnrolmentContact) => void;
  /** A contact who already is one — open them at the counter instead. */
  onOpenMember: (phone: string) => void;
}

/**
 * Enrol someone the org already knows — from a WhatsApp chat, an import, a survey —
 * without retyping their number. Members are labelled and open instead of re-registering.
 */
export function ContactPicker({ onBack, onPick, onOpenMember }: Readonly<ContactPickerProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim(), 300);
  const { data: contacts, isLoading, isFetching } = useEnrolmentContacts(debounced);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("Back")}>
          <IconArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("Add from contacts")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Pick someone you already have a number for. Members are marked.")}
          </p>
        </div>
      </div>

      <div className="flex max-w-lg flex-col gap-3">
        <InputGroup>
          <InputGroupAddon>
            {isFetching ? (
              <IconLoader2 className="animate-spin" size={16} />
            ) : (
              <IconSearch size={16} />
            )}
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search contacts by name, phone or email")}
            autoComplete="off"
            autoFocus
            inputMode="search"
          />
        </InputGroup>

        {isLoading && <p className="text-sm text-muted-foreground">{t("Loading contacts…")}</p>}

        {!isLoading && contacts?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {debounced
              ? t("No contact matches “{query}”.", { query: debounced })
              : t("No contacts with a phone number yet.")}
          </div>
        )}

        {(contacts?.length ?? 0) > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {contacts?.map((contact) => {
              const member = contact.memberStatus === "active";
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => (member ? onOpenMember(contact.phone) : onPick(contact))}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {contact.name || t("No name")}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {maskPhone(contact.phone)}
                        {contact.email ? ` · ${contact.email}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {member ? <Badge variant="secondary">{t("Member")}</Badge> : t("Add")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
