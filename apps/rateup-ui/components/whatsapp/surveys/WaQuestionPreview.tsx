import { QuestionType as Q } from "../../../types/enums";
import {
  ResponseMessageContainer,
  WaListMessage,
  WaMessageBody,
  WaMessageFooter,
  WaMessageHeader,
  WaResponseMessage,
  WaSentMessage,
} from "../MessageComponents";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { Stack } from "@mantine/core";

interface WaQuestionPreviewProps {
  question: Question;
  openList: any;
}
export function WaQuestionPreview({
  question,
  openList,
}: WaQuestionPreviewProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const title = question.title[selectedLanguage];
  const description = question.description[selectedLanguage];

  switch (question.type) {
    case Q.Email:
    case Q.TextArea:
    case Q.Number:
    case Q.Photo:
    case Q.Text: {
      return <WaResponseMessage header={title} body={description} />;
    }
    case Q.DateTime: {
      return (
        <>
          <WaResponseMessage
            header={title}
            body={description}
            footer="Please enter in the format: dd/mm/yyyy"
          />
          <WaSentMessage body="12/12/2012" />
        </>
      );
    }
    case Q.Phone: {
      return (
        <WaResponseMessage
          header={title}
          body={description}
          footer="Please enter phone number with country code: 91XXXXXXXXXX"
          quickReplyButtons={["Use this number"]}
        />
      );
    }
    case Q.YN: {
      return (
        <WaResponseMessage
          header={title}
          body={description}
          quickReplyButtons={["No", "Yes"]}
        />
      );
    }
    case Q.LD: {
      return (
        <WaResponseMessage
          header={title}
          body={description}
          quickReplyButtons={["Dislike", "Like"]}
        />
      );
    }
    case Q.MCQ:
    case Q.CustomNPS: {
      const choices = question.choices?.[selectedLanguage] || [];
      return (
        <>
          <ResponseMessageContainer>
            <Stack gap={4}>
              {title && <WaMessageHeader>{title}</WaMessageHeader>}
              <WaMessageBody>
                {description}
                {choices.map((choice, i) => (
                  <>
                    <br />
                    &nbsp;
                    {`${i + 1}) ${choice?.value}`}
                  </>
                ))}
              </WaMessageBody>
              {
                <WaMessageFooter>
                  {"Enter index of your choice"}
                </WaMessageFooter>
              }
            </Stack>
          </ResponseMessageContainer>
          <WaSentMessage body="1" />
        </>
      );
    }
    case Q.Testimonial: {
      const features = question?.features?.[selectedLanguage] || {};
      return (
        <>
          <WaResponseMessage
            header={title}
            body={description}
            footer="Please share your name"
          />
          <WaSentMessage body="John" />
          {features?.jobTitle && (
            <>
              <WaResponseMessage body={"Please share your job title"} />
              <WaSentMessage body="Marketing specialist" />
            </>
          )}
          <WaResponseMessage body={"Please share details of your experience"} />
          <WaSentMessage body="Absolutely loved this product! It exceeded my expectations - great quality, user-friendly, and worth every penny. Highly recommend!" />
          {features?.rating && (
            <>
              <WaListMessage body="Rate us" openList={openList} />
            </>
          )}
          {features?.photo && (
            <>
              <WaResponseMessage body={"Please share your photo"} />
            </>
          )}
        </>
      );
    }
    case Q.WaButtons: {
      const choices = question.choices?.[selectedLanguage] || [];
      return (
        <WaResponseMessage
          header={title}
          body={description}
          quickReplyButtons={choices}
        />
      );
    }
    case Q.WaList: {
      return (
        <WaListMessage header={title} body={description} openList={openList} />
      );
    }
  }
}
