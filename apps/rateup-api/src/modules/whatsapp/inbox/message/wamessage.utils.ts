import { downloadAndUpload } from "../../whatsappSurvey/wasurvey.utils";
import dayjs from "dayjs";

export async function handleWaReceivedImages(
  messageBody: WaInboxMessageBody,
  orgId: string,
): Promise<WaInboxMessageBody> {
  if (
    messageBody?.exchangeProcess === "receive" &&
    messageBody?.receive?.messages[0]?.type === "image"
  ) {
    const uniqueImageId = await downloadAndUpload(
      orgId,
      messageBody?.receive?.messages[0]?.image?.id,
    );
    return {
      ...messageBody,
      receive: {
        ...messageBody.receive,
        messages: [
          {
            ...messageBody.receive.messages[0],
            image: {
              ...messageBody.receive.messages[0].image,
              link: uniqueImageId,
            },
          },
        ],
      },
    };
  }
  return messageBody;
}

export async function returnAppropriateTimeStamp(
  messageBody: WaInboxMessageBody,
) {
  if (messageBody.exchangeProcess === "receive") {
    const unixTimeStamp = parseInt(messageBody.receive.messages[0].timestamp);
    const utcTimeStamp = dayjs.unix(unixTimeStamp).utc().format();
    return utcTimeStamp;
  }
  return dayjs().utc().format();
}

export const isSessionExpired = (userInitiatedFinalTimeStamp: Date) =>
  userInitiatedFinalTimeStamp &&
  dayjs().diff(userInitiatedFinalTimeStamp, "D") >= 1;
