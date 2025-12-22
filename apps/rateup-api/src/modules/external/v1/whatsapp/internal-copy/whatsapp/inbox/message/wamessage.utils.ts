import { WaReceiveMessageBody } from "../../../../../../../../types/whatsapp.types.js";
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
) {
  if (messageBody.exchangeProcess === "receive") {
    const unixTimeStamp = parseInt(
      (messageBody?.receive as WaReceiveMessageBody).messages[0].timestamp,
    );
    const utcTimeStamp = dayjs.unix(unixTimeStamp).utc().format();
    return utcTimeStamp;
  }
  return dayjs().utc().format();
}
