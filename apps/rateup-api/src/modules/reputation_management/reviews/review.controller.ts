import { FastifyRequest, FastifyReply } from "fastify";
import { getReviewsByTeamId, getReviewsWithAnalysis, getReviewsWithReviewText, saveReviewsToDB } from "./review.service";
import { ByTeamIdParams } from "../../team/team.schema";
import { scrapeReviews } from "./review.scraper";
import { analyzeReviews, saveAnalysis } from "../analysis/analysis.service";
import { Review } from "@prisma/client";
import { GetReviewQuery } from "./review.schema";
import { log } from "../../../utils/logger";

export async function getReviewsByTeamIdHandler(
    request: FastifyRequest<{
        Params: ByTeamIdParams,
        Querystring: GetReviewQuery
    }>,
    reply: FastifyReply
) {
    const { teamId } = request.params;
    let reviews = [];

    if (request.query.includeAnalysis) {
        reviews = await getReviewsWithAnalysis(teamId);
    } else {
        reviews = await getReviewsByTeamId(teamId);
    }
    reply.send(reviews);
}

export async function fetchReviewsHandler(
    request: FastifyRequest<{
        Params: ByTeamIdParams,
        Body: {
            dataId: string
        }
    }>,
    reply: FastifyReply
) {
    const { teamId } = request.params;
    reply.send();
    const rawReviews = await scrapeReviews(request.body.dataId);
    await saveReviewsToDB(rawReviews, teamId);
    const reviewsWithReviewText = await getReviewsWithReviewText(teamId);
    log.info(`found ${reviewsWithReviewText.length} reviews with review text`);
    const analysis = await analyzeReviews(reviewsWithReviewText as Array<Review>);
    await saveAnalysis(analysis);
}