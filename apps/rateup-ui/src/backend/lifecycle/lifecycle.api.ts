import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";
import type { GetLabelsRes, LifecycleWithContactCount } from "./lifecycle.types";

const LIFECYCLE_URL = `/lifecycles`;

export const getLifeCycles = async () => {
  return (await axiosClient.get(LIFECYCLE_URL)).data as Array<GetLabelsRes>;
};

export const createLifeCycle = async (lifecycle: RequestPayload) => {
  return (await axiosClient.post(LIFECYCLE_URL, lifecycle)).data;
};

export const updateLifeCycle = async ({ id, data }: { id: string; data: RequestPayload }) => {
  return (await axiosClient.put(`${LIFECYCLE_URL}/${id}`, data)).data;
};

export const deleteLifeCycle = async (lifecycleId: string) => {
  return (await axiosClient.delete(`${LIFECYCLE_URL}/${lifecycleId}`)).data;
};

export const reorderLifeCycles = async (data: RequestPayload) => {
  return (await axiosClient.put(`${LIFECYCLE_URL}/reorder`, { lifecycles: data })).data;
};

export const getLifecyclesWithContactCount = async () => {
  return (await axiosClient.get(`${LIFECYCLE_URL}/contacts`))
    .data as Array<LifecycleWithContactCount>;
};
