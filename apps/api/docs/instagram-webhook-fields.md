# Instagram webhook fields

Instagram's webhook fields are subscribed at **app level** in the Meta dashboard
(App → Webhooks → Instagram), not by code. `PAGE_SUBSCRIBED_FIELDS` in
`src/modules/meta/channels/metaChannel.service.ts` subscribes only the linked
Facebook Page. If a field below is not ticked in the dashboard, the matching feature
silently does nothing. Keep this list in step with `handleInstagramWebhook`
(`src/modules/meta/instagram/instagram.service.ts`).

Callback URL: `https://<api host>/api/instagram/webhook`

| Field                 | What RateUp does with it                                              | Handler                                  |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `messages`            | DMs, story replies, story mentions, shared posts/reels, ad referrals  | `handleInstagramMessages`, story mention |
| `messaging_postbacks` | Ice breakers, persistent menu, card buttons                           | `handleInstagramPostback`                |
| `messaging_referral`  | ig.me links opened in an existing thread                              | `handleInstagramReferral`                |
| `message_reactions`   | Reactions on messages                                                 | `handleInstagramMessageReaction`         |
| `messaging_seen`      | Read receipts                                                         | `handleInstagramMessageSeen`             |
| `message_edit`        | Customer edited a message (sets `WaMessage.editedAt`)                 | `handleInstagramMessageEdit`             |
| `comments`            | Comment automations, comment-to-buy, post attribution for analytics   | `handleInstagramComment`                 |
| `live_comments`       | Comments on live videos                                               | `handleInstagramComment`                 |
| `mentions`            | Business tagged in a caption or comment (loyalty points for mentions) | `handleInstagramMentionChange`           |

Notes:

- Meta's docs spell the edit field `message_edit` on the Instagram object and
  `message_edits` on Messenger. Use `message_edit` here; if the dashboard refuses it,
  try `message_edits`.
- `mentions` is not sent for stories (those arrive as `story_mention` DMs) or for media on
  private accounts.

## Permissions to request in App Review

| Permission / feature             | Needed for                                                            |
| -------------------------------- | --------------------------------------------------------------------- |
| `instagram_manage_messages`      | Everything in the inbox                                               |
| Human Agent (feature)            | Agent replies 24 h–7 days after the customer's last message           |
| `instagram_manage_comments`      | Comment automations, moderation (list, hide, delete, reply), mentions |
| `instagram_manage_engagement`    | Like / unlike comments                                                |
| `instagram_manage_insights`      | The Instagram analytics view                                          |
| `business_management` (Advanced) | Block / unblock / move to spam                                        |
| `pages_read_engagement`          | Comments and mentions through the Page token                          |
