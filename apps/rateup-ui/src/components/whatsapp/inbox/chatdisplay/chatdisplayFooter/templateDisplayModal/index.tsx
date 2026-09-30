import {
  IconBrandWhatsapp,
  IconFile,
  IconMapPin,
  IconPhoto,
  IconSearch,
  IconTemplate,
  IconVideo,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useSendWaTemplateToUser, useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import { cn } from "@/lib/utils.ts";
import { WaTemplateStatus } from "@/types/enums.ts";
import type { WaTemplateFetchBody } from "@/types/global";

import { TeamSelector } from "../../../../../input/TeamSelector.tsx";
import { usePhoneIdStore } from "../../../chatselect/accountSelectorStore.ts";
import { WaInboxTemplatePreviewNew } from "./templatePreview/index.tsx";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData | null;
  opened: boolean;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
};

const HEADER_ICON = {
  IMAGE: IconPhoto,
  VIDEO: IconVideo,
  DOCUMENT: IconFile,
  LOCATION: IconMapPin,
} as const;

function bodyText(template: WaTemplateFetchBody) {
  return template.components.find((c) => c.type === "BODY")?.text ?? "";
}

export default function WaInboxTemplateDisplayModal({
  contact,
  opened,
  onClose,
  sessionExpired,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  // The row key lets the send draw its card in the thread while it is in flight.
  const sendTemplate = useSendWaTemplateToUser(
    contact?.phone ?? "",
    contact?.id,
    contact ? getRowKey(contact) : undefined,
  );
  const { whatsappSettingsPhoneId } = usePhoneIdStore();
  const { isPending: templatesLoading } = useWaTemplates();
  const templatesForTeam = useTemplatesAvailableForTeam(teamId);

  const approved = useMemo(
    () => templatesForTeam.filter((tpl) => tpl.data.status === WaTemplateStatus.APPROVED),
    [templatesForTeam],
  );
  const categories = useMemo(
    () => [...new Set(approved.map((tpl) => tpl.data.category))],
    [approved],
  );
  const visible = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return approved.filter(
      (tpl) =>
        (!category || tpl.data.category === category) &&
        (!query ||
          tpl.data.name.toLowerCase().includes(query) ||
          bodyText(tpl.data).toLowerCase().includes(query)),
    );
  }, [approved, category, searchTerm]);
  const selected = approved.find((tpl) => tpl.id === selectedTemplateId);

  function close() {
    setSearchTerm("");
    setCategory(null);
    setSelectedTemplateId("");
    onClose();
  }

  const recipient = contact?.name || (contact?.phone ? `+${contact.phone}` : "");

  return (
    <Dialog open={opened} onOpenChange={(next) => !next && close()}>
      <DialogContent className="z-60 flex h-[min(88vh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 pr-12">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-600/10 text-green-600 dark:text-green-500">
            <IconBrandWhatsapp className="size-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold">
              {recipient
                ? t("Send a template to {name}", { name: recipient })
                : t("Send a template")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
              {sessionExpired
                ? t(
                    "It's been more than 24 hours since their last message, so WhatsApp only allows an approved template.",
                  )
                : t("Pick an approved template, fill in its details and send.")}
            </DialogDescription>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* On a phone the list and the chosen template take turns. */}
          <aside
            className={cn(
              "flex min-h-0 w-full flex-col border-border sm:w-80 sm:shrink-0 sm:border-r",
              selected && "hidden sm:flex",
            )}
          >
            <div className="flex flex-col gap-2 border-b border-border p-3">
              <InputGroup>
                <InputGroupAddon>
                  <IconSearch />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder={t("Search templates")}
                  aria-label={t("Search templates")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              <TeamSelector value={teamId} onChange={setTeamId} className="w-full" />
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Category")}>
                  {[null, ...categories].map((value) => (
                    <button
                      key={value ?? "all"}
                      type="button"
                      aria-pressed={category === value}
                      onClick={() => setCategory(value)}
                      className={cn(
                        "rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted",
                        category === value && "border-primary/40 bg-primary/10 text-primary",
                      )}
                    >
                      {value ? t(CATEGORY_LABEL[value] ?? value) : t("All")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {templatesLoading ? (
                <div className="flex flex-col gap-2 p-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-18 w-full rounded-lg" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <Empty className="p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <IconTemplate />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">
                      {approved.length ? t("No matching templates") : t("No approved templates")}
                    </EmptyTitle>
                    <EmptyDescription className="text-xs">
                      {approved.length
                        ? t("Try another word or category.")
                        : t("Templates appear here once Meta approves them for this team.")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="flex flex-col gap-1">
                  {visible.map((tpl) => {
                    const header = tpl.data.components.find((c) => c.type === "HEADER");
                    const HeaderIcon =
                      header?.format && header.format !== "TEXT"
                        ? HEADER_ICON[header.format]
                        : null;
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <li key={tpl.id}>
                        <button
                          type="button"
                          aria-current={isSelected}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={cn(
                            "flex w-full flex-col gap-1 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted",
                            isSelected && "border-primary/30 bg-primary/5 hover:bg-primary/5",
                          )}
                        >
                          <span className="flex w-full items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                              {tpl.data.name}
                            </span>
                            {HeaderIcon && (
                              <HeaderIcon
                                className="size-3.5 shrink-0 text-muted-foreground"
                                aria-label={header?.format?.toLowerCase()}
                              />
                            )}
                          </span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {bodyText(tpl.data)}
                          </span>
                          <span className="flex items-center gap-1.5 pt-0.5">
                            <Badge variant="outline" className="h-4.5 px-1.5 text-[10px]">
                              {t(CATEGORY_LABEL[tpl.data.category] ?? tpl.data.category)}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground uppercase">
                              {tpl.data.language}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section
            className={cn("min-h-0 min-w-0 flex-1 flex-col", selected ? "flex" : "hidden sm:flex")}
          >
            {selected ? (
              <WaInboxTemplatePreviewNew
                key={selected.id}
                teamId={teamId}
                template={selected.data}
                selectedTemplateId={selected.id}
                sendTemplate={sendTemplate}
                onClose={close}
                onBack={() => setSelectedTemplateId("")}
                whatsappSettingsPhoneId={whatsappSettingsPhoneId}
              />
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconTemplate />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">{t("Choose a template")}</EmptyTitle>
                  <EmptyDescription>
                    {t("Its preview appears here, with anything you need to fill in.")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
