import { axiosClient } from "../apiClient";
import { GetLabelsRes } from "./label.types";

const LABEL_URL = `/labels`;

export const getLabels = async () => {
  return (await axiosClient.get(LABEL_URL)).data as Array<GetLabelsRes>;
};

export const createLabel = async (label) => {
  return (await axiosClient.post(LABEL_URL, label)).data;
};

export const updateLabel = async ({ labelId, data }) => {
  return (await axiosClient.put(`${LABEL_URL}/${labelId}`, data)).data;
};

export const deleteLabel = async (labelId: string) => {
  return (await axiosClient.delete(`${LABEL_URL}/${labelId}`)).data;
};
