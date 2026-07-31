// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { useUpdateCardMutation } from "@/backend/tickets/tickets.query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { MetaLabel } from "./shared.tsx";

export function AssignContact({ ticketId }: Readonly<{ ticketId: string }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useContacts({ pageIndex: 0, pageSize: 20 }, search);
  const { mutate, isPending } = useUpdateCardMutation();

  const handleAssign = (contactId: string) => {
    mutate({ id: ticketId, contactId });
    setOpen(false);
  };

  return (
    <div>
      <MetaLabel>{t("Customer")}</MetaLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-full text-xs border-dashed flex gap-2 justify-start font-normal text-muted-foreground h-10"
            />
          }
        >
          <UserPlus className="h-4 w-4" /> {t("Add Contact")}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-1" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder={t("Search contact...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
            />
          </div>
          <div
            className="max-h-64 overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="p-4 text-xs text-center text-muted-foreground">{t("Loading...")}</div>
            ) : data?.users?.length === 0 ? (
              <div className="p-4 text-xs text-center text-muted-foreground">
                {t("No contacts found.")}
              </div>
            ) : (
              <div className="flex flex-col">
                {data?.users?.map((contact) => (
                  <button
                    key={contact.id}
                    disabled={isPending}
                    onClick={() => handleAssign(contact.id)}
                    className="flex items-center gap-2 p-2 hover:bg-muted text-left transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-semibold bg-muted">
                        {contact.name?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-medium truncate">{contact.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        +{contact.phone}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
