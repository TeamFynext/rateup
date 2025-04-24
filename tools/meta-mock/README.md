# WhatsApp API Mock Server

A mock server that simulates WhatsApp's Business API for message sending and status updates.

## Features

- Simulates sending WhatsApp messages via POST requests
- Provides realistic status updates (sent → delivered → read) with timing delays
- Sends webhook notifications with status updates matching WhatsApp's format
- Random chance of message failure to simulate real-world scenarios

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Configure environment variables in `.env`:

   ```
   PORT=3004                                    # Port for the mock server
   DEFAULT_WEBHOOK_URL=http://your-webhook-url  # Default webhook destination for status updates
   ```

3. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Send Message

```
POST /v1/messages
```

Request body:

```json
{
  "to": "9198765432",
  "text": "Your message here",
  "webhook_url": "http://your-webhook-url" // Optional - overrides DEFAULT_WEBHOOK_URL
}
```

Response:

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "9198765432",
      "wa_id": "9198765432"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgM9198765432FQIAERgSQzk4QzE4QkQzMjVDRTM2Q0UzAA=="
    }
  ]
}
```

## Webhook Status Updates

After sending a message, the server will send status updates to your webhook URL with the following structure:

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
                "id": "wamid.HBgM9198765432FQIAERgSQzk4QzE4QkQzMjVDRTM2Q0UzAA==",
                "status": "delivered", // Can be: sent, delivered, read, failed
                "timestamp": "1745484275",
                "recipient_id": "9198765432",
                "conversation": {
                  "id": "a5772f1968fbe674582932531791562d",
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

## Testing

To test the service, you can use a service like [webhook.site](https://webhook.site) to generate a temporary webhook URL and observe the status updates in real-time.
