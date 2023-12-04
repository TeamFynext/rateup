import { AnnotatedTextResult, Entity, Sentence } from "../../ai/nlp/nlp.types";


export function tranformRawAnalysis(rawData: AnnotatedTextResult) {
    let cleanData = {
        entities: [] as Array<Entity>,
        sentiment: 0,
        sentences: [] as Array<Sentence>,
        reviewId: ""
    };
    rawData.entities.forEach(entity => {
        cleanData.entities.push({
            name: entity.name,
            score: entity.sentiment.score
        })
    })
    cleanData.sentiment = rawData.documentSentiment.score;
    rawData.sentences.forEach(sentence => {
        cleanData.sentences.push({
            text: sentence.text.content,
            score: sentence.sentiment.score
        })
    })

    return cleanData;
}