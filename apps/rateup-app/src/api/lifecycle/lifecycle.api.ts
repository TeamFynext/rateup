import axios from "@/config/axios";

export const getLifeCycles = async () => {
  return (await axios.get("/api/lifecycles")).data;
};
