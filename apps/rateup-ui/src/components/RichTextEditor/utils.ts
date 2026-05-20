import { isHtml } from "@/utils/index.ts";
import { getFormattedTitleFromVariable } from "@/utils/survey/question/question.utils";

function isYouTubeLink(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return youtubeRegex.test(url);
}

const getContent = (title: string, desc: string, variables) => {
  if (isHtml(title)) {
    return getFormattedTitleFromVariable(title, variables) || title;
  } else if (desc) {
    return `<h3>${title}</h3><p> ${desc}</p>`;
  } else if (title) {
    return `<h3>${title}</h3>`;
  }
};

export { getContent, isYouTubeLink };
