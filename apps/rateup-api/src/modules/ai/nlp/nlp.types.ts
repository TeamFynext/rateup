export interface AnnotatedTextResult {
  sentences: RawSentence[];
  /** Per-token parse output; unread by this codebase, kept so the shape round-trips. */
  tokens: unknown[];
  entities: RawEntity[];
  documentSentiment: RawSentiment;
  language: string;
}

interface RawSentiment {
  magnitude: number;
  score: number;
}

interface RawEntity {
  mentions: Mention[];
  metadata: Metadata;
  name: string;
  type: string;
  salience: number;
  sentiment: RawSentiment;
}

export interface Entity {
  name: string;
  score: number;
}
export interface Sentence {
  text: string;
  score: number;
}

interface Mention {
  text: Text;
  type: Type;
  sentiment: RawSentiment;
}

interface Text {
  content: string;
  beginOffset: number;
}

enum Type {
  Common = "COMMON",
  Proper = "PROPER",
}

interface Metadata {}

export interface RawSentence {
  text: Text;
  sentiment: RawSentiment;
}
