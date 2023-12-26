import { axiosClient } from "../apiClient";

const unsplash_URL = "/unsplash";
export const getPhotosList = async ({
  pageParams = 1,
  searchQuery,
}: {
  pageParams: number;
  searchQuery: string;
}) => {
  const response = await axiosClient.get(
    `${unsplash_URL}/photos?page=${pageParams}&query=${searchQuery}`,
  );
  return response?.data;
};
