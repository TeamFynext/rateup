import { axiosClient } from "../../apiClient";

interface ICreateBusinessHour {
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

/**
 * The payload the create/update endpoints accept. Kept separate from `ICreateBusinessHour`
 * (which the response extends) because `channels` and `description` are optional on the way
 * in — the form omits them when left blank — but always present on the way back out.
 */
export interface BusinessHoursInput {
  name: string;
  timezone: string;
  channels?: string[];
  description?: string;
  schedule: Record<
    string,
    {
      isOpen: boolean;
      timeSlots: Array<{ openTime: string; closeTime: string }>;
    }
  >;
}

const BASE_PATH = "/org";

export const createBusinessHour = (data: BusinessHoursInput) =>
  axiosClient.post<IBusinessHour>(`${BASE_PATH}/business-hours`, data);

export const getAllBusinessHours = () =>
  axiosClient.get<IBusinessHour[]>(`${BASE_PATH}/business-hours`);

export const getBusinessHour = (id: string) =>
  axiosClient.get<IBusinessHour>(`${BASE_PATH}/business-hours/${id}`);

export const updateBusinessHour = (id: string, data: BusinessHoursInput) =>
  axiosClient.put<IBusinessHour>(`${BASE_PATH}/business-hours/${id}`, data);

export const deleteBusinessHour = (id: string) =>
  axiosClient.delete(`${BASE_PATH}/business-hours/${id}`);
