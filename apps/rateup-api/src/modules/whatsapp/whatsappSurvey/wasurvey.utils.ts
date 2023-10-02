import { WaSession } from "@prisma/client";
import { WaEvent, YNResponse, LDResponse, SmileyResponse } from "../../../types/enums";
import { WaMessageBody, WaSendMessageBody } from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";
import { QuestionType as Q } from "../../../types/enums";


export function getEventType(data: WaMessageBody) {
  if (data.object === 'whatsapp_business_account') {
    if (data.entry[0].changes[0].field === WaEvent.TemplateStatusChange) {
      return WaEvent.TemplateStatusChange;
    } else if (data.entry[0].changes[0].field === WaEvent.Message) {
      return WaEvent.Message;
    }
  }
  log.error('Invalid data object', data);
  return null;
}
export function getMessageObject(data: WaMessageBody) {
  if (data.entry[0].changes[0].value.messages.length > 1) {
    // TODO: Find out when this happens
    throw new Error(
      "This shouldn't have occured. Multiple messages not supported"
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

  let body = "";
  message[type];
  if (message.type === "interactive") {
    body = message.interactive[message.interactive.type].title;
  } else if (message.type === "text") {
    body = message.text.body;
  } else if (message.type === "image") {
    body = message.image.id;
  } else if (message.type === "button") {
    body = message.button.text;
  }
  return { from, timestamp, message: body, type };
}

export function createReplyButtonsMessage(
  to: string,
  questionTitle: string,
  questionDescription: string,
  choices: Array<string>
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
        text: "-> " + questionDescription,
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

export function createTextMessage(
  to: string,
  title: string,
  description = ""
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: `*${title}*\n\n${description}`,
    },
  };
}

export function createTemplateMessage(
  to: string,
  template: any
): WaSendMessageBody {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template
  };
}

export function createListMessage(
  to: string,
  questionTitle: string,
  questionDescription: string,
  buttonTitle: string,
  choices: Array<string>
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
        text: "-> " + questionDescription,
      },
      action: {
        button: buttonTitle,
        sections: [
          {
            //TODO: title have a 24char limit. Description may have 200chars
            rows: choices.map((choice) => ({ id: choice, title: choice })),
          },
        ],
      },
    },
  };
}

export async function generateMessageDataFromQuestion(
  session: WaSession,
  question: Question
): Promise<WaSendMessageBody> {
  const to = session.phone;
  if (!session.language) {
    log.error("No language found for session", session);
    throw new Error("No language found for session");
  }
  const lang = session.language;

  const title = question.title[lang];
  let description = question.description[lang];

  const buttonTitle = "View choices";

  // interactive choices
  let choices: Array<string> = [];
  switch (question.type) {
    case Q.YN:
      choices = Object.values(YNResponse);
      break;
    case Q.LD:
      choices = Object.values(LDResponse);
      break;
    case Q.Rating:
      choices = [1, 2, 3, 4, 5].map((i) => i.toString());
      break;
    case Q.Smiley:
      choices = Object.values(SmileyResponse);
      break;
    case Q.Opinion:
      choices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => i.toString());
      break;
    // TODO: Interactive list questions only support upto 10 options
    case Q.MCQ:
      choices = question.choices![lang];
      break;
    case Q.DateTime:
      description += "\n\nPlease enter date in DD/MM/YYYY format";
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
        choices
      );
      return messageData;
    }
  } else {
    // text question
    if (
      [Q.Text, Q.Email, Q.Testimonial, Q.Photo, Q.DateTime].includes(
        question.type
      )
    ) {
      return createTextMessage(to, title, description);
    } else if (question.type === Q.MSQ || question.type === Q.DDMS) {
      let bodyText = description;

      // Displaying choices in `index) choice` format
      const options = question
        .choices![lang].map((choice, index) => `\n${index + 1}) ${choice}`)
        .join();

      bodyText =
        bodyText +
        options +
        `\n\nPlease enter your option numbers separated by a space`;
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
export async function isValidResponse(
  response: any,
  question: Question,
  lang: string
) {
  switch (question.type) {
    case Q.LD:
      return Object.values(LDResponse).includes(response);
    case Q.MCQ:
      // TODO lang
      if (!question.choices) {
        log.fatal("No choices found for question", question);
        throw new Error("No choices found for question");
      }
      return question.choices[lang]?.includes(response);
    case Q.YN:
      return Object.values(YNResponse).includes(response);
    case Q.Rating:
      return response >= 1 && response <= 5;
    case Q.Opinion:
      return response >= 1 && response <= 10;
    case Q.Phone:
      return /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(response);
    default:
      return true;
  }
}


export function parseResponse(
  message: string,
  question: Question,
  session: WaSession
) {
  let response: any;
  switch (question.type) {
    case Q.YN:
    case Q.LD:
    case Q.Text:
    case Q.TextArea:
    case Q.Number:
    case Q.Email:
    case Q.Opinion:
    case Q.MCQ:
    case Q.DDSS:
    // TODO: smiley, testimonial
    case Q.Smiley:
      response = message;
      break;
    case Q.Testimonial:
      response = {
        testimonial: message,
      };
      break;
    case Q.Rating:
      response = Number(message);
      break;
    case Q.DateTime:
      response = new Date(message);
      break;
    case Q.MSQ:
      const selectedChoices = message.split(" ").map((i) => Number(i));
      response = selectedChoices.map(
        (index) => question.choices![session.language][index - 1]
      );
      break;
    case Q.DDMS:
      const selectedItems = message.split(" ").map((i) => Number(i));
      response = selectedItems.map(
        (index) => question.choices![session.language][index - 1]
      );
      break;
    case Q.Phone:
      if (message === "Use this number") {
        response = session.phone;
      } else {
        response = message;
      }
      break;
    default:
      log.fatal(`Not Implemented: question type => ${question.type}`);
      throw new Error(`Not Implemented: question type => ${question.type}`);
  }
  return response;
}


const _templateStatusChangeEventSampleData = {
  "entry": [
    {
      "id": "0", "time": 1695440875, "changes": [{
        "field": "message_template_status_update",
        "value": {
          "event": "APPROVED",
          "message_template_id": 12345678,
          "message_template_name": "my_message_template",
          "message_template_language": "pt-BR",
          "reason": null
        }
      }]
    }],
  "object": "whatsapp_business_account"
}
const messageEventSampleData = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "0", "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "16505551111",
              "phone_number_id": "123456123"
            },
            "contacts": [{
              "profile": { "name": "test user name" }, "wa_id": "16315551181"
            }],
            "messages": [
              {
                "from": "16315551181",
                "id": "ABGGFlA5Fpa",
                "timestamp": "1504902988",
                "type": "text",
                "text": { "body": "this is a text message" }
              }]

          }
        }]
    }]
}