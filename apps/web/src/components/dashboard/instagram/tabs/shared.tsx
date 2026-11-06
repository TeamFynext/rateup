// Shared helpers for the modules in `./`.
// Extracted verbatim from `InstagramDashboard.tsx`. Behaviour is unchanged.

export interface DraftIceBreaker {
  id: string;
  question: string;
  payload: string;
}

export interface DraftMenuItem {
  id: string;
  type: "postback" | "web_url";
  title: string;
  payload: string;
  url: string;
}
