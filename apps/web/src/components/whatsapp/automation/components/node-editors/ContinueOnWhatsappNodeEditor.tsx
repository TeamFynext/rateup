import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query.ts";

import { ContainedSelection, ContainedTextField } from "../editor-ui.tsx";
import { useFieldError } from "./shared.tsx";
import type { NodeComponentProps } from "./shared.tsx";

/**
 * "Continue on WhatsApp" (Instagram and Messenger journeys only): sends a card whose button
 * opens a chat with one of the org's WhatsApp numbers, the prefill typed in along with a
 * one-time code. When the customer sends it, their WhatsApp number is linked to this contact.
 */
export const ContinueOnWhatsappNodeEditor: React.FC<
  NodeComponentProps<"continueOnWhatsappNode">
> = ({ nodeData, handleInputChange }) => {
  const { t } = useTranslation();
  const { data: numbers = [], isPending } = useChannels(true, "WHATSAPP");
  const channelError = useFieldError("channelId");
  const bodyError = useFieldError("body");
  const buttonError = useFieldError("buttonLabel");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t(
          "Sends a button that opens a chat with your WhatsApp number. When the customer sends the message, their WhatsApp number is linked to this contact.",
        )}
      </p>

      <ContainedSelection
        label={t("WhatsApp number")}
        placeholder={t("Select a WhatsApp number")}
        required
        data={numbers.map((number) => ({
          value: number.id,
          label: [number.name, number.address].filter(Boolean).join(" · ") || number.accountId,
        }))}
        value={nodeData.channelId || null}
        onChange={(value) => handleInputChange("channelId", value)}
        error={channelError}
        description={
          !isPending && numbers.length === 0 ? t("Connect a WhatsApp number first.") : undefined
        }
      />

      <ContainedTextField
        label={t("Message")}
        required
        value={nodeData.body || ""}
        maxLength={80}
        placeholder={t("Tap below to continue this chat on WhatsApp.")}
        onChange={(e) => handleInputChange("body", e.target.value)}
        description={t("Shown above the button (up to 80 characters).")}
        error={bodyError}
      />

      <ContainedTextField
        label={t("Button label")}
        required
        value={nodeData.buttonLabel || ""}
        maxLength={20}
        placeholder={t("Open WhatsApp")}
        onChange={(e) => handleInputChange("buttonLabel", e.target.value)}
        description={t("Up to 20 characters.")}
        error={buttonError}
      />

      <ContainedTextField
        label={t("Prefilled message")}
        value={nodeData.prefill || ""}
        maxLength={200}
        placeholder={t("Hi! I'd like to continue our chat here.")}
        onChange={(e) => handleInputChange("prefill", e.target.value)}
        description={t(
          "What the customer's WhatsApp message starts with. A short code is added after it to link the two chats.",
        )}
      />
    </div>
  );
};
