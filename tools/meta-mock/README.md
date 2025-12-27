# Meta WhatsApp API Mock Server

A mock server that simulates the Meta WhatsApp Business API for testing purposes. Supports sending messages, receiving messages, and status updates.

## Features

- ✅ Send text messages (mimics WhatsApp Cloud API `/messages` endpoint)
- ✅ Simulate receiving messages from users
- ✅ Automatic status progression (sent → delivered → read)
- ✅ Manual status update triggers
- ✅ Webhook notifications for all events

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (optional):
Create a `.env` file:
```env
PORT=3004
DEFAULT_WEBHOOK_URL=http://127.0.0.1:3001/api/wa/webhook
```

3. Start the server:
```bash
npm start
```

## API Endpoints

### 1. Send Message

Sends a text message to a recipient and triggers automatic status updates.

**Endpoint:** `POST /v1/messages`

**Request Body:**
```json
{
  "to": "+16505551234",
  "type": "text",
  "text": {
    "body": "Hello from WhatsApp!"
  }
}
```

**Response:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "+16505551234",
      "wa_id": "16505551234"
    }
  ],
  "messages": [
    {
      "id": "wamid.Test16505551234FQIAER..."
    }
  ]
}
```

**Status Progression:**
After sending, the following statuses are automatically sent to the webhook:
1. `sent` (immediate)
2. `delivered` (after 2s)
3. `read` (after 5s)
- or `failed` (20% random chance, after 2s)

---

### 2. Receive Message

Simulates receiving an incoming message from a user (sends webhook notification).

**Endpoint:** `POST /webhook/message`

**Request Body:**
```json
{
  "from": "+16505551234",
  "text": "Does it come in another color?",
  "profileName": "Sheena Nelson",
  "webhookUrl": "http://your-webhook-url.com/webhook"
}
```

**Parameters:**
- `from` (required): User's phone number
- `text` (required): Message text content
- `profileName` (optional): User's display name (default: "User")
- `webhookUrl` (optional): Override default webhook URL

**Response:**
```json
{
  "success": true,
  "message": "Incoming message sent to webhook",
  "messageId": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5...",
  "webhookResponse": 200
}
```

**Webhook Payload Sent:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "119589194441445",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "917907137774",
              "phone_number_id": "118179707918172"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Sheena Nelson"
                },
                "wa_id": "16505551234"
              }
            ],
            "messages": [
              {
                "from": "16505551234",
                "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5...",
                "timestamp": "1749416383",
                "type": "text",
                "text": {
                  "body": "Does it come in another color?"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

---

### 3. Trigger Status Updates

Manually trigger all status updates for a specific message.

**Endpoint:** `POST /webhook/statuses/:messageId`

**URL Parameters:**
- `messageId`: The message ID to send status updates for

**Request Body:**
```json
{
  "recipientId": "16505551234",
  "webhookUrl": "http://your-webhook-url.com/webhook",
  "includeFailed": false
}
```

**Parameters:**
- `recipientId` (required): Recipient's phone number (without +)
- `webhookUrl` (optional): Override default webhook URL
- `includeFailed` (optional): Include failed status (default: false)

**Response:**
```json
{
  "success": true,
  "message": "All status updates sent to webhook",
  "messageId": "wamid.Test16505551234FQIAER...",
  "statuses": ["sent", "delivered", "read"]
}
```

**Webhook Payload Example:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "119589194441445",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "917907137774",
              "phone_number_id": "118179707918172"
            },
            "statuses": [
              {
                "id": "wamid.Test16505551234FQIAER...",
                "status": "delivered",
                "timestamp": "1749416383",
                "recipient_id": "16505551234",
                "conversation": {
                  "id": "abc123...",
                  "origin": {
                    "type": "marketing"
                  }
                },
                "pricing": {
                  "billable": true,
                  "pricing_model": "CBP",
                  "category": "marketing"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

---

## Testing Examples

### Using cURL

**Send a message:**
```bash
curl -X POST http://localhost:3004/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+16505551234",
    "type": "text",
    "text": {
      "body": "Hello World!"
    }
  }'
```

**Simulate receiving a message:**
```bash
curl -X POST http://localhost:3004/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+16505551234",
    "text": "Does it come in another color?",
    "profileName": "Sheena Nelson"
  }'
```

**Trigger status updates:**
```bash
curl -X POST http://localhost:3004/webhook/statuses/wamid.Test16505551234FQIAER123 \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "16505551234"
  }'
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3004)
- `DEFAULT_WEBHOOK_URL`: Default webhook URL for notifications (default: http://127.0.0.1:3001/api/wa/webhook)

### Mock Phone Numbers

Configured in the code:
- `PHONE_NUMBER_ID`: 118179707918172
- `DISPLAY_PHONE_NUMBER`: 917907137774
- `BUSINESS_ACCOUNT_ID`: 119589194441445

## Development

```bash
npm run dev  # Start with auto-reload
```

## Notes

- All message IDs are generated in the format: `wamid.Test{recipientId}FQIAER{randomHex}AA==`
- Status updates are sent with realistic delays (2-5 seconds between statuses)
- 20% random chance of message failure in automatic status progression
- All timestamps are Unix epoch seconds
- Webhook notifications follow the official Meta WhatsApp API format

## License

ISC
