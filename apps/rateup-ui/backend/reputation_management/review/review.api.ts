import dayjs, { Dayjs } from "dayjs";
import { REPUTATION_MANAGEMENT_PATH } from "..";
import { axiosClient } from "../../apiClient";
import { ReviewPlatform } from "../../../types/enums";

const REVIEW_PATH = `${REPUTATION_MANAGEMENT_PATH}/review`;

export interface ReviewWithAnalysis {
  id: string;
  reviewedAt: Dayjs;
  review: string | null;
  title: string | null;
  rating: number | null;
  platform: ReviewPlatform;
  ReviewAnalysis: ReviewAnalysis;
}

interface ReviewAnalysis {
  entities: Entity[];
  sentences: Sentence[];
  sentiment: number;
}
interface Entity {
  name: string;
  score: number;
}
interface Sentence {
  text: string;
  score: number;
}
export async function getReviewsWithAnalysis(teamId: string) {
  const response = await axiosClient.get(
    `${REVIEW_PATH}/${teamId}?includeAnalysis=true`,
  );
  response.data.forEach((r: ReviewWithAnalysis) => {
    r.reviewedAt = dayjs(r.reviewedAt);
  });
  return response.data as Array<ReviewWithAnalysis>;
}

export async function initGoogleReviews(teamId: string, dataId: string) {
  const response = await axiosClient.post(`${REVIEW_PATH}/${teamId}/fetch`, {
    dataId,
  });
  return response.data;
}
