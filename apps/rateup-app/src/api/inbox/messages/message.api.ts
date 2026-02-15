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

export async function assignInboxToUser(data: {
  contactId: string;
  assignees: { userId: string; teamId: string }[];
  messageId: string; // for internal message
}): Promise<{ id: string; name: string }[]> {
  return (await axios.post(`/api/wa/inbox/message/assign`, data)).data;
}

export async function getAssignedUserForContact(contactId: any) {
  return (await axios.get(`/api/wa/inbox/message/assign/${contactId}`)).data;
}

export async function createPrivateMessage(contactId: string, data: any) {
  return (await axios.post(`/api/wa/inbox/message/privatemessage/${contactId}`, data))
    .data;
}
