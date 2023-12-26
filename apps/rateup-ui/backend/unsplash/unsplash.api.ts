import { axiosClientUnsplash } from "../apiClient";

export const getPhotosList = async ({
  pageParams,
  searchQuery,
}: {
  pageParams: number;
  searchQuery: string;
}) => {
  const response = await axiosClientUnsplash.get(
    searchQuery?.length > 0
      ? `/search/photos?page=${pageParams}&query=${searchQuery}`
      : `/photos?page=${pageParams}`,
  );
  return response?.data;
};
