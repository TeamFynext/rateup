import {
  IconBan,
  IconDotsVertical,
  IconLockOpen,
  IconShieldExclamation,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useModerateInstagramContact } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { getContactLabel } from "@/utils/whatsapp/inbox.ts";

/**
 * Instagram's own block and spam folder for this person (Meta's Moderate Conversations
 * API). Separate from the inbox's spam flag and from WhatsApp's block, which live in the
 * ticket menu: these change what the customer's Instagram does, not just our inbox.
 */
export default function InstagramModerationMenu({
  contact,
}: Readonly<{ contact: ContactWithUpdatedAt }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const canManage = useCan("inbox.manage");
  const moderate = useModerateInstagramContact();

  if (!canManage || !contact.igsId) return null;
  const name = getContactLabel(contact) ?? t("this person");
  const blocked = !!contact.igBlockedAt;

  async function handleBlock() {
    const ok = await confirm({
      title: t("Block {name} on Instagram?", { name }),
      description: t(
        "They won't be able to message your Instagram account, and you won't be able to message them until you unblock them.",
      ),
      confirmText: t("Block"),
      cancelText: t("Cancel"),
    });
    if (ok) moderate.mutate({ contactId: contact.id, action: "block" });
  }

  async function handleSpam() {
    const ok = await confirm({
      title: t("Move {name} to spam?", { name }),
      description: t(
        "The conversation moves to the spam folder on Instagram, and the contact is marked as spam here.",
      ),
      confirmText: t("Move to spam"),
      cancelText: t("Cancel"),
    });
    if (ok) moderate.mutate({ contactId: contact.id, action: "spam" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("Instagram actions")}
            loading={moderate.isPending}
          />
        }
      >
        <IconDotsVertical className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* Base UI requires menu items to sit inside a group. */}
        <DropdownMenuGroup>
          {blocked ? (
            <DropdownMenuItem
              onClick={() => moderate.mutate({ contactId: contact.id, action: "unblock" })}
            >
              <IconLockOpen className="size-4" />
              {t("Unblock on Instagram")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleBlock} className="text-destructive">
              <IconBan className="size-4 text-destructive" />
              {t("Block on Instagram")}
            </DropdownMenuItem>
          )}
          {!contact.isSpam && (
            <DropdownMenuItem onClick={handleSpam}>
              <IconShieldExclamation className="size-4" />
              {t("Move to spam")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
