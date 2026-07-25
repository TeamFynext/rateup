import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { MessagePlatform } from "@/types/enums.ts";

export interface ChannelOption {
  /** What the inbox filter stores: a phone number (or phone id), an IG account id or a FB page id. */
  value: string;
  label: string;
  status?: string;
  platform: MessagePlatform;
}

interface ChannelOptionsInput {
  platform?: MessagePlatform | "all";
  /** WhatsApp entries carry the bare phone number rather than the phone id. */
  usePhoneNumber?: boolean;
  filterIds?: string[];
}

/**
 * The connected channels, flattened out of the WhatsApp settings rows — one entry
 * per WhatsApp number, Instagram account and Facebook page.
 *
 * Shared so the inbox's Channel filter and every AccountSelector offer the same
 * list with the same values; the inbox filter and the API match on `value`.
 */
export function getChannelOptions(
  waSettings: WaSettings | undefined,
  {
    platform = MessagePlatform.WHATSAPP,
    usePhoneNumber = false,
    filterIds,
  }: ChannelOptionsInput = {},
): ChannelOption[] {
  const options: ChannelOption[] = [];
  const include = (value: string) => Boolean(value) && (!filterIds || filterIds.includes(value));

  for (const account of waSettings ?? []) {
    if (platform === "all" || platform === MessagePlatform.WHATSAPP) {
      const value = usePhoneNumber ? account?.phone?.replace("+", "") : account.phoneId;
      if (include(value)) {
        options.push({
          value,
          label: account?.phoneDisplayName || account.phone,
          status: account.status,
          platform: MessagePlatform.WHATSAPP,
        });
      }
    }

    if ((platform === "all" || platform === MessagePlatform.INSTAGRAM) && include(account.ibaId)) {
      options.push({
        value: account.ibaId,
        label: account.igUserName ?? account.ibaId,
        status: account.status,
        platform: MessagePlatform.INSTAGRAM,
      });
    }

    if (
      (platform === "all" || platform === MessagePlatform.FACEBOOK) &&
      include(account.fbPageId)
    ) {
      options.push({
        value: account.fbPageId,
        label: account.fbUserName ?? account.fbPageId,
        status: account.status,
        platform: MessagePlatform.FACEBOOK,
      });
    }
  }

  return options;
}
