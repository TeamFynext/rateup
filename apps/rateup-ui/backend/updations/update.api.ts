//For New Migrations and Updations

import { axiosClient } from "../apiClient";

export const updatePageTypeQuestions = async () => {
  const response = await axiosClient.post(
    "/public/update/updatePageTypeQuestions",
  );
  return response.data;
};
