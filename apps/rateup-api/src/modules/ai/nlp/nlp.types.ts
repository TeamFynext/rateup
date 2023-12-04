export interface AnnotatedTextResult {
    sentences:            RawSentence[];
    tokens:               any[];
    entities:             RawEntity[];
    categories:           RawCategory[];
    moderationCategories: RawCategory[];
    documentSentiment:    RawSentiment;
    language:             string;
}

export interface RawCategory {
    name:       string;
    confidence: number;
}

export interface RawSentiment {
    magnitude: number;
    score:     number;
}

export interface RawEntity {
    mentions:  Mention[];
    metadata:  Metadata;
    name:      string;
    type:      string;
    salience:  number;
    sentiment: RawSentiment;
}

export interface Entity {
    name: string,
    score: number,
}
export interface Sentence {
    text: string,
    score: number,
}

export interface Mention {
    text:      Text;
    type:      Type;
    sentiment: RawSentiment;
}

interface Text {
    content:     string;
    beginOffset: number;
}

enum Type {
    Common = "COMMON",
    Proper = "PROPER",
}

interface Metadata {
}

export interface RawSentence {
    text:      Text;
    sentiment: RawSentiment;
}