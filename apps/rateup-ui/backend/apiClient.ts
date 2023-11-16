import axios from "axios";

export const axiosClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

export const axiosClientIP = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_IP}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});
