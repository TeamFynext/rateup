import { AxiosResponse } from 'axios';
import axiosInstance, { setAuthHeader } from './axiosInstance';

interface ResponseData {
  message: string;
  data: any;
}

export async function fetchTeamsByUser(session): Promise<{ data: ResponseData }> {
  try {
    setAuthHeader(session.accessToken);
    const response: AxiosResponse = await axiosInstance.get('/api/team/user');
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

export async function getTeamMembersFromInvite(teamId: string, session): Promise<{ data: any }> {
  try {
    setAuthHeader(session.accessToken);
    const response: AxiosResponse = await axiosInstance.get(`/api/team/invitation/${teamId}`);
    const data: any = response.data;
    return { data };
  } catch (error) {
    console.error('Error fetching members:', error);
    throw error;
  }
}

export async function fetchTeamSurveys(teamId: string, session): Promise<{ data: any }> {
  try {
    setAuthHeader(session.accessToken);
    const response: AxiosResponse = await axiosInstance.get(`/api/survey/team/${teamId}`);
    const data: any = response.data;
    return { data };
  } catch (error) {
    console.error('Error fetching team surveys:', error);
    throw error;
  }
}