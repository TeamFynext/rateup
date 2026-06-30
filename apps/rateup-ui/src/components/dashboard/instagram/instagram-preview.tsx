import { IconMenu2, IconPhone, IconSend, IconVideo } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function DmHeader({
  name,
  showActions = false,
}: Readonly<{ name: string; showActions?: boolean }>) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <span className="text-xs text-muted-foreground">←</span>
      <div className="size-5 rounded-full bg-linear-to-br from-purple-400 to-pink-400" />
      <span className="flex-1 text-xs font-semibold">{name}</span>
      {showActions && (
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <IconPhone className="size-3.5" />
          <IconVideo className="size-3.5" />
          <IconMenu2 className="size-3.5" />
        </div>
      )}
    </div>
  );
}

export function IceBreakersPhone({
  items,
  businessName,
}: Readonly<{
  items: { question: string }[];
  businessName: string;
}>) {
  const { t } = useTranslation();
  const displayItems = items.filter((i) => i.question.trim());

  return (
    <>
      <DmHeader name={businessName || "Your Business"} />
      <div className="flex flex-col items-center px-3 py-4">
        <div className="size-10 rounded-full bg-linear-to-br from-purple-400 to-pink-400" />
        <p className="mt-1.5 text-[11px] font-semibold">{businessName || "Your Business"}</p>
        <p className="text-[9px] text-muted-foreground">Instagram</p>
      </div>
      <div className="space-y-1.5 px-3 pb-2">
        {displayItems.length > 0 ? (
          displayItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-[10px]"
            >
              <span className="line-clamp-1">{item.question}</span>
              <span className="ml-1 text-muted-foreground">→</span>
            </div>
          ))
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-[10px] text-muted-foreground">
              <span>{t("Your question here...")}</span>
              <span>→</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-[10px] text-muted-foreground">
              <span>{t("Another question...")}</span>
              <span>→</span>
            </div>
          </>
        )}
      </div>
      <div className="mt-auto border-t px-3 py-2">
        <div className="rounded-full border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
          {t("Message...")}
        </div>
      </div>
    </>
  );
}

export function PersistentMenuPhone({
  items,
  businessName,
}: Readonly<{
  items: { title: string; type: string; url?: string }[];
  businessName: string;
}>) {
  const { t } = useTranslation();
  const name = businessName || "Your Business";
  const suggestions = items.filter((i) => i.type !== "web_url" && i.title.trim());
  const websiteItem = items.find((i) => i.type === "web_url" && i.title.trim());

  return (
    <div className="relative flex h-full flex-col">
      <DmHeader name={name} showActions />

      {/* Dimmed chat behind the sheet */}
      <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
        <p className="text-center text-[9px] text-muted-foreground">10:32 AM</p>
        <div className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-sm bg-[#0a84ff] px-3 py-1.5 text-[10px] text-white">
          {t("Live chat with a person")}
        </div>
        <p className="text-center text-[9px] text-muted-foreground">{t("Shane joined the chat")}</p>
        <div className="flex items-end gap-1.5">
          <div className="size-5 shrink-0 rounded-full bg-linear-to-br from-amber-300 to-orange-400" />
          <div className="w-fit max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-1.5 text-[10px]">
            {t(
              "Hi! My name is Shane! I'm a customer support rep with {name}, how can I help you?",
              {
                name,
              },
            )}
          </div>
        </div>
      </div>

      {/* Dim overlay + bottom sheet */}
      <div className="absolute inset-0 bg-black/40">
        <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background pb-2 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          <div className="flex justify-center pb-1 pt-2">
            <div className="h-1 w-8 rounded-full bg-border" />
          </div>
          <p className="px-3 text-center text-[12px] font-semibold text-foreground">
            {t("More options")}
          </p>
          <p className="px-3 pb-2 text-center text-[9px] text-muted-foreground">
            {t("Tap to send a suggestion from {name}", { name })}
          </p>
          <div className="space-y-1.5 px-4 pb-2">
            {(suggestions.length > 0
              ? suggestions
              : [{ title: t("Nearby locations") }, { title: t("Refund policy") }]
            ).map((item, i) => (
              <div
                key={i}
                className="rounded-full bg-muted px-3 py-1.5 text-center text-[10px] font-medium text-[#0a84ff]"
              >
                {item.title}
              </div>
            ))}
          </div>
          {websiteItem && (
            <>
              <div className="h-px bg-border" />
              <div className="px-3 pt-2 text-center">
                <p className="text-[11px] font-semibold text-foreground">
                  {t("Visit the website")}
                </p>
                <p className="truncate text-[9px] text-muted-foreground">{websiteItem.url}</p>
              </div>
            </>
          )}
          <div className="flex justify-center pt-2">
            <div className="h-1 w-25 rounded-full bg-foreground/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function IgMeLinkPhone({
  link,
  businessName,
}: Readonly<{
  link: string;
  businessName: string;
}>) {
  const { t } = useTranslation();

  return (
    <>
      <DmHeader name={businessName || "Your Business"} />
      <div className="flex flex-col items-center px-3 py-4">
        <div className="size-10 rounded-full bg-linear-to-br from-purple-400 to-pink-400" />
        <p className="mt-1.5 text-[11px] font-semibold">{businessName || "Your Business"}</p>
        <p className="text-[9px] text-muted-foreground">Instagram</p>
      </div>
      <div className="px-3 pb-2">
        <div className="rounded-lg border bg-muted/30 p-2">
          <p className="text-center text-[9px] text-muted-foreground">
            {t("User taps the ig.me link")}
          </p>
          <p className="mt-1 break-all text-center font-mono text-[8px] text-primary">
            {link || "ig.me/m/username?ref=..."}
          </p>
          <p className="mt-1 text-center text-[9px] text-muted-foreground">↓</p>
          <p className="text-center text-[9px] text-muted-foreground">
            {t("Opens this DM thread")}
          </p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
          <IconSend className="size-3 text-amber-600" />
          <p className="text-[9px] text-amber-700 dark:text-amber-400">
            {t("ref parameter is sent to your bot as a hidden payload")}
          </p>
        </div>
      </div>
      <div className="mt-auto border-t px-3 py-2">
        <div className="rounded-full border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
          {t("Message...")}
        </div>
      </div>
    </>
  );
}
