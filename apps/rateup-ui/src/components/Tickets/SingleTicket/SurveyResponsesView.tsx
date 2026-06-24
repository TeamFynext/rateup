import dayjs from "dayjs";
import parse from "html-react-parser";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { QuestionType as Q, QuestionType2 } from "@/types/enums.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { SmileyResponseMap } from "@/utils/whatsapp/enumMap.ts";

import { OpinionScaleForm } from "../../Survey/TakeSurvey/TakeSurveyComponent/QuestionForms/OpinionScaleForm.tsx";
import { mapSmileyIcon } from "../../Survey/TakeSurvey/TakeSurveyComponent/SmileyRating";

const ReadOnlyRating = ({ value }: { value: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= value ? "fill-current text-yellow-500" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
};

const SurveyResponsesView = ({
  question,
  response,
  type,
  no,
  language,
}: {
  question: any;
  response: QuestionResponse;
  type: string;
  no: number;
  language: string;
}) => {
  const { t: translations } = useTranslation();

  return (
    <>
      <div className="flex items-start gap-2">
        <Badge>{no}</Badge>

        <div className="max-w-[400px] text-sm">
          {parse(question?.title?.[language] || question?.title || "")}
        </div>
      </div>

      <div className="ml-2 mt-2 flex flex-col gap-3">
        {response ? (
          <>
            {(() => {
              switch (type) {
                case Q.Rating:
                  return (
                    <ReadOnlyRating
                      value={
                        typeof response?.response !== "string"
                          ? Number(Object.values(response?.response)[0])
                          : Number(response?.response)
                      }
                    />
                  );

                case Q.Smiley:
                  return mapSmileyIcon(
                    typeof response?.response !== "string"
                      ? Object.values(response?.response)[0]
                      : SmileyResponseMap[Number(response?.response)],
                    "blue",
                  );

                case Q.Photo: {
                  const img = Object.values(response?.response)[0];
                  const imgUrl = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${img}`;

                  return img ? (
                    <img src={imgUrl} alt="" className="max-w-[240px] rounded-md" />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {translations("... not answered...")}
                    </p>
                  );
                }

                case Q.MSQ:
                case Q.DDMS:
                case QuestionType2.ChipsSelector: {
                  const responseData = Array.isArray(response?.response)
                    ? response?.response
                    : Object.values(response?.response)[0];

                  if (Array.isArray(responseData)) {
                    return (
                      <ul className="list-disc pl-5">
                        {responseData.map((item) => {
                          const choices = question?.choices?.[language] ?? question?.choices;

                          const choice = choices?.find((c: any) => c.id === item);

                          return <li key={choice?.title}>{choice?.title || item?.value}</li>;
                        })}
                      </ul>
                    );
                  }

                  return (
                    <ul className="list-disc pl-5">
                      <li>{responseData}</li>
                    </ul>
                  );
                }

                case Q.Date:
                  return (
                    <p>{dayjs(Object.values(response?.response)[0]).format("DD, MMM, YYYY")}</p>
                  );

                case Q.Testimonial: {
                  const data = Object.values(response?.response)[0];

                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <span className="font-medium">{translations("Name: ")}</span>
                        <span>{data.name}</span>
                      </div>

                      {data.jobTitle && (
                        <div className="flex gap-2">
                          <span className="font-medium">{translations("Job Title: ")}</span>
                          <span>{data.jobTitle}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <span className="font-medium">{translations("Testimonial: ")}</span>
                        <span>{data.testimonial}</span>
                      </div>

                      {data.rating && <ReadOnlyRating value={data.rating} />}

                      {data.photo && (
                        <img
                          src={getFileUrlFromKey(data.photo)}
                          alt=""
                          className="max-w-[240px] rounded-md"
                        />
                      )}
                    </div>
                  );
                }

                case Q.EmailPhone: {
                  const contact = Object.values(response?.response)[0];

                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <span className="font-medium">Email:</span>
                        <span>{contact.email}</span>
                      </div>

                      <div className="flex gap-2">
                        <span className="font-medium">Phone:</span>
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  );
                }

                case Q.MCQ:
                case QuestionType2.RadioButtonsGroup:
                case QuestionType2.Dropdown: {
                  const selectedValue =
                    typeof response?.response !== "string"
                      ? Object.values(response?.response)[0]
                      : response?.response;

                  const choices = question?.choices?.[language] ?? question?.choices;

                  const choice = choices?.find((c: any) => c.id === selectedValue);

                  return <p>{choice?.title || selectedValue?.value}</p>;
                }

                case Q.CustomNPS:
                case Q.DDSS: {
                  const selectedChoice = Object.values(response?.response)[0];

                  return <p>{selectedChoice?.value}</p>;
                }

                case Q.PCQ: {
                  const selectedPictureChoice = Object.values(response?.response)?.[0]?.value;

                  return (
                    <div className="flex flex-col items-center gap-0">
                      <img
                        src={getFileUrlFromKey(selectedPictureChoice?.image)}
                        alt=""
                        className="aspect-[4/3] w-[50px] object-cover"
                      />

                      <p>{selectedPictureChoice?.value}</p>
                    </div>
                  );
                }

                case Q.Contact:
                case Q.Phone:
                case Q.Email: {
                  const res = Object.values(response?.response)[0];

                  return (
                    <div className="flex flex-col gap-2">
                      {res?.name && (
                        <div className="flex gap-2">
                          <span className="font-medium">{translations("Name: ")}</span>
                          <span>{res.name}</span>
                        </div>
                      )}

                      {res?.phone && (
                        <div className="flex gap-2">
                          <span className="font-medium">{translations("Phone: ")}</span>
                          <span>{res.phone}</span>
                        </div>
                      )}

                      {res?.email && (
                        <div className="flex gap-2">
                          <span className="font-medium">{translations("Email: ")}</span>
                          <span>{res.email}</span>
                        </div>
                      )}
                    </div>
                  );
                }

                case Q.Opinion:
                  return (
                    <OpinionScaleForm
                      initValue={
                        typeof response?.response !== "string"
                          ? Object.values(response?.response)[0]
                          : Number(response?.response)
                      }
                    />
                  );

                default:
                  return (
                    <p>
                      {typeof response?.response !== "string"
                        ? JSON.stringify(Object.values(response?.response)[0])
                            .replace(/"/g, "")
                            .replace(/,/g, ", ")
                        : response?.response}
                    </p>
                  );
              }
            })()}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{translations("... not answered...")}</p>
        )}
      </div>
    </>
  );
};

export default SurveyResponsesView;
