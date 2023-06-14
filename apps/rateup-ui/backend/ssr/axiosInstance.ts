import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function setAuthHeader(accessToken: string): void {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
}

export default axiosInstance;
