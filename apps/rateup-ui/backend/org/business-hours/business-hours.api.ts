import { BusinessHoursFormValues } from "@/components/account/business-hours/schema";

import { axiosClient } from "../../apiClient";

export interface ICreateBusinessHour {
  name: string;
  timezone: string;
  channels: string[];
  description: string;
  schedule: Record<
    string,
    {
      isOpen: boolean;
      timeSlots: Array<{ openTime: string; closeTime: string }>;
    }
  >;
}

export interface IBusinessHour extends ICreateBusinessHour {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}
const BASE_PATH = "/org";

export const createBusinessHour = (data: BusinessHoursFormValues) =>
  axiosClient.post<IBusinessHour>(`${BASE_PATH}/business-hours`, data);

export const getAllBusinessHours = () =>
  axiosClient.get<IBusinessHour[]>(`${BASE_PATH}/business-hours`);

export const getBusinessHour = (id: string) =>
  axiosClient.get<IBusinessHour>(`${BASE_PATH}/business-hours/${id}`);

export const updateBusinessHour = (id: string, data: BusinessHoursFormValues) =>
  axiosClient.put<IBusinessHour>(`${BASE_PATH}/business-hours/${id}`, data);

export const deleteBusinessHour = (id: string) =>
  axiosClient.delete(`${BASE_PATH}/business-hours/${id}`);
