import { useTranslation } from "react-i18next";

import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { cn } from "@/lib/utils.ts";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";

/**
 * Channel scope for the inbox list — WhatsApp number, Instagram account or
 * Facebook page, plus "All".
 *
 * The desktop control is the Channel section of the sidebar's filter group
 * (see `useNavMain`), which is `hidden md:flex`. This compact form is what the
 * list panel header shows in its place below md; both write `filter.phone`, so
 * the two can never disagree.
 */
export default function ChannelFilter({ className }: Readonly<{ className?: string }>) {
  const { filter, setFilter } = useChatFilterStore();
  const { t: translations } = useTranslation();

  return (
    <div className={cn("min-w-0", className)}>
      <AccountSelector
        label={translations("Channel")}
        value={filter?.phone || "all"}
        onChange={(phone) =>
          setFilter({ ...filter, phone: !phone || phone === "all" ? "" : phone })
        }
        usePhoneNumber
        withAllOption
        optional
        showClearButton={false}
        platform="all"
        className="w-full"
      />
    </div>
  );
}
