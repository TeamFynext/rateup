import { QuestionType } from "../../types/enums.js";

const generateListHtml = (list: unknown[] | undefined) => {
  return list
    ?.map((item) =>
      item && typeof item === "object" ? `<li>${Object.values(item)[0]}</li>` : `<li>${item}</li>`,
    )
    .join(" ");
};

const generateImageHtml = (imgSrc: string | undefined, s3Upload = false) => {
  const url = s3Upload
    ? process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL
    : process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL;
  return `<img src="${url}/${imgSrc}" width="200px" alt="photo-survey"/>`;
};

export const generateAnswerHtml = (answer: unknown, type: QuestionType | string) => {
  if (Array.isArray(answer)) {
    return `<ul>${generateListHtml(answer)}</ul>`;
  } else if (typeof answer === "object" && answer !== null && Object.keys(answer).length > 1) {
    let listHtmlString = "";
    for (const [key, value] of Object.entries(answer)) {
      let processedValue = value;
      if (key === "photo" && typeof processedValue === "string") {
        processedValue = generateImageHtml(processedValue);
      }
      listHtmlString += `<li>${key}: ${processedValue}</li>`;
    }
    return `<ul>${listHtmlString}</ul>`;
  } else if (type === QuestionType.PCQ && typeof answer === "object" && answer !== null) {
    const item = Object.values(answer)[0];
    const image = item && typeof item === "object" ? item.image : undefined;
    const value = item && typeof item === "object" ? item.value : undefined;
    const processedValue = generateImageHtml(image, true);
    return `<ul><div>${value}</div><div>${processedValue}</div></ul>`;
  } else if (typeof answer === "object" && answer !== null) {
    return Object.values(answer)[0];
  } else if (type === "Photo" && typeof answer === "string") {
    return generateImageHtml(answer);
  }
  return answer;
};
