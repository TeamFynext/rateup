import axios from "@/src/config/axios";

export async function getMessagesByContactId(
  contactId: string,
  cursor: string
) {
  const res = await axios.get(
    `/api/wa/inbox/message/${contactId}?cursor=${cursor}`
  );
  return res.data;
}

export async function sendNewWaMessage(contactId: string, message: any) {
  return await axios.post(`/api/wa/inbox/message/${contactId}`, message);
}

export async function getWaChatMediaFile(mediaId: string) {
  const response = await axios.get(
    `/api/wa/inbox/message/mediafile/${mediaId}`,
    {
      responseType: "arraybuffer",
    }
  );
  return response.data;
}

const ORG_WS_BASE_PATH = "/api/org/ws";
export async function orgWsAuthCheck() {
  return (await axios.get(`${ORG_WS_BASE_PATH}/auth`)).data as {
    afterAuthId: string;
  };
}
