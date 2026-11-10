/**
 * Facebook Page comments: what RateUp sends back to them. Kept apart from
 * facebook.service.ts, which runs the rules and so cannot be imported by them.
 */

import { callMetaApi } from "../whatsapp/wa_axios.js";
import { getMessengerChannel } from "../channels/metaChannel.service.js";

/**
 * Answers a comment in public, under the post. Needs `pages_manage_engagement` on the
 * Page's connection; without it Meta refuses and the caller logs it.
 */
export async function replyToFacebookComment(
  commentId: string,
  text: string,
  pageId: string,
  orgId?: string,
): Promise<{ id?: string }> {
  const channel = await getMessengerChannel(pageId, orgId);
  if (!channel?.pageAccessToken) {
    throw new Error(`No Messenger channel found for page ${pageId}`);
  }

  const response = await callMetaApi(`/${commentId}/comments`, "POST", channel.pageAccessToken, {
    message: text,
  });
  return response.data ?? {};
}
