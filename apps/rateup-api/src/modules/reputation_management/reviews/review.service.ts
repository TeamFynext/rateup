import { ReviewPlatform } from "../../../types/enums";
import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";
import { ReviewInput } from "./review.schema";

export async function getReviewsByTeamId(teamId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      teamId: teamId,
    },
    select: {
      id: true,
      reviewedAt: true,
      review: true,
      rating: true,
      platform: true,
    },
  });
  return reviews;
}

export async function getReviewsWithAnalysis(teamId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      teamId: teamId,
    },
    select: {
      id: true,
      ReviewAnalysis: true,
      reviewedAt: true,
      review: true,
      rating: true,
      platform: true,
    },
  });
  return reviews;
}

export async function getReviewsWithReviewText(teamId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      teamId: teamId,
      review: {
        not: null,
      },
    },
  });
  return reviews;
}

export async function deleteReview(reviewId: string) {
  const review = await prisma.review.delete({
    where: {
      id: reviewId,
    },
  });
  return review;
}

export async function deleteAllReviews(teamId: string) {
  const reviews = await prisma.review.deleteMany({
    where: {
      teamId: teamId,
    },
  });
  log.trace(`Deleted ${reviews.count} reviews from team ${teamId}`);
  return reviews;
}

export async function createReview(review: ReviewInput) {
  const newReview = await prisma.review.create({
    data: review as any,
  });
  return newReview;
}

export async function updateReview(
  reviewId: string,
  updatedReview: ReviewInput,
) {
  const review = await prisma.review.update({
    where: {
      id: reviewId,
    },
    data: updatedReview,
  });
  return review;
}

export async function saveReviewsToDB(reviews: any, teamId: string) {
  return await prisma.review.createMany({
    data: reviews.map((review) => ({
      teamId,
      review: review.review ? review.review : undefined,
      rating: Number.parseInt(review.rating)
        ? Number.parseInt(review.rating)
        : undefined,
      meta: { reviewedBy: review.name },
      platform: ReviewPlatform.GOOGLE,
      reviewedAt: new Date(review.date),
    })),
  });
}
