import { Review, ReviewAnalysis } from "@prisma/client";
import { AnnotatedTextResult } from "../../ai/nlp/nlp.types";
import { annotateText } from "../../ai/nlp/nlp.analyzer";
import { tranformRawAnalysis } from "./analysis.utils";
import prisma from "../../../utils/prisma";
import { log } from "../../../utils/logger";

export async function analyzeReviews(reviews: Array<Review>) {
    log.info(`Starting analysis`);
    const anaylsis = [];
    let i = 0;
    for (const review of reviews) {
        try {
            const result = await annotateText(review.review);

            let cleanData = tranformRawAnalysis(result as AnnotatedTextResult);
            cleanData.reviewId = review.id;

            anaylsis.push(cleanData);
            log.trace(`${i++}) Analyzed review ${review.id}`);
        } catch (e) {
            log.warn(`Error analyzing review ${review.id}: ${e}`);
            log.trace(`Skipping review ${review.id}`)
        }
    }

    log.info(`Finished analysis`);
    return anaylsis as Array<ReviewAnalysis>;
}

export async function saveAnalysis(analysis: Array<ReviewAnalysis>) {
    return await prisma.reviewAnalysis.createMany({
        data: analysis
    })
}