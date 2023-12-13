import { Review, ReviewAnalysis } from "@prisma/client";
import { AnnotatedTextResult } from "../../ai/nlp/nlp.types";
import { memoizedAnnotateText } from "../../ai/nlp/nlp.analyzer";
import { tranformRawAnalysis } from "./analysis.utils";
import prisma from "../../../utils/prisma";
import { log } from "../../../utils/logger";

const quotaPerMinute: number = Number.parseInt(process.env.QUOTA_PER_MINUTE) || 500;
export async function analyzeReviews(reviews: Array<Review>) {
    log.info(`Starting analysis`);
    const anaylsis = [];
    let i = 0;
    let cache_hits = 0;
    for (const review of reviews) {
        try {

            const { result, fromCache } = await memoizedAnnotateText(review.review);

            let cleanData = tranformRawAnalysis(result as AnnotatedTextResult);
            cleanData.reviewId = review.id;

            anaylsis.push(cleanData);
            log.trace(`${i++}) Analyzed review ${review.id}`);
            if (fromCache) cache_hits++;
            if ((i % quotaPerMinute) === 0) {
                log.info(`Quota reached, waiting 1 minute`);
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        } catch (e) {
            log.warn(`Error analyzing review ${review.id}: ${e}`);
            log.trace(`Skipping review ${review.id}`)
        }
    }

    log.info(`Finished analysis \n\tCache hits: ${cache_hits}\n\tNewly analyzed: ${i - cache_hits} \n\tTotal reviews analyzed: ${i}`);
    return anaylsis as Array<ReviewAnalysis>;
}

export async function saveAnalysis(analysis: Array<ReviewAnalysis>) {
    return await prisma.reviewAnalysis.createMany({
        data: analysis
    })
}