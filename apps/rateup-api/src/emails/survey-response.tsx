import { Img, Section, Text } from "react-email";
import {
  Display,
  EmailLayout,
  Paragraph,
  PrimaryButton,
  Title,
} from "../utils/email/react/components.js";
import type { EmailAnswerItem } from "../utils/email/emailTemplateGenerateFunction.js";

export interface SurveyResponseAnswer {
  question: string;
  items: EmailAnswerItem[];
}

export interface SurveyResponseEmailProps {
  surveyTitle: string;
  resultsLink: string;
  answers: SurveyResponseAnswer[];
  /** Recurring notification, so the footer carries Collage's unsubscribe line. */
  unsubscribeUrl?: string;
}

function AnswerItem({ item }: { item: EmailAnswerItem }) {
  return (
    <Section className="mt-1">
      {item.label ? <Text className="font-13 text-fg-3 m-0">{item.label}</Text> : null}
      {item.text ? <Text className="font-14 text-fg m-0">{item.text}</Text> : null}
      {item.imageUrl ? (
        <Img
          src={item.imageUrl}
          alt={item.label ?? "Response photo"}
          width={200}
          className="mt-2 block rounded-[6px] border-none"
        />
      ) : null}
    </Section>
  );
}

export function SurveyResponseEmail({
  surveyTitle,
  resultsLink,
  answers,
  unsubscribeUrl,
}: SurveyResponseEmailProps) {
  return (
    <EmailLayout preview={`New response to ${surveyTitle}`} unsubscribeUrl={unsubscribeUrl}>
      <Section className="mb-9">
        <Display>Someone just answered</Display>
        <Paragraph>
          A new response came in for <strong>{surveyTitle}</strong>. Here it is, word for word.
        </Paragraph>
      </Section>

      {answers.map((answer, index) => (
        <Section
          key={index}
          className={
            index === answers.length - 1
              ? "py-5"
              : "border-stroke border-0 border-b border-solid py-5"
          }
        >
          <Title>{answer.question}</Title>
          {answer.items.map((item, itemIndex) => (
            <AnswerItem key={itemIndex} item={item} />
          ))}
        </Section>
      ))}

      <Section className="pt-4">
        <PrimaryButton href={resultsLink}>See every response</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

SurveyResponseEmail.PreviewProps = {
  surveyTitle: "Coffee Bar — Customer Satisfaction",
  resultsLink: "https://rateup.app/dashboard/surveys/abc?tab=Result",
  unsubscribeUrl: "https://rateup.app/dashboard/settings/account",
  answers: [
    {
      question: "How would you rate your visit?",
      items: [{ text: "5 — Excellent" }],
    },
    {
      question: "What did you enjoy most?",
      items: [{ text: "Filter coffee" }, { text: "Fast service" }],
    },
    {
      question: "Anything we could improve?",
      items: [{ text: "More seating near the window during the evening rush." }],
    },
  ],
} satisfies SurveyResponseEmailProps;

export default SurveyResponseEmail;
