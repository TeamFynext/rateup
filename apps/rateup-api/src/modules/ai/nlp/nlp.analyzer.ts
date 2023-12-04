/**
 * This module is responsible for analyzing text using Google's NLP API
 */

import nlp from "@google-cloud/language"
import fs from "fs";




fs.writeFileSync("./nlp_auth.json", process.env.NLP_AUTH || "")

// Instantiates a client
const nlp_client = new nlp.v1beta2.LanguageServiceClient();

export async function annotateText(text: string) {
    const result = await nlp_client.annotateText({
        document: {
            type: 'PLAIN_TEXT',
            content: text
        },
        features: {
            extractDocumentSentiment: true,
            extractEntities: true,
            extractEntitySentiment: true,
            classifyText: false,
            moderateText: false,
        }
    }, {

    })
    return result[0]
}