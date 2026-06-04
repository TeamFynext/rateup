/**
 * Instagram Messaging Service
 * Handles sending different types of Instagram messages via Meta Graph API
 * Isolated from WhatsApp to prevent cross-platform interference
 */

import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";
import { getWaSettingsByIbaId } from "../settings/wa_settings.service.js";

/**
 * Send a text message via Instagram
 */
export async function sendInstagramTextMessage(
  igsId: string,
  text: string,
  orgId: string,
  ibaId: string,
): Promise<any> {
  try {
    // Get settings for this organization
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

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
    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(
      `[Instagram Messaging] Sent text message to igsId ${igsId}: "${text.substring(0, 50)}..."`,
    );

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending text message to ${igsId}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Send an image via Instagram
 */
export async function sendInstagramImage(
  igsId: string,
  imageUrl: string,
  caption?: string,
  orgId?: string,
  ibaId?: string,
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId!);

    if (!waSettings) {
      throw new Error(
        `No Instagram settings found for igsId ${igsId} in org ${orgId}`,
      );
    }

    const { pageAccessToken } = waSettings;

    const payload: any = {
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
    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(`[Instagram Messaging] Sent image to igsId ${igsId}: ${imageUrl}`);

    // If caption is provided, send it as a separate text message
    if (caption) {
      await sendInstagramTextMessage(igsId, caption, orgId, ibaId);
    }

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending image to ${igsId}: %o`,
      error,
    );
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
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

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

    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(
      `[Instagram Messaging] Sent generic template to igsId ${igsId} with ${elements.length} elements`,
    );

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending generic template to ${igsId}: %o`,
      error,
    );
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
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

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

    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(
      `[Instagram Messaging] Sent quick reply to igsId ${igsId} with ${quickReplies.length} options`,
    );

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending quick reply to ${igsId}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Send a product template via Instagram
 */
export async function sendInstagramProductTemplate(
  igsId: string,
  product: {
    id: string;
    title?: string;
    subtitle?: string;
    image_url?: string;
    buttons?: Array<{
      type: "web_url";
      title: string;
      url: string;
    }>;
  },
  orgId: string,
  ibaId: string,
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

    const payload = {
      recipient: {
        id: igsId,
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "product",
            elements: [
              {
                id: product.id,
                title: product.title || "",
                subtitle: product.subtitle || "",
                image_url: product.image_url || "",
                buttons:
                  product.buttons?.map((button) => ({
                    type: button.type,
                    title: button.title,
                    url: button.url,
                  })) || [],
              },
            ],
          },
        },
      },
    };

    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(
      `[Instagram Messaging] Sent product template to igsId ${igsId} for product ${product.id}`,
    );

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending product template to ${igsId}: %o`,
      error,
    );
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
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

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

    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(
      `[Instagram Messaging] Sent story reply to igsId ${igsId} for story ${storyId}`,
    );

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending story reply to ${igsId}: %o`,
      error,
    );
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
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

    const payload = {
      ice_breakers: iceBreakers.map((iceBreaker) => ({
        question: iceBreaker.question,
        payload: iceBreaker.payload,
      })),
    };

    const response = await callMetaApi(
      `/${ibaId}/messenger_profile`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(
      `[Instagram Messaging] Set ${iceBreakers.length} ice breakers for ibaId ${ibaId}`,
    );

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error setting ice breakers for ibaId ${ibaId}: %o`,
      error,
    );
    throw error;
  }
}

/**
 * Send a video via Instagram
 */
export async function sendInstagramVideo(
  igsId: string,
  videoUrl: string,
  orgId: string,
  ibaId: string,
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

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

    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(`[Instagram Messaging] Sent video to igsId ${igsId}: ${videoUrl}`);

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending video to ${igsId}: %o`,
      error,
    );
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
): Promise<any> {
  try {
    const waSettings = await getWaSettingsByIbaId(ibaId);

    if (!waSettings) {
      throw new Error(`No Instagram settings found for organization ${orgId}`);
    }

    const { pageAccessToken } = waSettings;

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

    const response = await callMetaApi(
      `/me/messages`,
      "POST",
      pageAccessToken,
      payload,
    );

    log.info(`[Instagram Messaging] Sent file to igsId ${igsId}: ${fileUrl}`);

    return response.data;
  } catch (error) {
    log.error(
      `[Instagram Messaging] Error sending file to ${igsId}: %o`,
      error,
    );
    throw error;
  }
}
