import { downloadAndUpload } from "../../whatsappSurvey/wasurvey.utils";

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
