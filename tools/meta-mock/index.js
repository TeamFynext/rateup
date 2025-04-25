import express from "express";
import axios from "axios";
import "dotenv/config";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3004;
const DEFAULT_WEBHOOK_URL =
  process.env.DEFAULT_WEBHOOK_URL || "http://127.0.0.1:3001/api/wa/webhook";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulate phone numbers
const PHONE_NUMBER_ID = "118179707918172";
const DISPLAY_PHONE_NUMBER = "917907137774";
const BUSINESS_ACCOUNT_ID = "119589194441445";

// Generate a WhatsApp message ID
function generateMessageId(recipientId) {
  const randomBytes = crypto.randomBytes(12).toString("hex").toUpperCase();
  const base = `wamid.Test${recipientId}FQIAER${randomBytes}AA==`;
  return base;
}

// Generate timestamp (seconds since epoch)
function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

// Generate a random conversation ID
function generateConversationId() {
  return crypto.randomBytes(16).toString("hex");
}

// Create webhook payload for status updates
function createStatusPayload(messageId, recipientId, status) {
  const timestamp = generateTimestamp();
  const conversationId = generateConversationId();

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: BUSINESS_ACCOUNT_ID,
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: DISPLAY_PHONE_NUMBER,
                phone_number_id: PHONE_NUMBER_ID,
              },
              statuses: [
                {
                  id: messageId,
                  status: status,
                  timestamp: timestamp,
                  recipient_id: recipientId,
                  conversation: {
                    id: conversationId,
                    origin: {
                      type: "marketing",
                    },
                  },
                  pricing: {
                    billable: true,
                    pricing_model: "CBP",
                    category: "marketing",
                  },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

// Send status update to webhook
async function sendStatusUpdate(webhookUrl, payload,phoneNumber) {
  try {
    console.log(
      `Sending ${payload.entry[0].changes[0].value.statuses[0].status} status to webhook... ,${phoneNumber}`
    );
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(`Webhook notification sent successfully: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`Error sending webhook notification: ${error.message}`);
    return false;
  }
}

// Simulate message status progression with sequential updates
async function simulateStatusProgression(messageId, recipientId, webhookUrl,to) {
  // First always send "sent" status
  const sentPayload = createStatusPayload(messageId, recipientId, "sent");

  try {
    // Send the "sent" status first
    await sendStatusUpdate(webhookUrl, sentPayload,to);

    // Small random chance of message failure (20%)
    const willFail = Math.random() < 0.2;

    if (willFail) {
      // Wait 2 seconds and then send failed status (only after sent)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const failedPayload = createStatusPayload(
        messageId,
        recipientId,
        "failed"
      );
      // Add errors field to the failed status
      failedPayload.entry[0].changes[0].value.statuses[0].errors = [
        {
          code: 131026,
          title: "Message undeliverable",
          message: "Message undeliverable",
          error_data: {
            details: "Message Undeliverable.",
          },
        },
      ];
      await sendStatusUpdate(webhookUrl, failedPayload,to);
      // No further status updates after failure
      return;
    }

    // Otherwise continue with delivered after a delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const deliveredPayload = createStatusPayload(
      messageId,
      recipientId,
      "delivered"
    );
    await sendStatusUpdate(webhookUrl, deliveredPayload,to);

    // Finally send read status after another delay
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const readPayload = createStatusPayload(messageId, recipientId, "read");
    await sendStatusUpdate(webhookUrl, readPayload,to);
  } catch (error) {
    console.error(`Error in status progression sequence: ${error.message}`);
  }
}

// Routes

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WhatsApp API mock server is running",
  });
});

// Send message endpoint
app.post("/v1/messages", async (req, res) => {
  try {
    const { to } = req.body;
    console.log("🚀 ~ app.post ~ to:", to)
    if (!to) {
      return res.status(400).json({
        error: {
          message: "Recipient phone number is required",
          error_user_msg: "Recipient phone number is required",
          type: "OAuthException",
          code: 100,
          fbtrace_id: crypto.randomBytes(8).toString("hex"),
        },
      });
    }

    // Generate message ID and prepare response
    const recipientId = to.replace("+", "");
    const messageId = generateMessageId(recipientId);
    const webhookUrl = DEFAULT_WEBHOOK_URL;

    await simulateStatusProgression(messageId, recipientId, webhookUrl,to);

    // Return immediate success response similar to actual WhatsApp API
    res.status(200).json({
      messaging_product: "whatsapp",
      contacts: [
        {
          input: to,
          wa_id: recipientId,
        },
      ],
      messages: [
        {
          id: messageId,
        },
      ],
    });
  } catch (error) {
    console.error(`Error processing message request: ${error.message}`);
    res.status(500).json({
      error: {
        message: error.message || "Internal server error",
        error_user_msg: error.message || "Internal server error",
        type: "GraphMethodException",
        code: 1,
        fbtrace_id: crypto.randomBytes(8).toString("hex"),
      },
    });
  }
});

// Start server
app.listen(PORT,"::", () => {
  console.log(`WhatsApp API mock server running on port ${PORT}`);
  console.log(`Default webhook URL: ${DEFAULT_WEBHOOK_URL}`);
});
