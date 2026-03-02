import {
  WaEvent,
  YNResponse,
  LDResponse,
  SmileyResponse,
  CampaignParticipantAddStatus,
  CampaignParticipantStatus,
} from "../../../types/enums.js";
import {
  WaMessageBody,
  WaMessageEchoBody,
  WaMessageTypes,
  WaReceiveMessageBody,
  WaSendMessageBody,
} from "../../../types/whatsapp.types.js";
import { log } from "../../../utils/logger.js";
import { QuestionType as Q } from "../../../types/enums.js";
import { callWhatsappApi } from "../wa_axios.js";
import {
  getWaSettings,
  getWaSettingsByPhone,
  getWaSettingsByPhoneId,
} from "../settings/wa_settings.service.js";
import {
  getFileUrlFromKey,
  uploadFile,
} from "../../../utils/upload/s3Upload.js";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import {
  Contact,
  TemplateType,
  WaSession,
} from "../../../../generated/prisma/client.js";
import { sendMessage } from "./wasurvey.service.js";
import { captureShopifyOrderPayment } from "../../integrations/shopify/shopify.service.js";
import prisma from "../../../utils/prisma.js";
import {
  ButtonOption,
  ListItem,
  NodeType,
  NodeTypeMap,
  TypedNode,
  WhatsAppMessage,
} from "./node-types.js";
import { ContactCore } from "../../contact/contact.schema.js";
import connection from "../../../utils/redisConnection.js";
import crypto from "node:crypto";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { WaMedia } from "../inbox/message/wamessage.service.js";

dayjs.extend(customParseFormat);

const smileyEmojiMap = {
  [SmileyResponse.VeryHappy]: "😁",
  [SmileyResponse.Happy]: "😀",
  [SmileyResponse.Neutral]: "😐",
  [SmileyResponse.Sad]: "🙁",
  [SmileyResponse.VerySad]: "😠",
};
export const ratingEmoji = "⭐️";

export function getEventType(data: WaMessageBody) {
  if (data.object === "whatsapp_business_account") {
    if (data.entry[0].changes[0].field === WaEvent.TemplateStatusChange) {
      return WaEvent.TemplateStatusChange;
    } else if (data.entry[0].changes[0].field === WaEvent.ACCOUNT_UPDATE) {
      return WaEvent.ACCOUNT_UPDATE;
    } else if (
      data.entry[0].changes[0].field === WaEvent.Message &&
      (data.entry[0].changes[0].value as WaReceiveMessageBody).messages
        ?.length > 0
    ) {
      return WaEvent.Message;
    } else if (
      data.entry[0].changes[0].field === WaEvent.SMBMessageEchoes &&
      (data as unknown as WaMessageEchoBody).entry[0].changes[0].value
        .message_echoes?.length > 0
    ) {
      return WaEvent.SMBMessageEchoes;
    } else if (
      (data.entry[0].changes[0].value as WaReceiveMessageBody).statuses?.[0]
        ?.status === "captured" &&
      (data.entry[0].changes[0].value as WaReceiveMessageBody)?.statuses?.[0]
        ?.payment?.transaction?.status === "success" &&
      (data.entry[0].changes[0].value as WaReceiveMessageBody)?.statuses?.[0]
        ?.type === "payment"
    ) {
      return (data.entry[0].changes[0].value as WaReceiveMessageBody)
        ?.statuses?.[0]?.status;
    } else if (
      (data.entry[0].changes[0].value as WaReceiveMessageBody)?.statuses?.[0]
        ?.status
    ) {
      return (data.entry[0].changes[0].value as WaReceiveMessageBody)
        ?.statuses?.[0]?.status as WaEvent;
    }
  }
  if ((data as any).object === "page") {
    if (data?.entry?.[0]?.changes?.[0]?.field === WaEvent.LEADGEN) {
      return WaEvent.LEADGEN;
    } else if (data?.entry?.[0]?.changes?.[0]?.field === WaEvent.Message) {
      return WaEvent.Message;
    }
  }
  return null;
}

enum CatalogMessages {
  Catalog = "Catalog",
  SingleProduct = "Single-Product",
  MultiProduct = "Multi-Product",
  ProductSet = "Product-Set",
}

export async function convertNodeToWhatsAppMessage(
  node: TypedNode,
  recipient: string,
): Promise<WhatsAppMessage | null> {
  const baseMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
  };

  // Use type assertion with the node type
  const nodeType = node.type as NodeType;

  switch (nodeType) {
    case "textNode": {
      const data = node.data as NodeTypeMap["textNode"];
      return {
        ...baseMessage,
        type: "text",
        text: {
          preview_url: data.previewUrl || true,
          body: data.body
            ? parseToWhatsAppFormat(data.body)
            : "Default message",
        },
      };
    }
    case "textInputNode": {
      const data = node.data as NodeTypeMap["textInputNode"];
      return {
        ...baseMessage,
        type: "text",
        text: {
          preview_url: true,
          body: data.question
            ? parseToWhatsAppFormat(data.question)
            : "Default message",
        },
      };
    }

    case "imageNode": {
      const data = node.data as NodeTypeMap["imageNode"];
      return {
        ...baseMessage,
        type: "image",
        image: {
          link: getFileUrlFromKey(data?.link) || "",
          caption: parseToWhatsAppFormat(data.caption) || "",
        },
      };
    }

    case "videoNode": {
      const data = node.data as NodeTypeMap["videoNode"];
      return {
        ...baseMessage,
        type: "video",
        video: {
          link: getFileUrlFromKey(data?.link) || "",
          caption: parseToWhatsAppFormat(data.caption) || "",
        },
      };
    }

    case "audioNode": {
      const data = node.data as NodeTypeMap["audioNode"];
      return {
        ...baseMessage,
        type: "audio",
        audio: {
          link: getFileUrlFromKey(data?.link) || "",
        },
      };
    }

    case "documentNode": {
      const data = node.data as NodeTypeMap["documentNode"];
      return {
        ...baseMessage,
        type: "document",
        document: {
          link: getFileUrlFromKey(data?.link) || "",
          filename: data.filename || "document.pdf",
          caption: parseToWhatsAppFormat(data.caption) || "",
        },
      };
    }

    case "locationNode": {
      const data = node.data as NodeTypeMap["locationNode"];
      return {
        ...baseMessage,
        type: "location",
        location: {
          latitude: data.latitude || "0",
          longitude: data.longitude || "0",
          name: data?.name || "",
          address: data?.address || "",
        },
      };
    }

    case "buttonNode": {
      const data = node.data as NodeTypeMap["buttonNode"];
      let header = undefined;
      if (data?.header && data.headerType === "text") {
        header = {
          type: "text",
          text: data.header || "",
        };
      } else if (data?.link && data.headerType === "image") {
        header = {
          type: "image",
          image: {
            link: getFileUrlFromKey(data.link) || "",
          },
        };
      } else if (data?.link && data.headerType === "video") {
        header = {
          type: "video",
          video: {
            link: getFileUrlFromKey(data.link) || "",
          },
        };
      } else if (data?.link && data.headerType === "document") {
        header = {
          type: "document",
          document: {
            link: getFileUrlFromKey(data.link) || "",
            filename: data.filename || "document.pdf",
          },
        };
      }
      return {
        ...baseMessage,
        type: "interactive",
        interactive: {
          type: "button",
          header: header,
          body: {
            text: parseToWhatsAppFormat(data.body) || "Default message",
          },
          footer: data.footer
            ? {
                text: parseToWhatsAppFormat(data.footer),
              }
            : undefined,
          action: {
            buttons: (data.buttons || []).map(
              (button: ButtonOption, index: number) => ({
                type: "reply",
                reply: {
                  id: button.id || `button-${index}`,
                  title: button.title || `Button ${index + 1}`,
                },
              }),
            ),
          },
        },
      };
    }

    case "listNode": {
      const data = node.data as NodeTypeMap["listNode"];
      return {
        ...baseMessage,
        type: "interactive",
        interactive: {
          type: "list",
          header: data.header
            ? {
                type: "text",
                text: data.header,
              }
            : undefined,
          body: {
            text: parseToWhatsAppFormat(data.body) || "Default message",
          },
          footer: data.footer
            ? {
                text: parseToWhatsAppFormat(data.footer),
              }
            : undefined,
          action: {
            button: data.button || "Select an option",
            sections:
              data.sections?.map((section) => ({
                title: section.title,
                rows: (section.rows || []).map(
                  (row: ListItem, index: number) => ({
                    id: row.id || `row-${index}`,
                    title: row.title || `Row ${index + 1}`,
                    description: row.description || "",
                  }),
                ),
              })) || [],
          },
        },
      };
    }

    case "ctaUrlNode": {
      const data = node.data as NodeTypeMap["ctaUrlNode"];
      return {
        ...baseMessage,
        type: "interactive",
        interactive: {
          type: "cta_url",
          header: data.header
            ? {
                type: "text",
                text: data.header,
              }
            : undefined,
          body: data.body
            ? {
                text: parseToWhatsAppFormat(data.body),
              }
            : undefined,
          footer: data.footer
            ? {
                text: parseToWhatsAppFormat(data.footer),
              }
            : undefined,
          action: {
            name: "cta_url",
            parameters: {
              display_text: data.display_text || "Visit Link",
              url: data.url || "https://example.com",
            },
          },
        },
      };
    }

    case "reactionNode": {
      const data = node.data as NodeTypeMap["reactionNode"];
      return {
        ...baseMessage,
        type: "reaction",
        reaction: {
          message_id: data.messageId || "",
          emoji: data.emoji || "👍",
        },
      };
    }

    case "contactsNode": {
      const data = node.data as NodeTypeMap["contactsNode"];

      return {
        ...baseMessage,
        type: "contacts",
        contacts:
          data?.contacts?.map((contact) => ({
            addresses: contact?.addresses,
            birthday: contact?.birthday,
            emails: contact?.emails,
            name: contact?.name,
            org: contact?.org,
            phones: contact?.phones,
            urls: contact?.urls,
          })) || [],
      };
    }

    case "catalogNode": {
      const typedData = node?.data as NodeTypeMap["catalogNode"];
      log.trace({ catalogNodeData: typedData }, "Processing catalog node");

      if (typedData.type === CatalogMessages.Catalog) {
        const parameters: any = {};
        if (typedData.thumbnailProductId?.length) {
          parameters.thumbnail_product_retailer_id =
            typedData.thumbnailProductId;
        }

        const settings = await getWaSettingsByPhone(recipient);
        const waSettings = await getWaSettingsByPhoneId(settings?.phoneId);

        if (waSettings?.paymentMethod === "SHOPIFY_LINK") {
          // TODO: Fetch variant ID from catalog/product ID if needed, or assume productRetailerId is the variant ID
          // For a general catalog message, we might redirect to the store's collections page or similar if no specific product is linked in a simple "view catalog" action.
          // However, catalogNode usually implies sending the catalog.
          // If the user wants to use Shopify Checkout, they likely want to send a link to the product.
          // BUT, `CatalogMessages.Catalog` is just "View Catalog".

          // If it's a specific product (SingleProduct), we can generate a cart link.
          // For "Catalog" type, it's generic.

          log.trace({ parameters }, "Catalog message parameters");
          return {
            ...baseMessage,
            type: "interactive",
            interactive: {
              type: "catalog_message",
              body: {
                text:
                  parseToWhatsAppFormat(typedData?.body) || "Default message",
              },
              action: {
                name: "catalog_message",
                parameters:
                  Object.keys(parameters).length > 0 ? parameters : undefined,
              },
              footer: typedData.footer
                ? {
                    text: parseToWhatsAppFormat(typedData.footer),
                  }
                : undefined,
            },
          };
        }

        log.trace({ parameters }, "Catalog message parameters");
        return {
          ...baseMessage,
          type: "interactive",
          interactive: {
            type: "catalog_message",
            body: {
              text: parseToWhatsAppFormat(typedData?.body) || "Default message",
            },
            action: {
              name: "catalog_message",
              parameters:
                Object.keys(parameters).length > 0 ? parameters : undefined,
            },
            footer: typedData.footer
              ? {
                  text: parseToWhatsAppFormat(typedData.footer),
                }
              : undefined,
          },
        };
      } else if (typedData.type === CatalogMessages.SingleProduct) {
        log.trace(
          { productRetailerId: typedData.productRetailerId },
          "Single product message",
        );
        return {
          ...baseMessage,
          type: "interactive",
          interactive: {
            type: "product",
            body: typedData.body
              ? {
                  text: parseToWhatsAppFormat(typedData.body),
                }
              : undefined,
            footer: typedData.footer
              ? {
                  text: parseToWhatsAppFormat(typedData.footer),
                }
              : undefined,
            action: {
              catalog_id: typedData.catalogId,
              product_retailer_id: typedData.productRetailerId,
            },
          },
        };
      } else if (typedData.type === CatalogMessages.ProductSet) {
        log.trace(
          {
            useProductSet: typedData.useProductSet,
            productSetId: typedData.productSetId,
          },
          "Product set message data",
        );

        // Check if product set is selected
        if (!typedData.productSetId) {
          log.error(
            { typedData },
            "Product set ID is required for Product-Set type",
          );
          throw new Error(
            "Product set selection is required. Please select a product set in the node editor.",
          );
        }

        // Fetch product set from database to get product IDs
        const productSet = await prisma.whatsappProductSet.findUnique({
          where: { productSetId: typedData.productSetId },
        });

        if (
          !productSet ||
          !productSet.productIds ||
          productSet.productIds.length === 0
        ) {
          log.error(
            { productSetId: typedData.productSetId },
            "Product set not found or has no products",
          );
          throw new Error(
            "Selected product set has no products. Please sync product sets or select a different set.",
          );
        }

        log.trace(
          {
            productSetName: productSet.name,
            productCount: productSet.productIds.length,
          },
          "Found product set with products",
        );

        // Create a multi-product message with all products from the set
        return {
          ...baseMessage,
          type: "interactive",
          interactive: {
            type: "product_list",
            header: {
              type: "text",
              text: parseToWhatsAppFormat(typedData.header) || productSet.name,
            },
            body: {
              text:
                parseToWhatsAppFormat(typedData.body) || "Browse our products",
            },
            footer: typedData.footer
              ? {
                  text: parseToWhatsAppFormat(typedData.footer),
                }
              : undefined,
            action: {
              catalog_id: typedData.catalogId,
              sections: [
                {
                  title: productSet.name,
                  product_items: productSet.productIds
                    .slice(0, 30)
                    .map((productId) => ({
                      product_retailer_id: productId,
                    })),
                },
              ],
            },
          },
        };
      } else if (typedData.type === CatalogMessages.MultiProduct) {
        log.trace(
          {
            sections: typedData.sections,
            sectionsLength: typedData.sections?.length,
            useProductSet: typedData.useProductSet,
            productSetId: typedData.productSetId,
          },
          "Multi-product message data",
        );

        // Check if sections exist and are valid
        if (
          !typedData.sections ||
          !Array.isArray(typedData.sections) ||
          typedData.sections.length === 0
        ) {
          log.error(
            { typedData },
            "Multi-product message requires at least one section with products",
          );
          throw new Error(
            "Multi-product message requires at least one section with products. Please add sections in the node editor.",
          );
        }

        return {
          ...baseMessage,
          type: "interactive",
          interactive: {
            type: "product_list",
            header: {
              type: "text",
              text: parseToWhatsAppFormat(typedData.header),
            },
            body: {
              text: parseToWhatsAppFormat(typedData.body),
            },
            footer: typedData.footer
              ? {
                  text: parseToWhatsAppFormat(typedData.footer),
                }
              : undefined,
            action: {
              catalog_id: typedData.catalogId,
              sections: typedData.sections.map((section) => ({
                title: section.title,
                product_items: section.productItems.map((productId) => ({
                  product_retailer_id: productId,
                })),
              })),
            },
          },
        };
      }
    }

    default:
      return null;
  }
}
export const handlePaymentConfirmation = async (
  phoneNo: string,
  refrenceId: string,
) => {
  let orgId = process.env.ROOT_ORG;

  const order = await prisma.waCatalogOrder.findFirst({
    where: { transactionId: refrenceId },
    include: { catalog: true },
  });

  if (order) {
    orgId = order.catalog.orgId;
    await prisma.waCatalogOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID" },
    });

    if (order.shopifyDraftOrderId) {
      try {
        const orderTotal = (order.products as any[]).reduce(
          (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1),
          0,
        );
        // We multiply by 100 because captureShopifyOrderPayment divides by 100
        await captureShopifyOrderPayment(
          orgId,
          order.shopifyDraftOrderId,
          orderTotal * 100,
        );
      } catch (e) {
        log.error("Failed to capture Shopify payment => %o", e);
      }
    }
  }

  const confirmation = await prisma.waTemplate.findFirst({
    where: {
      orgId,
      templateType: TemplateType.PAYMENT_CONFIRMATION,
    },
  });
  const templateMessage: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNo,
    type: "interactive",
    interactive: {
      type: "order_status",
      body: {
        text:
          confirmation?.data?.components?.find(
            (data: any) => data.type === "body",
          )?.text ||
          "Awesome! See you at the meetup. Let's make it a blast! 🎉🎉",
      },
      action: {
        name: "review_order",
        parameters: {
          reference_id: refrenceId,
          order: {
            status: "completed",
          },
        },
      },
    },
  };
  await sendMessage(orgId, templateMessage);
};
export function getMessageObject(data: WaMessageBody) {
  if (
    (data.entry[0].changes[0].value as WaReceiveMessageBody).messages.length > 1
  ) {
    // TODO: Find out when this happens
    throw new Error(
      "This shouldn't have occured. Multiple messages not supported",
    );
  }
  const message = (data.entry[0].changes[0].value as WaReceiveMessageBody)
    .messages[0];
  const completeMessageObject = data.entry[0].changes[0].value;
  return { message, completeMessageObject };
}
export function getUserName(data: WaMessageBody) {
  return (data.entry[0].changes[0].value as WaReceiveMessageBody).contacts[0]
    .profile.name;
}
export type WaParsedMessage = {
  from: string;
  userName: string;
  timestamp: string;
  message: string;
  flowResponse: any;
  type: string;
  completeMessageObject: any;
  buttonId: string;
};
export function parseMessage(data: WaMessageBody): WaParsedMessage {
  if (!getMessageObject(data)) {
    throw new Error("No messages found");
  }
  const { message, completeMessageObject } = getMessageObject(data);
  const userName = getUserName(data);
  const { from, timestamp, type } = message;
  let subtype = type as any;

  let flowResponse;
  let body = "";
  let buttonId = "";
  message[type];
  switch (message.type) {
    case WaMessageTypes.interactive:
      if (message.interactive.type === "nfm_reply") {
        flowResponse = JSON.parse(
          message.interactive.nfm_reply["response_json"],
        );
        subtype = message.interactive.type;
      } else {
        body = message.interactive[message.interactive.type].title;
        buttonId = message.interactive[message.interactive.type]?.id;
      }
      break;
    case WaMessageTypes.text:
      body = message.text.body;
      break;
    case WaMessageTypes.image:
      body = message.image.id;
      break;
    case WaMessageTypes.button:
      body = message.button.text;
      break;
    case WaMessageTypes.order:
      body = message.order.text;
      break;
  }
  return {
    from,
    userName,
    timestamp,
    message: body,
    flowResponse,
    type: subtype,
    completeMessageObject,
    buttonId,
  };
}

export function createReplyImageMessage(
  to: string,
  imageId: string,
  platform: PlatformType = PlatformType.WHATSAPP,
  caption?: string,
): WaSendMessageBody | IgSendMessageBody {
  if (platform === PlatformType.INSTAGRAM) {
    return {
      recipient: {
        id: to,
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageId,
          },
        },
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: {
      link: imageId,
      caption: caption ?? "",
    },
  };
}

export function createReplyButtonsMessage(
  to: string,
  questionHeader: string,
  questionDescription: string | Object,
  choices: any[],
  withImage = false,
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      header: withImage
        ? {
            type: "image",
            image: {
              link: questionHeader,
            },
          }
        : {
            type: "text",
            text: questionHeader,
          },
      body: {
        text:
          typeof questionDescription === "string"
            ? questionDescription
            : parseToWhatsAppFormat(questionDescription),
      },
      action: {
        buttons:
          //TODO: title have a 24char limit. Description may have 200chars
          choices.map((choice, index) => ({
            reply:
              typeof choice === "string"
                ? {
                    title: choice,
                    id: index.toString(),
                  }
                : {
                    title: choice?.value,
                    id: choice?.id?.toString(),
                  },
            type: "reply",
          })),
      },
    },
  };
}

export function parseToWhatsAppFormat(editorContent) {
  if (!editorContent) return "";
  function formatText(text, type = "*") {
    let trimmedEnd = text.trimEnd();
    let trimmedStart = text.trimStart();
    let trimmed = text.trim();

    let leadingSpaces = " ".repeat(text.length - trimmedStart.length);
    let trailingSpaces = " ".repeat(text.length - trimmedEnd.length);
    return `${leadingSpaces}${type}${trimmed}${type}${trailingSpaces}`;
  }
  const parseNode = (node) => {
    if (!node) return "";
    switch (node.type) {
      case "paragraph":
        return node?.content?.map(parseNode).join("");
      case "text":
        let text = node.text;
        if (node.marks) {
          node.marks.forEach((mark) => {
            switch (mark.type) {
              case "bold":
                text = formatText(text, "*");
                break;
              case "italic":
                text = formatText(text, "_");
                break;
              case "strike":
                text = formatText(text, "~");
                break;
              case "code":
                text = `\`${text}\``;
                break;
              default:
                break;
            }
          });
        }
        return text;
      case "bulletList":
        return node.content.map((item) => `* ${parseNode(item)}`).join("\n");
      case "orderedList":
        return node.content
          .map((item, index) => `${index + 1}. ${parseNode(item)}`)
          .join("\n");
      case "blockquote":
        return node.content.map((item) => `> ${parseNode(item)}`).join("\n");
      case "codeBlock":
        return `\`\`\`${node.content.map(parseNode).join("")}\`\`\``;
      case "listItem":
        return node.content.map(parseNode).join("");
      default:
        return "";
    }
  };

  return editorContent?.content
    ? editorContent.content.map(parseNode).join("\n")
    : editorContent.map(parseNode).join("\n");
}

interface createCTAButtonMessageParams {
  to: string;
  header?: string;
  body: string;
  footer?: string;
  buttonText: string;
  url: string;
}
export function createCTAButtonMessage({
  to,
  header = "",
  body,
  footer = "",
  buttonText,
  url,
}: createCTAButtonMessageParams): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      ...(header && {
        header: {
          type: "text",
          text: header,
        },
      }),
      ...(body && {
        body: {
          text: body,
        },
      }),
      ...(footer && {
        footer: {
          text: footer,
        },
      }),

      action: {
        name: "cta_url",
        parameters: {
          display_text: buttonText,
          url,
        },
      },
    },
  };
}

export function createTextMessage(
  to: string,
  title: string,
  description = "",
  platform: PlatformType = PlatformType.WHATSAPP,
): WaSendMessageBody | IgSendMessageBody {
  if (platform === PlatformType.INSTAGRAM) {
    return {
      recipient: {
        id: to,
      },
      message: {
        text:
          (title ? `*${title}*\n\n` : "") +
          `${
            typeof description === "string"
              ? description
              : parseToWhatsAppFormat(description)
          }`,
      },
    } as IgSendMessageBody;
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body:
        (title ? `*${title}*\n\n` : "") +
        `${
          typeof description === "string"
            ? description
            : parseToWhatsAppFormat(description)
        }`,
    },
  };
}

export function createTemplateMessage(
  to: string,
  template: any,
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template,
  };
}

export function createListMessage(
  to: string,
  questionTitle: string,
  questionDescription: string | object,
  buttonTitle: string,
  choices: any,
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      ...(questionTitle && {
        header: {
          type: "text",
          text: questionTitle,
        },
      }),
      body: {
        text:
          typeof questionDescription === "string"
            ? questionDescription
            : parseToWhatsAppFormat(questionDescription),
      },
      action: {
        button: buttonTitle,

        sections: [
          {
            //TODO: title have a 24char limit. Description may have 200chars
            rows: choices.map((choice, index) =>
              typeof choice === "string"
                ? {
                    title: choice,
                    id: index.toString(),
                  }
                : {
                    title: choice?.value,
                    id: choice?.id?.toString(),
                  },
            ),
          },
        ],
      },
    },
  };
}

export function createNativePaymentMessage(
  to: string,
  referenceId: string,
  configName: string,
  products: { name: string; amount: number; quantity: number }[],
  currency: string = "INR",
  providerType: string,
  bodyText: string = "Confirm your order and pay",
  footerText?: string,
): WaSendMessageBody {
  const totalAmount = products.reduce(
    (acc, p) => acc + p.amount * p.quantity,
    0,
  );

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "order_details",
      body: {
        text: bodyText,
      },
      ...(footerText && {
        footer: {
          text: footerText,
        },
      }),
      action: {
        name: "review_and_pay",
        parameters: {
          reference_id: referenceId,
          type: "physical-goods",
          payment_settings: [
            {
              type: "payment_gateway",
              payment_gateway: {
                type: providerType,
                configuration_name: configName,
                [providerType]: {
                  receipt: referenceId,
                },
              },
            },
          ],
          currency: currency,
          total_amount: {
            value: totalAmount,
            offset: 100,
          },
          order: {
            status: "pending",
            type: "quick_pay",
            items: products.map((p) => ({
              name: p.name,
              amount: {
                value: p.amount,
                offset: 100,
              },
              quantity: p.quantity,
            })),
            subtotal: {
              value: totalAmount,
              offset: 100,
            },
          },
        },
      } as any,
    },
  } as any;
}

export function createNativeListMessage(
  to: string,
  header: string,
  body: string,
  sections: WaSectionsType,
  buttonTitle: string = "View Options",
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: header
        ? {
            type: "text",
            text: header,
          }
        : undefined,
      body: {
        text: body,
      },
      action: {
        button: buttonTitle,
        // adding id to each row
        sections: sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row, index) => ({
            id: index.toString(),
            ...row,
          })),
        })),
      },
    },
  };
}

export function createReactionMessage(
  to,
  to_wa_id,
  emoji,
  reaction,
  platform,
): WaSendMessageBody | IgSendMessageBody {
  //do the instagram type

  if (platform === PlatformType.INSTAGRAM)
    return {
      recipient: {
        id: to,
      },
      sender_action: "react",
      payload: {
        message_id: to_wa_id,
        reaction,
      },
    };
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "reaction",
    reaction: {
      message_id: to_wa_id,
      emoji,
    },
  };
}

export function createDocumentMessage(
  to,
  link,
  filename,
  caption,
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "document",
    document: {
      link,
      caption: caption ?? "",
      filename,
    },
  };
}

export function createVideoMessage(
  to,
  link,
  platform,
  caption,
): WaSendMessageBody | IgSendMessageBody {
  if (platform === PlatformType.INSTAGRAM) {
    return {
      recipient: {
        id: to,
      },
      message: {
        attachment: {
          type: "video",
          payload: {
            url: link,
          },
          is_reusable: true,
        },
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "video",
    video: {
      link,
      caption: caption ?? "",
    },
  };
}

export function createAudioMessage(
  to,
  link,
  platform,
): WaSendMessageBody | IgSendMessageBody {
  if (platform === PlatformType.INSTAGRAM) {
    return {
      recipient: {
        id: to,
      },
      message: {
        attachment: {
          type: "audio",
          payload: {
            url: link,
          },
          is_reusable: true,
        },
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "audio",
    audio: {
      link,
    },
  };
}

export function createContactMessage(
  to,
  contactsData: (Partial<Contact> & { org: { name: string } })[],
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    to,
    type: "contacts",
    contacts: contactsData.map((contact) => ({
      birthday: contact.dob
        ? dayjs(contact.dob).format("YYYY-MM-DD")
        : undefined,
      emails: contact?.email ? [{ email: contact.email }] : undefined,
      name: {
        formatted_name:
          contact.name ?? contact.whatsappUserName ?? contact.phone,
        first_name: contact.name ?? contact.whatsappUserName ?? contact.phone,
      },
      org: {
        company: contact.org.name,
      },
      phones: [{ phone: contact.phone, wa_id: contact.phone, type: "Mobile" }],
    })),
  };
}

export function createLocationMessage(
  to: string,
  location: WaSendMessageBody["location"],
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "location",
    location,
  };
}

export async function generateMessageDataFromQuestion(
  session: WaSessionWithRelations,
  question: Question,
): Promise<WaSendMessageBody> {
  const to = session.phone;
  if (!session.language) {
    log.error({ session }, "No language found for session");
    throw new Error("No language found for session");
  }
  const lang = session.language;

  const title = question.title[lang];
  let description = question.description[lang];

  const buttonTitle = "View Options";

  // interactive choices
  let choices: Array<string> = [];
  switch (question.type) {
    case Q.YN:
      choices = Object.values(YNResponse);
      break;
    case Q.LD:
      choices = Object.values(LDResponse);
      break;
    case Q.Opinion:
      choices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => i.toString());
      break;
    case Q.WaButtons:
      choices = question.choices![lang]?.map((ch) => ch?.value);
      break;
    case Q.Date:
      description += "\n\nPlease enter date in DD/MM/YYYY format";
      break;
    case Q.Rating: {
      const sections: WaSectionsType = [
        {
          rows: [1, 2, 3, 4, 5].map((i) => ({
            id: i.toString(),
            title: ratingEmoji.repeat(i),
          })),
        },
      ];
      return createNativeListMessage(to, title, description, sections);
    }
    case Q.Smiley: {
      const sections: WaSectionsType = [
        {
          rows: Object.entries(smileyEmojiMap).map(([key, value]) => ({
            id: key,
            title: value + key,
          })),
        },
      ];
      return createNativeListMessage(to, title, description, sections);
    }
    case Q.WaList:
      const sections = question.sections?.[lang] || [];
      return createNativeListMessage(to, title, description, sections);
  }

  if (choices.length > 0) {
    //interactive question
    if (choices.length <= 3) {
      // Reply buttons can be used for upto 3 choices
      return createReplyButtonsMessage(to, title, description, choices);
    } else {
      // List buttons
      const messageData = createListMessage(
        to,
        title,
        description,
        buttonTitle,
        choices,
      );
      return messageData;
    }
  } else {
    // text question
    if ([Q.Text, Q.Email, Q.Photo, Q.Date, Q.Number].includes(question.type)) {
      return createTextMessage(to, title, description) as WaSendMessageBody;
    } else if ([Q.MSQ, Q.MCQ, Q.CustomNPS].includes(question.type)) {
      let bodyText = description;
      // Displaying choices in `index) choice` format
      const options = question
        .choices![
          lang
        ].map((choice, index) => `\n${index + 1}) ${choice.value}`)
        .join();

      bodyText = bodyText + options;
      if (question.type === Q.MCQ || question.type === Q.CustomNPS) {
        bodyText = bodyText + "\n\nPlease enter your choice index";
      } else if (question.type === Q.MSQ) {
        bodyText =
          bodyText + "\n\nPlease enter your choice indices separated by space";
      }
      return createTextMessage(to, title, bodyText) as WaSendMessageBody;
    } else if (question.type === Q.Phone) {
      // TODO: Allow user to enter phone number
      return createReplyButtonsMessage(to, title, description, [
        "Use this number",
      ]);
    }
  }
  log.error("Invalid question type");
  throw new Error("Invalid question type");
}
export function isValidResponse(
  response: any,
  question: Question,
  lang: string,
): boolean {
  if (!response) return false;
  switch (question.type) {
    case Q.LD:
      return Object.values(LDResponse).includes(response);
    case Q.MCQ:
    case Q.WaButtons:
    case Q.CustomNPS:
      if (!question.choices) {
        log.fatal({ question }, "No choices found for question");
        throw new Error("No choices found for question");
      }
      return question.choices[lang]?.includes(response);
    case Q.MSQ:
      if (!Array.isArray(response)) return false;
      for (const choice of response) {
        if (!question.choices[lang]?.includes(choice)) return false;
      }
    case Q.YN:
      return Object.values(YNResponse).includes(response);
    case Q.Rating:
      return response >= 1 && response <= 5;
    case Q.Opinion:
      return response >= 1 && response <= 10;
    case Q.Number:
      return !isNaN(response);
    case Q.Phone:
      return /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(response);
    case Q.WaList:
      // Must be an object with title & optional description
      return !!response.title;
    case Q.Photo:
      return typeof response === "string" && response.length > 0; // Key of the uploaded file
    case Q.Email:
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(response?.email);
    case Q.Smiley:
      return Object.values(SmileyResponse).includes(response);
    default:
      return true;
  }
}

export async function parseResponse(
  waMessage: WaMessageBody,
  question: Question,
  session: WaSessionWithRelations,
) {
  let message = parseMessage(waMessage).message;
  try {
    switch (question.type) {
      case Q.YN:
      case Q.LD:
      case Q.Text:
      case Q.TextArea:
      case Q.Number:
      case Q.Opinion:
        return message;
      case Q.Email:
        return { email: message };
      case Q.Smiley:
        return (waMessage.entry[0].changes[0].value as WaReceiveMessageBody)
          .messages[0].interactive.list_reply.id;
      case Q.Rating:
        return Number.parseInt(
          (waMessage.entry[0].changes[0].value as WaReceiveMessageBody)
            .messages[0].interactive.list_reply.id,
        );
      case Q.Date:
        if (!dayjs(message, "DD/MM/YYYY", true).isValid()) {
          return "";
        }
        return dayjs(message, "DD/MM/YYYY").toDate();
      case Q.MSQ:
        const selectedChoices = message.split(" ").map((i) => Number(i));
        return selectedChoices.map(
          (index) => question.choices![session.language][index - 1],
        );
        break;
      case Q.MCQ:
      case Q.CustomNPS:
        const index = Number(message);
        return question.choices![session.language][index - 1];
      case Q.WaButtons: {
        const choice = question.choices[session.language].find(
          (c) => c.value === message,
        );
        if (!choice) {
          log.error({ message, question }, "Couldn't find choice for message");
          return false;
        } else {
          return choice;
        }
      }
      case Q.Phone:
        if (message === "Use this number") {
          return { phone: session.phone };
        } else {
          return { phone: message };
        }
      case Q.WaList: {
        try {
          const { message } = getMessageObject(waMessage);
          const { id, ...response } = message.interactive["list_reply"];
          return response;
        } catch (error) {
          log.error(error);
          return undefined;
        }
      }
      case Q.Photo: {
        const { message } = getMessageObject(waMessage);
        const uniqueFilename = await downloadAndUpload(
          session?.orgId,
          message.image.id,
        );
        if (!(message.type === "image")) {
          return undefined;
        }
        return uniqueFilename; // Key of the uploaded file
      }
      default:
        log.fatal(`Not Implemented: question type => ${question.type}`);
        throw new Error(`Not Implemented: question type => ${question.type}`);
    }
  } catch (error) {
    log.error(error);
    log.info("Invalid response");
    return undefined;
  }
}

/* Downloads image from whatsapp & uploads it to s3 */
export async function downloadAndUpload(orgId: string, imageId: string) {
  const waSettings = await getWaSettings(orgId);
  const res = await callWhatsappApi(
    `/${imageId}`,
    "GET",
    waSettings.accessToken,
  );
  log.trace(`got image link => %o`, res.data);
  const { url: imageUrl, mime_type } = res.data;
  // Need auth token to download image
  const imageResponse = await callWhatsappApi(
    "",
    "GET",
    waSettings.accessToken,
    undefined,
    { responseType: "arraybuffer", url: imageUrl },
  );
  log.trace(`downloaded image from whatsapp`);
  const imageBuffer = Buffer.from(imageResponse.data, "binary");
  const extension = mime_type.split("/")[1];
  const uniqueFilename = `${Date.now()}-${imageId}.${extension}`;
  const s3Params = {
    Bucket: process?.env?.AWS_S3_BUCKET || "rateup-survey-uploads",
    Key: uniqueFilename,
    ContentType: mime_type,
    Body: imageBuffer,
  };
  const obj = await uploadFile(s3Params);
  log.trace("uploaded image to s3 key => %s", uniqueFilename);

  return obj["Key"] ? obj["Key"] : null;
}

export function getQuestionByIdFromSession(
  session: WaSessionWithRelations,
  questionId: string,
) {
  const question = (
    session.surveyTeamMap.survey.questions as unknown as Question[]
  ).find((q) => q.id === questionId);
  if (!question) {
    log.fatal("Question not found");
    throw new Error("Question not found");
  }
  return question;
}

// Returns false if session is older than 1 day
export function validateSession(session: WaSession) {
  if (!session) return false;
  return !(dayjs().diff(dayjs(session.createdAt), "day") >= 1);
}

// format for start-survey-message is "`#<surveyName> @<TeamCode>`"
// There could any text before of after it.

const startSurveyRegex_withSurveyName = /[\s\S]*`#([\s\S]+) @([\S]+)`[\s\S]*/i;

export function parseStartMessage(text: string) {
  const surveyNameMatch = text.match(startSurveyRegex_withSurveyName);
  if (surveyNameMatch) {
    const surveyName = surveyNameMatch[1].trim();
    const teamCode = surveyNameMatch[2].trim();
    return {
      surveyName,
      teamCode,
    };
  }
  return null;
}

export function mapStatuses(addStatuses) {
  const statusMap = {
    [CampaignParticipantAddStatus.COMPLETED]: [
      CampaignParticipantStatus.COMPLETED,
    ],
    [CampaignParticipantAddStatus.NOTCOMPLETED]: [
      CampaignParticipantStatus.SENT,
      CampaignParticipantStatus.FAILED,
      CampaignParticipantStatus.READ,
      CampaignParticipantStatus.DELIVERED,
      CampaignParticipantStatus.PENDING,
    ],
    [CampaignParticipantAddStatus.PENDING]: [CampaignParticipantStatus.PENDING],
    [CampaignParticipantAddStatus.FAILED]: [CampaignParticipantStatus.FAILED],
  };

  const result = new Set();

  addStatuses.forEach((status) => {
    const mappedStatuses = statusMap[status];
    if (mappedStatuses) {
      mappedStatuses.forEach((s) => result.add(s));
    }
  });

  return Array.from(result);
}
export enum WA_SUBSCRIBE_STATUS {
  SUBSCRIBE = "subscribe",
  STOP = "stop",
}

function getHashForMembers(memberIds) {
  return crypto.createHash("SHA-256").update(memberIds.join(",")).digest("hex");
}

export const assignChat = async (
  teamId: string,
  memberIds: string[],
  automationId: string,
) => {
  const memberHash = getHashForMembers(memberIds);
  const pointerKey = `round_robin_index:${teamId}:${automationId}:${memberHash}`;
  // Get current index from Redis, or start from 0
  let indexStr = await connection.get(pointerKey);
  let index = indexStr ? Number.parseInt(indexStr) : 0;

  // Fallback safety check
  if (index >= memberIds.length) {
    index = 0;
    await connection.set(pointerKey, index);
  }
  // Pick member
  const assignedMember = memberIds[index];

  // Increment index and store back in Redis
  await connection.set(pointerKey, (index + 1) % memberIds.length);

  return assignedMember;
};

export function parseWaJoinMessage(message: string) {
  const lower = message.toLowerCase();

  if (!lower.includes("join") || !lower.includes("loyalty")) {
    return null;
  }

  const refMatch = new RegExp(/referral\s+([a-z0-9-]+)/i).exec(message);

  return {
    isJoin: true,
    referralCode: refMatch?.[1],
    source: "REF",
  };
}

type WaLinkOptions = {
  waNumber: string;
  referralCode?: string;
  source?: string;
};

export function generateWhatsAppJoinLink({
  waNumber,
  referralCode,
  source = "REF",
}: WaLinkOptions): string {
  let message = "Join the loyalty program";

  if (referralCode) {
    message += ` using referral ${referralCode}`;
  }

  // // Optional source tagging (hidden but parsable if needed)
  // message += ` [${source}]`;

  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${waNumber}?text=${encodedMessage}`;
}
