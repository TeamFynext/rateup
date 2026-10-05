/**
 * Instagram Messaging Service
 * Handles sending different types of Instagram messages via Meta Graph API
 * Isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";
import { sendMetaMessage } from "../meta/metaMessage.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getInstagramChannel, updateMetaChannelById } from "../metaChannel/metaChannel.service.js";

/** Instagram's messenger-profile surface (ice breakers, persistent menu). */
async function callInstagramMessengerProfileApi(
  pageAccessToken: string,
  method: "GET" | "POST" | "DELETE",
  data?: Record<string, unknown>,
  params?: Record<string, unknown>,
) {
  const response = await callMetaApi(
    `/me/messenger_profile?platform=instagram`,
    method,
    pageAccessToken,
    data,
    {},
    {},
    params,
  );

  return response.data;
}

/**
 * File a message we just sent against the contact's ticket.
 *
 * Every automated Instagram send funnels through the helpers below, and none of
 * them used to record what they sent: the reply reached the customer, but the
 * inbox showed only the customer's half of the conversation. Meta's send
 * response carries `recipient_id`, which is how a private reply — addressed to a
 * comment rather than a person — still lands on the right contact.
 *
 * Storage failures are logged, not thrown. The message is already delivered;
 * reporting it as failed would be a worse lie than a missing row.
 */

export async function sendInstagramPrivateReply(
  commentId: string,
  text: string,
  ibaId: string,
  orgId: string,
  /** Known by the automation that triggered this; Meta's response is the fallback. */
  igsId?: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
    }

    const { pageAccessToken, fbPageId } = channel;

    if (!fbPageId) {
      throw new Error(`No Facebook Page ID configured for ibaId ${ibaId}`);
    }

    const payload = {
      recipient: { comment_id: commentId },
      message: { text },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(
      `[Instagram Messaging] Sent private reply to comment ${commentId}: "${text.substring(0, 50)}..."`,
    );

    // No igsId of our own: a private reply is addressed to the comment, so the
    // contact it belongs to comes from Meta's `recipient_id`.

    return { message_id: result.messageId };
  } catch (error) {
    log.error(
      { err: error },
      `[Instagram Messaging] Error sending private reply to comment ${commentId}`,
    );
    throw error;
  }
}

/**
 * Send a text message via Instagram
 */
export async function sendInstagramTextMessage(
  igsId: string,
  text: string,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    // Get settings for this organization
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    // Prepare the message payload
    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        text: text,
      },
    };

    // Send via Meta Graph API
    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(
      `[Instagram Messaging] Sent text message to igsId ${igsId}: "${text.substring(0, 50)}..."`,
    );

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending text message to ${igsId}`);
    throw error;
  }
}

/**
 * Send an image via Instagram
 */
export async function sendInstagramImage(
  igsId: string,
  imageUrl: string,
  orgId: string,
  ibaId: string,
  caption?: string,
): Promise<{ image: unknown; caption?: { sent: boolean; error?: unknown } }> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for igsId ${igsId} in org ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: true,
          },
        },
      },
    };

    // Send the image
    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(`[Instagram Messaging] Sent image to igsId ${igsId}: ${imageUrl}`);

    // The caption goes out as its own message, and files itself when it does.

    if (!caption) {
      return { image: { message_id: result.messageId } };
    }

    try {
      await sendInstagramTextMessage(igsId, caption, orgId, ibaId);
      return { image: { message_id: result.messageId }, caption: { sent: true } };
    } catch (captionError) {
      log.error(
        { err: captionError },
        `[Instagram Messaging] Image delivered to ${igsId} but its caption failed`,
      );
      return {
        image: { message_id: result.messageId },
        caption: { sent: false, error: captionError },
      };
    }
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending image to ${igsId}`);
    throw error;
  }
}

/**
 * Send a generic template (carousel with buttons) via Instagram
 */
export async function sendInstagramGenericTemplate(
  igsId: string,
  elements: Array<{
    title: string;
    subtitle?: string;
    image_url?: string;
    buttons?: Array<{
      type: "postback" | "web_url";
      title: string;
      payload?: string;
      url?: string;
    }>;
  }>,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: elements.map((element) => ({
              title: element.title,
              subtitle: element.subtitle || "",
              image_url: element.image_url || "",
              buttons:
                element.buttons?.map((button) => ({
                  type: button.type,
                  title: button.title,
                  payload: button.payload,
                  url: button.url,
                })) || [],
            })),
          },
        },
      },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(
      `[Instagram Messaging] Sent generic template to igsId ${igsId} with ${elements.length} elements`,
    );

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending generic template to ${igsId}`);
    throw error;
  }
}

/**
 * Send a quick reply message via Instagram
 */
export async function sendInstagramQuickReply(
  igsId: string,
  text: string,
  quickReplies: Array<{
    content_type: "text";
    title: string;
    payload: string;
    image_url?: string;
  }>,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        text: text,
        quick_replies: quickReplies.map((qr) => ({
          content_type: qr.content_type || "text",
          title: qr.title,
          payload: qr.payload,
          image_url: qr.image_url,
        })),
      },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(
      `[Instagram Messaging] Sent quick reply to igsId ${igsId} with ${quickReplies.length} options`,
    );

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending quick reply to ${igsId}`);
    throw error;
  }
}

/**
 * Send a product template via Instagram.
 * Product details (image, title, price) are automatically pulled from the catalog.
 * Supports single product or carousel (up to 10 products).
 */
export async function sendInstagramProductTemplate(
  igsId: string,
  productIds: string[],
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "product",
            elements: productIds.map((id) => ({ id })),
          },
        },
      },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(
      `[Instagram Messaging] Sent product template to igsId ${igsId} for products ${productIds.join(", ")}`,
    );

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending product template to ${igsId}`);
    throw error;
  }
}

/**
 * Send a story reply via Instagram
 */
export async function sendInstagramStoryReply(
  igsId: string,
  storyId: string,
  text: string,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        text: text,
        attachment: {
          type: "story_mention",
          payload: {
            id: storyId,
          },
        },
      },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(`[Instagram Messaging] Sent story reply to igsId ${igsId} for story ${storyId}`);

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending story reply to ${igsId}`);
    throw error;
  }
}

/**
 * Set ice breakers for Instagram profile
 * Note: This is a profile-level configuration, not a per-message setting
 */
export async function setInstagramIceBreakers(
  iceBreakers: Array<{
    question: string;
    payload: string;
  }>,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;
    if (!pageAccessToken) {
      throw new Error(`No Instagram page access token configured for ibaId ${ibaId}`);
    }

    const payload = {
      ice_breakers: iceBreakers.map((iceBreaker) => ({
        question: iceBreaker.question,
        payload: iceBreaker.payload,
      })),
    };

    const response = await callInstagramMessengerProfileApi(pageAccessToken, "POST", payload);

    await updateMetaChannelById(channel.id, channel.orgId, {
      instagramIceBreakers: iceBreakers,
    });

    log.info(`[Instagram Messaging] Set ${iceBreakers.length} ice breakers for ibaId ${ibaId}`);

    return response;
  } catch (error) {
    log.error(
      { err: error },
      `[Instagram Messaging] Error setting ice breakers for ibaId ${ibaId}`,
    );
    throw error;
  }
}

export async function getInstagramIceBreakers(orgId: string, ibaId: string) {
  const channel = await getInstagramChannel(ibaId, orgId);

  if (!channel) {
    throw new Error(`No Instagram settings found for organization ${orgId}`);
  }

  if (channel.instagramIceBreakers) {
    return {
      ice_breakers: channel.instagramIceBreakers,
    };
  }

  const { pageAccessToken } = channel;
  if (!pageAccessToken) {
    throw new Error(`No Instagram page access token configured for ibaId ${ibaId}`);
  }
  const response = await callInstagramMessengerProfileApi(pageAccessToken, "GET", undefined, {
    fields: "ice_breakers",
  });

  const iceBreakers = unwrapMessengerProfileField<{ question: string; payload: string }>(
    response,
    "ice_breakers",
  );
  await updateMetaChannelById(channel.id, channel.orgId, {
    instagramIceBreakers: iceBreakers,
  });

  return { ice_breakers: iceBreakers };
}

function unwrapMessengerProfileField<T>(response: unknown, field: string): T[] {
  const body = response as
    | { data?: Array<Record<string, unknown>> | Record<string, unknown>; [k: string]: unknown }
    | null
    | undefined;
  if (!body) return [];

  const topLevel = body[field];
  if (Array.isArray(topLevel)) return topLevel as T[];

  const data = body.data;
  const first = Array.isArray(data) ? data[0] : data;
  const nested = (first as Record<string, unknown> | undefined)?.[field];
  return Array.isArray(nested) ? (nested as T[]) : [];
}

export async function deleteInstagramIceBreakers(orgId: string, ibaId: string) {
  const channel = await getInstagramChannel(ibaId, orgId);

  if (!channel) {
    throw new Error(`No Instagram settings found for organization ${orgId}`);
  }

  const { pageAccessToken } = channel;
  if (!pageAccessToken) {
    throw new Error(`No Instagram page access token configured for ibaId ${ibaId}`);
  }
  const response = await callInstagramMessengerProfileApi(pageAccessToken, "DELETE", {
    fields: ["ice_breakers"],
  });
  await updateMetaChannelById(channel.id, channel.orgId, {
    instagramIceBreakers: [],
  });
  return response;
}

export async function setInstagramPersistentMenu(
  menus: Array<{
    locale: string;
    call_to_actions: Array<{
      type: "postback" | "web_url";
      title: string;
      payload?: string;
      url?: string;
    }>;
  }>,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  const channel = await getInstagramChannel(ibaId, orgId);

  if (!channel) {
    throw new Error(`No Instagram settings found for organization ${orgId}`);
  }

  const { pageAccessToken } = channel;
  if (!pageAccessToken) {
    throw new Error(`No Instagram page access token configured for ibaId ${ibaId}`);
  }
  const response = await callInstagramMessengerProfileApi(pageAccessToken, "POST", {
    persistent_menu: menus,
  });

  await updateMetaChannelById(channel.id, channel.orgId, {
    instagramPersistentMenu: menus,
  });

  return response;
}

export async function getInstagramPersistentMenu(orgId: string, ibaId: string) {
  const channel = await getInstagramChannel(ibaId, orgId);

  if (!channel) {
    throw new Error(`No Instagram settings found for organization ${orgId}`);
  }

  if (channel.instagramPersistentMenu) {
    return {
      persistent_menu: channel.instagramPersistentMenu,
    };
  }

  const { pageAccessToken } = channel;
  if (!pageAccessToken) {
    throw new Error(`No Instagram page access token configured for ibaId ${ibaId}`);
  }
  const response = await callInstagramMessengerProfileApi(pageAccessToken, "GET", undefined, {
    fields: "persistent_menu",
  });

  const persistentMenu = unwrapMessengerProfileField<InstagramPersistentMenuEntry>(
    response,
    "persistent_menu",
  );
  await updateMetaChannelById(channel.id, channel.orgId, {
    instagramPersistentMenu: persistentMenu,
  });

  return { persistent_menu: persistentMenu };
}

export async function deleteInstagramPersistentMenu(orgId: string, ibaId: string) {
  const channel = await getInstagramChannel(ibaId, orgId);

  if (!channel) {
    throw new Error(`No Instagram settings found for organization ${orgId}`);
  }

  const { pageAccessToken } = channel;
  if (!pageAccessToken) {
    throw new Error(`No Instagram page access token configured for ibaId ${ibaId}`);
  }
  const response = await callInstagramMessengerProfileApi(pageAccessToken, "DELETE", {
    fields: ["persistent_menu"],
  });
  await updateMetaChannelById(channel.id, channel.orgId, {
    instagramPersistentMenu: [],
  });
  return response;
}

/**
 * Send a video via Instagram
 */
export async function sendInstagramVideo(
  igsId: string,
  videoUrl: string,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        attachment: {
          type: "video",
          payload: {
            url: videoUrl,
            is_reusable: true,
          },
        },
      },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(`[Instagram Messaging] Sent video to igsId ${igsId}: ${videoUrl}`);

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending video to ${igsId}`);
    throw error;
  }
}

/**
 * Send a file via Instagram
 */
export async function sendInstagramFile(
  igsId: string,
  fileUrl: string,
  orgId: string,
  ibaId: string,
): Promise<unknown> {
  try {
    const channel = await getInstagramChannel(ibaId, orgId);

    if (!channel) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = channel;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        attachment: {
          type: "file",
          payload: {
            url: fileUrl,
            is_reusable: true,
          },
        },
      },
    };

    const result = await sendMetaMessage({
      platform: PlatformType.INSTAGRAM,
      orgId,
      to: igsId,
      sourceIdentifier: ibaId,
      payload,
      messageType: "AUTOMATED",
      isAutomated: true,
      enforceConversationLimit: true,
    });
    if (!result.ok) throw new Error(result.error);

    log.info(`[Instagram Messaging] Sent file to igsId ${igsId}: ${fileUrl}`);

    return { message_id: result.messageId };
  } catch (error) {
    log.error({ err: error }, `[Instagram Messaging] Error sending file to ${igsId}`);
    throw error;
  }
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink?: string;
}

export interface InstagramStoryItem {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  timestamp: string;
}

export async function getInstagramMediaPosts(ibaId: string): Promise<InstagramMediaItem[]> {
  const channel = await getInstagramChannel(ibaId);
  if (!channel?.pageAccessToken) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }

  const response = await callMetaApi(
    `/${ibaId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,permalink&limit=50`,
    "GET",
    channel.pageAccessToken,
  );

  return (response.data?.data as InstagramMediaItem[]) ?? [];
}

/**
 * The public instagram.com URL for one media item.
 *
 * A comment webhook only carries the media's numeric id, and there is no way to
 * build a permalink from it — instagram.com/p/ URLs use an opaque shortcode — so
 * the link has to be read back from Meta. Permalinks never change, hence the
 * long cache the callers put in front of this.
 */
export async function getInstagramMediaPermalink(
  mediaId: string,
  ibaId: string,
): Promise<string | null> {
  const channel = await getInstagramChannel(ibaId);
  if (!channel?.pageAccessToken) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }

  const response = await callMetaApi(
    `/${mediaId}?fields=permalink,media_type`,
    "GET",
    channel.pageAccessToken,
  );

  // Deleted media, and media on an account the token no longer covers, answer
  // 200 with no permalink rather than erroring.
  return (response.data?.permalink as string | undefined) ?? null;
}

export async function getInstagramStories(ibaId: string): Promise<InstagramStoryItem[]> {
  const channel = await getInstagramChannel(ibaId);
  if (!channel?.pageAccessToken) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }

  const response = await callMetaApi(
    `/${ibaId}/stories?fields=id,media_type,media_url,timestamp&limit=50`,
    "GET",
    channel.pageAccessToken,
  );

  return (response.data?.data as InstagramStoryItem[]) ?? [];
}

/** Answers a comment in public, under the post. Needs instagram_manage_comments. */
export async function replyToInstagramComment(
  commentId: string,
  text: string,
  ibaId: string,
): Promise<{ id?: string }> {
  const waSettings = await getWaSettingsByIbaId(ibaId);
  if (!waSettings?.pageAccessToken) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }

  const response = await callMetaApi(`/${commentId}/replies`, "POST", waSettings.pageAccessToken, {
    message: text,
  });
  return response.data ?? {};
}

/**
 * Whether the user follows the business account. Meta only shares this once the user
 * has messaged the business; before that, and on any error, the answer is "no".
 */
export async function doesUserFollowInstagramAccount(igsId: string, ibaId: string) {
  const waSettings = await getWaSettingsByIbaId(ibaId);
  if (!waSettings?.pageAccessToken) {
    throw new Error(`No Instagram settings found for ibaId ${ibaId}`);
  }

  try {
    const response = await callMetaApi(
      `/${igsId}?fields=is_user_follow_business`,
      "GET",
      waSettings.pageAccessToken,
    );
    return response.data?.is_user_follow_business === true;
  } catch (error) {
    log.warn({ err: error, igsId }, "[Instagram] Could not read whether the user follows");
    return false;
  }
}
