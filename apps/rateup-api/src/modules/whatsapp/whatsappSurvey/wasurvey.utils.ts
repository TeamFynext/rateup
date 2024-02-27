import {
  WaEvent,
  YNResponse,
  LDResponse,
  SmileyResponse,
} from "../../../types/enums";
import {
  WaMessageBody,
  WaMessageTypes,
  WaSendMessageBody,
} from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";
import { QuestionType as Q } from "../../../types/enums";
import { callWhatsappApi } from "../wa_axios";
import { getWaSettings } from "../settings/wa_settings.service";
import { uploadFile } from "../../../utils/upload/s3Upload";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
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
    } else if (
      data.entry[0].changes[0].field === WaEvent.Message &&
      data.entry[0].changes[0].value.messages?.length > 0
    ) {
      return WaEvent.Message;
    }
  }
  return null;
}
export function getMessageObject(data: WaMessageBody) {
  if (data.entry[0].changes[0].value.messages.length > 1) {
    // TODO: Find out when this happens
    throw new Error(
      "This shouldn't have occured. Multiple messages not supported",
    );
  }
  return data.entry[0].changes[0].value.messages[0];
}

export function parseMessage(data: WaMessageBody) {
  if (!getMessageObject(data)) {
    throw new Error("No messages found");
  }
  const message = getMessageObject(data);
  const { from, timestamp, type } = message;
  let subtype = type as any;

  let flowResponse;
  let body = "";
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
  }
  return { from, timestamp, message: body, flowResponse, type: subtype };
}

export function createReplyButtonsMessage(
  to: string,
  questionTitle: string,
  questionDescription: string,
  choices: Array<string>,
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: questionTitle,
      },
      body: {
        text: questionDescription,
      },
      action: {
        buttons:
          //TODO: title have a 24char limit. Description may have 200chars
          choices.map((choice, index) => ({
            reply: {
              title: choice,
              id: index.toString(),
            },
            type: "reply",
          })),
      },
    },
  };
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
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: title ? `*${title}*\n\n` : "" + description,
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
  questionDescription: string,
  buttonTitle: string,
  choices: Array<string>,
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: questionTitle,
      },
      body: {
        text: questionDescription,
      },
      action: {
        button: buttonTitle,
        sections: [
          {
            //TODO: title have a 24char limit. Description may have 200chars
            rows: choices.map((choice, index) => ({
              id: index.toString(),
              title: choice,
            })),
          },
        ],
      },
    },
  };
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

export async function generateMessageDataFromQuestion(
  session: WaSessionWithRelations,
  question: Question,
): Promise<WaSendMessageBody> {
  const to = session.phone;
  if (!session.language) {
    log.error("No language found for session", session);
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
    case Q.DateTime:
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
    if (
      [Q.Text, Q.Email, Q.Photo, Q.DateTime, Q.Number].includes(question.type)
    ) {
      return createTextMessage(to, title, description);
    } else if ([Q.MSQ, Q.MCQ, Q.CustomNPS].includes(question.type)) {
      let bodyText = description;
      // Displaying choices in `index) choice` format
      const options = question
        .choices![lang].map(
          (choice, index) => `\n${index + 1}) ${choice.value}`,
        )
        .join();

      bodyText = bodyText + options;
      if (question.type === Q.MCQ || question.type === Q.CustomNPS) {
        bodyText = bodyText + "\n\nPlease enter your choice index";
      } else if (question.type === Q.MSQ) {
        bodyText =
          bodyText + "\n\nPlease enter your choice indices separated by space";
      }
      return createTextMessage(to, title, bodyText);
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
        log.fatal("No choices found for question", question);
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
        return waMessage.entry[0].changes[0].value.messages[0].interactive
          .list_reply.id;
      case Q.Rating:
        return Number.parseInt(
          waMessage.entry[0].changes[0].value.messages[0].interactive.list_reply
            .id,
        );
      case Q.DateTime:
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
          log.error("Couldn't find choice for message", message);
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
          const message = getMessageObject(waMessage);
          const { id, ...response } = message.interactive["list_reply"];
          return response;
        } catch (error) {
          log.error(error);
          return undefined;
        }
      }
      case Q.Photo: {
        const message = getMessageObject(waMessage);
        const uniqueFilename = await downloadAndUpload(
          session,
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
export async function downloadAndUpload(
  session: WaSessionWithRelations,
  imageId: string,
) {
  const waSettings = await getWaSettings(session.orgId);
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
  await uploadFile(s3Params);
  log.trace("uploaded image to s3 key => %s", uniqueFilename);

  return uniqueFilename;
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

const _templateStatusChangeEventSampleData = {
  entry: [
    {
      id: "0",
      time: 1695440875,
      changes: [
        {
          field: "message_template_status_update",
          value: {
            event: "APPROVED",
            message_template_id: 12345678,
            message_template_name: "my_message_template",
            message_template_language: "pt-BR",
            reason: null,
          },
        },
      ],
    },
  ],
  object: "whatsapp_business_account",
};
const messageEventSampleData = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "0",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "16505551111",
              phone_number_id: "123456123",
            },
            contacts: [
              {
                profile: { name: "test user name" },
                wa_id: "16315551181",
              },
            ],
            messages: [
              {
                from: "16315551181",
                id: "ABGGFlA5Fpa",
                timestamp: "1504902988",
                type: "text",
                text: { body: "this is a text message" },
              },
            ],
          },
        },
      ],
    },
  ],
};
