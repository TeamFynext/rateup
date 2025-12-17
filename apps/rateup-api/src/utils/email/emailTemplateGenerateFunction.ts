import { QuestionType } from "../../types/enums.js";

const generateListHtml = (list) => {
  return list?.map((item) => `<li>${Object.values(item)[0]}</li>`).join(" ");
};

const generateImageHtml = (imgSrc, s3Upload = false) => {
  const url = s3Upload
    ? process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL
    : process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL;
  return `<img src="${url}/${imgSrc}" width="200px" alt="photo-survey"/>`;
};

export const generateAnswerHtml = (answer, type) => {
  if (Array.isArray(answer)) {
    return `<ul>${generateListHtml(answer)}</ul>`;
  } else if (typeof answer === "object" && Object.keys(answer)?.length > 1) {
    let listHtmlString = "";
    for (const [key, value] of Object.entries(answer)) {
      let processedValue = value;
      if (key === "photo") {
        processedValue = generateImageHtml(processedValue);
      }
      listHtmlString += `<li>${key}: ${processedValue}</li>`;
    }
    return `<ul>${listHtmlString}</ul>`;
  } else if (type === QuestionType.PCQ) {
    const item: any = Object.values(answer)[0];
    const processedValue = generateImageHtml(item?.image, true);
    return `<ul><div>${item?.value}</div><div>${processedValue}</div></ul>`;
  } else if (typeof answer === "object") {
    return Object.values(answer)[0];
  } else if (type === "Photo") {
    return generateImageHtml(answer);
  }
  return answer;
};
