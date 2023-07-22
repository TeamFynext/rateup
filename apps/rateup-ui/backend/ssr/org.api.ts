import { AxiosResponse } from 'axios';
import axiosInstance, { setAuthHeader } from './axiosInstance';

interface ResponseData {
  message: string;
  data: any;
}

export async function fetchTeamsMembersOfOrg(session): Promise<{ data: ResponseData }> {
  try {
    setAuthHeader(session.accessToken);
    const response: AxiosResponse = await axiosInstance.get('/org/members');
    const data: ResponseData = {
      message: response.data.message,
      data: response.data.data,
    };
    return { data };
  } catch (error) {
    console.error('Error fetching teams by user:', error);
    throw error;
  }
}