import { PlatformType } from "../../../../../generated/prisma/enums.js";
import { WaReceiveMessageBody } from "../../../../types/whatsapp.types.js";
import { downloadAndUpload } from "../../whatsappSurvey/wasurvey.utils.js";
import dayjs from "dayjs";

export async function handleWaReceivedImages(
  messageBody: WaInboxMessageBody,
  orgId: string,
): Promise<WaInboxMessageBody> {
  if (
    messageBody?.exchangeProcess === "receive" &&
    (messageBody?.receive as WaReceiveMessageBody)?.messages[0]?.type ===
      "image"
  ) {
    const uniqueImageId = await downloadAndUpload(
      orgId,
      (messageBody?.receive as WaReceiveMessageBody)?.messages[0]?.image?.id,
    );
    return {
      ...messageBody,
      receive: {
        ...messageBody.receive,
        messages: [
          {
            ...(messageBody?.receive as WaReceiveMessageBody).messages[0],
            image: {
              ...(messageBody?.receive as WaReceiveMessageBody).messages[0]
                .image,
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
  platform: PlatformType,
) {
  if (messageBody.exchangeProcess === "receive") {
    if (platform === PlatformType.INSTAGRAM) {
      return new Date(
        (messageBody.receive as IgReceiveMessageBody).timestamp,
      ).toISOString();
    }
    const unixTimeStamp = parseInt(
      (messageBody.receive as WaReceiveMessageBody).messages[0].timestamp,
    );
    const utcTimeStamp = dayjs.unix(unixTimeStamp).utc().format();
    return utcTimeStamp;
  }
  return dayjs().utc().format();
}

export const isSessionExpired = (userInitiatedFinalTimeStamp: Date) =>
  userInitiatedFinalTimeStamp &&
  dayjs().diff(userInitiatedFinalTimeStamp, "D") >= 1;

export function extractMentions(text: string): string[] {
  return (
    text.match(/(?<!\S)@[a-zA-Z0-9_.]+/g)?.map((mention) => mention.slice(1)) ??
    []
  );
}
