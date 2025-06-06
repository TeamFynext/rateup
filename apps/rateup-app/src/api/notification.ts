import axios from "../config/axios";

export const addToken = async (token: string) => {
  const res = await axios.post("/api/mobilenotification", { expoToken: token });
  return res.data;
};

export const getToken = async () => {
  const res = await axios.get("/api/mobilenotification");
  return res.data;
};
