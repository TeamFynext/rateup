import { REPUTATION_MANAGEMENT_PATH } from "..";
import { axiosClient } from "../../apiClient";

const TOPIC_PATH = `${REPUTATION_MANAGEMENT_PATH}/topic`;

export async function getTopics(teamId: string) {
  const response = await axiosClient.get(`${TOPIC_PATH}/${teamId}`);
  return response.data as Array<RM_Topic>;
}
export async function createTopic(topic: Omit<RM_Topic, "id">) {
  const response = await axiosClient.post(`${TOPIC_PATH}`, topic);
  return response.data as RM_Topic;
}
export async function updateTopic(topic: Partial<RM_Topic>) {
  const response = await axiosClient.put(`${TOPIC_PATH}/${topic.id}`, topic);
  return response.data as RM_Topic;
}
export async function deleteTopic(topicId: string) {
  const response = await axiosClient.delete(`${TOPIC_PATH}/${topicId}`);
  return response.data as RM_Topic;
}
