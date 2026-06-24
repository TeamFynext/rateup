// create a function to extract the video id from a youtube url
export const extractVideoId = (url: string): string => {
  const regex =
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+))([^/&]{10,12})/;
  const match = url.match(regex);
  return match ? match[1] : "";
};
