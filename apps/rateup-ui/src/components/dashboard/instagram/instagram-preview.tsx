import { IconMenu2, IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function DmHeader({ name }: Readonly<{ name: string }>) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <span className="text-xs text-muted-foreground">←</span>
      <div className="size-5 rounded-full bg-linear-to-br from-purple-400 to-pink-400" />
      <span className="text-xs font-semibold">{name}</span>
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
  items: { title: string; type: string }[];
  businessName: string;
}>) {
  const { t } = useTranslation();
  const displayItems = items.filter((i) => i.title.trim());

  return (
    <>
      <DmHeader name={businessName || "Your Business"} />
      <div className="flex-1 px-3 py-3">
        <div className="w-fit max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3 py-1.5 text-[10px]">
          {t("Hi! How can I help you?")}
        </div>
      </div>
      <div className="border-t">
        <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-1.5">
          <IconMenu2 className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">{t("Menu")}</span>
        </div>
        <div className="divide-y">
          {displayItems.length > 0 ? (
            displayItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 text-[10px]">
                <span>{item.type === "web_url" ? "🌐" : "💬"}</span>
                <span className="line-clamp-1">{item.title}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground">
                <span>💬</span>
                <span>{t("Menu item here...")}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground">
                <span>🌐</span>
                <span>{t("Another item...")}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t px-3 py-2">
        <div className="flex-1 rounded-full border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
          {t("Message...")}
        </div>
        <IconMenu2 className="size-3.5 text-primary" />
      </div>
    </>
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
