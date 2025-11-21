import { axiosClient } from "../apiClient";
import { GetLabelsRes } from "./lifecycle.types";

const LIFECYCLE_URL = `/lifecycles`;

export const getLifeCycles = async () => {
  return (await axiosClient.get(LIFECYCLE_URL)).data as Array<GetLabelsRes>;
};

export const createLifeCycle = async (lifecycle) => {
  return (await axiosClient.post(LIFECYCLE_URL, lifecycle)).data;
};

export const updateLifeCycle = async ({ id, data }) => {
  return (await axiosClient.put(`${LIFECYCLE_URL}/${id}`, data)).data;
};

export const deleteLifeCycle = async (lifecycleId: string) => {
  return (await axiosClient.delete(`${LIFECYCLE_URL}/${lifecycleId}`)).data;
};

export const reorderLifeCycles = async (data) => {
  return (
    await axiosClient.put(`${LIFECYCLE_URL}/reorder`, { lifecycles: data })
  ).data;
};
