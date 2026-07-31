import { IconCheck, IconChevronLeft } from "@tabler/icons-react";
import { Image as NextImage } from "@unpic/react";
import dayjs from "dayjs";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { SurveyTheme } from "@/context/SurveyThemeContext.tsx";
import { cn } from "@/lib/utils";
import { QuestionType as Q } from "@/types/enums.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { extractText, isHtml } from "@/utils/index.ts";

import { SmileyVariantStyle } from "../../Question/QuestionExtraProps/SmileyExtraProps.tsx";
import { getCustomSmileyIcon, getNumericValue, mapSmileyIcon } from "./SmileyRating/index.tsx";
import { getDefaultSmileySrc } from "./SmileyRating/SmileyRatingStyling.tsx";

function ReadOnlyRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
          )}
        />
      ))}
    </div>
  );
}

function ConfirmResponsesModal({
  opened,
  close,
  survey,
  questionsHistory,
  responses,
  selectedLanguage,
  surveyThemeData,
  finishSurvey,
  isSavingResponses,
  largeScreen,
}: {
  opened: boolean;
  close: () => void;
  survey: Survey;
  questionsHistory: string[];
  responses: QuestionResponse[];
  selectedLanguage: string;
  surveyThemeData: SurveyTheme | null;
  finishSurvey: () => void;
  isSavingResponses: boolean;
  largeScreen: boolean;
}) {
  const { t: translations } = useTranslation();
  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[85vh] min-h-[70vh] flex-col px-8 py-4 shadow-[0_0_10px_5px_rgba(0,0,0,0.1)] sm:max-w-lg">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-bold">
            {translations("Confirm your responses")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto pt-4">
          <div className="flex flex-col gap-4 pb-8">
            {survey.questions
              .filter((q: Question) => questionsHistory.includes(q.id))
              .map((question: Question) => {
                const response = responses.find(
                  (response: QuestionResponse) => response.questionId === question.id,
                );
                return (
                  <div key={question.id} className="flex flex-col gap-2">
                    <h5 className="pt-3 text-base font-semibold">
                      {getContent(question.title[selectedLanguage])}
                    </h5>
                    {response ? (
                      <div className="pb-3">
                        {(() => {
                          switch (question.type) {
                            case Q.Rating:
                              return (
                                <ReadOnlyRating value={Object.values(response?.response)[0]} />
                              );
                            case Q.Smiley:
                              const variant = question?.features?.iconStyle?.variant;
                              if (
                                variant &&
                                [SmileyVariantStyle.Custom, SmileyVariantStyle.Emojis].includes(
                                  variant,
                                )
                              )
                                return getCustomSmileyIcon(
                                  Object.values(response?.response)[0],
                                  question,
                                );
                              if (!variant || SmileyVariantStyle.Default)
                                return (
                                  <NextImage
                                    src={getDefaultSmileySrc(
                                      getNumericValue(Object.values(response?.response)[0]),
                                    )}
                                    alt={"smiley icon"}
                                    width={30}
                                    height={30}
                                  />
                                );
                              return mapSmileyIcon(
                                Object.values(response?.response)[0],
                                surveyThemeData?.surveyTheme?.input?.primaryColor,
                              );
                            case Q.Photo:
                              const img = Object.values(response?.response)[0];
                              const imgUrl = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${img}`;
                              return img ? (
                                <img src={imgUrl} alt="" className="max-w-[240px] rounded-md" />
                              ) : (
                                <span className="pb-3 text-xs text-muted-foreground">
                                  {translations("... not answered...")}
                                </span>
                              );
                            case Q.MSQ:
                              const responses = Object.values(response?.response)[0];
                              if (Array.isArray(responses)) {
                                return responses.map((item, index) => {
                                  return (
                                    <li key={index}>
                                      {item?.value ||
                                        `${question?.features?.[selectedLanguage]?.other?.title}: ${item?.other}`}
                                    </li>
                                  );
                                });
                              }
                              return <li>{responses}</li>;

                            case Q.DDMS:
                              const responseData = Object.values(response?.response)[0];
                              if (Array.isArray(responseData)) {
                                return responseData.map((item, index) => {
                                  return <li key={index}>{item?.value}</li>;
                                });
                              }
                              return <li>{responseData}</li>;

                            case Q.Date:
                              return dayjs(Object.values(response?.response)[0]).format(
                                "DD, MMM , YYYY",
                              );

                            case Q.Testimonial:
                              const data = Object.values(response?.response)[0];
                              return (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="font-normal">{translations("Name: ")}</span>
                                    <span className="font-light">{data.name}</span>
                                  </div>
                                  {data.jobTitle && (
                                    <div className="-mt-2.5 flex items-center gap-1">
                                      <span className="font-normal">
                                        {translations("Job Title: ")}
                                      </span>
                                      <span className="font-light">{data.jobTitle}</span>
                                    </div>
                                  )}
                                  <div className="-mt-2.5 flex items-center gap-1">
                                    <span className="font-normal">
                                      {translations("Testimonial: ")}
                                    </span>
                                    <span className="font-light">{data.testimonial}</span>
                                  </div>
                                  {data.rating && <ReadOnlyRating value={data.rating} />}
                                  {data.photo && (
                                    <img
                                      src={getFileUrlFromKey(data?.photo)}
                                      alt=""
                                      className="max-w-[240px] rounded-md"
                                    />
                                  )}
                                </div>
                              );

                            case Q.EmailPhone:
                              const contact = Object.values(response?.response)[0];
                              return (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="font-normal">{translations("Email: ")}</span>
                                    <span className="font-light">{contact.email}</span>
                                  </div>
                                  <div className="-mt-2.5 flex items-center gap-1">
                                    <span className="font-normal">{translations("Phone: ")}</span>
                                    <span className="font-light">{contact.phone}</span>
                                  </div>
                                </div>
                              );

                            case Q.MCQ:
                              const selectedValue = Object.values(response?.response)[0];
                              return (
                                <span>
                                  {selectedValue?.value ||
                                    `${question?.features?.[selectedLanguage]?.other?.title}: ${selectedValue?.other}`}
                                </span>
                              );

                            case Q.CustomNPS:
                            case Q.DDSS:
                              const selectedChoice = Object.values(response?.response)[0];
                              return <span>{selectedChoice?.value}</span>;
                            case Q.PCQ:
                              const selectedPictureChoice = Object.values(response?.response)?.[0]
                                ?.value;
                              return (
                                <div className="flex flex-col items-center gap-0">
                                  <img
                                    src={getFileUrlFromKey(selectedPictureChoice?.image)}
                                    alt=""
                                    className="w-[50px]"
                                    style={{ aspectRatio: "4 / 3" }}
                                  />
                                  <span>{selectedPictureChoice?.value}</span>
                                </div>
                              );
                            case Q.Contact:
                            case Q.Phone:
                            case Q.Email:
                              const res = Object.values(response?.response)[0];
                              return (
                                <div className="flex flex-col gap-2">
                                  {res?.name && (
                                    <div className="flex items-center gap-1">
                                      <span className="font-normal">{translations("Name: ")}</span>
                                      <span className="font-light">{res?.name}</span>
                                    </div>
                                  )}
                                  {res?.phone && (
                                    <div className="flex items-center gap-1">
                                      <span className="font-normal">{translations("Phone: ")}</span>
                                      <span className="font-light">{res?.phone}</span>
                                    </div>
                                  )}
                                  {res?.email && (
                                    <div className="flex items-center gap-1">
                                      <span className="font-normal">{translations("Email: ")}</span>
                                      <span className="font-light">{res?.email}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            case Q.MultiTextInput:
                              const answers = Object.values(response?.response)[0];
                              if (!answers) return null;
                              return (
                                <div className="flex flex-col gap-2">
                                  {Object.values(answers).map((ad, index: number) => {
                                    return (
                                      <span className="font-light" key={index}>
                                        {ad}
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            case Q.MCQGrid:
                              const results = Object.values(response?.response)[0];
                              return (
                                <div className="flex flex-col gap-2">
                                  {Object.entries(results).map(([q, res]: unknown) => {
                                    return (
                                      <span className="font-light" key={q}>
                                        {q}: {res?.value}
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            default:
                              return JSON.stringify(Object.values(response?.response)[0]);
                          }
                        })()}
                      </div>
                    ) : (
                      <span className="pb-3 text-xs text-muted-foreground">
                        {translations("... not answered...")}
                      </span>
                    )}
                    <Separator />
                  </div>
                );
              })}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            className="rounded-full"
            size={largeScreen ? "lg" : "xs"}
            onClick={close}
          >
            <IconChevronLeft data-icon="inline-start" />
          </Button>

          <Button
            className="rounded-full"
            size={largeScreen ? "lg" : "xs"}
            disabled={isSavingResponses}
            onClick={finishSurvey}
          >
            {isSavingResponses && <Spinner data-icon="inline-start" />}
            <IconCheck data-icon="inline-start" />
            {translations("Confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmResponsesModal;

const getContent = (title: string | boolean) => {
  if (typeof title === "boolean") return title?.toString();
  else if (isHtml(title)) return extractText(title);
  else return title;
};
