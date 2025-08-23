import React from "react";

import { Badge, Group, Image, Rating, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import parse from "html-react-parser";
import { useTranslations } from "next-intl";

import { SmileyResponseMap } from "@/utils/whatsapp/enumMap";

import { QuestionType as Q, QuestionType2 } from "../../../types/enums";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { OpinionScaleForm } from "../../Survey/TakeSurvey/TakeSurveyComponent/QuestionForms/OpinionScaleForm";
import { mapSmileyIcon } from "../../Survey/TakeSurvey/TakeSurveyComponent/SmileyRating";

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
  const translations = useTranslations();
  return (
    <>
      <Group>
        <Badge variant="filled">{no}</Badge>
        <Text size="sm" style={{ maxWidth: "400px" }}>
          {parse(question?.title?.[language] || question?.title || "")}
        </Text>
      </Group>
      <>
        <Stack ml="10px">
          {response ? (
            <Text>
              {(() => {
                switch (type) {
                  case Q.Rating:
                    return (
                      <Rating
                        value={
                          typeof response?.response !== "string"
                            ? Object.values(response?.response)[0]
                            : Number(response?.response)
                        }
                        readOnly
                      />
                    );
                  case Q.Smiley:
                    return mapSmileyIcon(
                      typeof response?.response !== "string"
                        ? Object.values(response?.response)[0]
                        : SmileyResponseMap[Number(response?.response)],
                      "blue",
                      // surveyThemeData?.surveyTheme?.input
                      //   ?.primaryColor,
                    );
                  case Q.Photo:
                    const img = Object.values(response?.response)[0];
                    const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${img}`;
                    return img ? (
                      <Image radius="md" maw={240} mx="0px" src={imgUrl} />
                    ) : (
                      <Text pb="sm" c="dark.0" fz="xs">
                        {translations("... not answered...")}
                      </Text>
                    );
                  case Q.MSQ:
                  case Q.DDMS:
                  case QuestionType2.ChipsSelector:
                    const responseData = Array.isArray(response?.response)
                      ? response?.response
                      : Object.values(response?.response)[0];
                    if (Array.isArray(responseData)) {
                      return responseData.map((item, index) => {
                        const choices =
                          question?.choices?.[language] ?? question?.choices;
                        const choice = choices?.find((c) => c.id === item);
                        return (
                          <li key={choice?.title}>
                            {choice?.title || item?.value}
                          </li>
                        );
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
                      <Stack>
                        <Group>
                          <Text fw="400">{translations("Name: ")}</Text>{" "}
                          <Text fw="300">{data.name}</Text>{" "}
                        </Group>
                        {data.jobTitle && (
                          <Group mt="-10px">
                            <Text fw={"400"}>
                              {translations("Job Title: ")}
                            </Text>
                            <Text fw="300">{data.jobTitle}</Text>
                          </Group>
                        )}
                        <Group mt="-10px">
                          <Text fw="400">{translations("Testimonial: ")}</Text>{" "}
                          <Text fw="300">{data.testimonial}</Text>{" "}
                        </Group>
                        {data.rating && <Rating value={data.rating} readOnly />}
                        {data.photo && (
                          <Image
                            src={getFileUrlFromKey(data?.photo)}
                            radius="md"
                            maw={240}
                            mx="0px"
                            alt=""
                          />
                        )}
                      </Stack>
                    );

                  case Q.EmailPhone:
                    const contact = Object.values(response?.response)[0];
                    return (
                      <Stack>
                        <Group>
                          <Text fw="400">Email: </Text>{" "}
                          <Text fw="300">{contact.email}</Text>{" "}
                        </Group>
                        <Group mt="-10px">
                          <Text fw="400">Phone: </Text>{" "}
                          <Text fw="300">{contact.phone}</Text>{" "}
                        </Group>
                      </Stack>
                    );
                  case Q.MCQ:
                  case QuestionType2.RadioButtonsGroup:
                  case QuestionType2.Dropdown:
                    let selectedValue =
                      typeof response?.response !== "string"
                        ? Object.values(response?.response)[0]
                        : response?.response;
                    const choices =
                      question?.choices?.[language] ?? question?.choices;
                    const choice = choices?.find((c) => c.id === selectedValue);
                    return <Text>{choice?.title || selectedValue?.value}</Text>;
                  case Q.CustomNPS:
                  case Q.DDSS:
                    let selectedChoice = Object.values(response?.response)[0];
                    return <Text>{selectedChoice?.value}</Text>;
                  case Q.PCQ:
                    let selectedPictureChoice = Object.values(
                      response?.response,
                    )?.[0]?.value;
                    return (
                      <Stack gap={0} align="center">
                        <Image
                          src={getFileUrlFromKey(selectedPictureChoice?.image)}
                          w={50}
                          style={{ aspectRatio: 4 / 3 }}
                          alt=""
                        />
                        <Text>{selectedPictureChoice?.value}</Text>
                      </Stack>
                    );
                  case Q.Contact:
                  case Q.Phone:
                  case Q.Email:
                    const res = Object.values(response?.response)[0];
                    return (
                      <Stack>
                        {res?.name && (
                          <Group>
                            <Text fw="400">{translations("Name: ")}</Text>
                            <Text fw="300">{res?.name}</Text>
                          </Group>
                        )}
                        {res?.phone && (
                          <Group>
                            <Text fw="400">{translations("Phone: ")}</Text>
                            <Text fw="300">{res?.phone}</Text>
                          </Group>
                        )}
                        {res?.email && (
                          <Group>
                            <Text fw="400">{translations("Email: ")}</Text>
                            <Text fw="300">{res?.email}</Text>
                          </Group>
                        )}
                      </Stack>
                    );
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
                    return typeof response?.response !== "string"
                      ? JSON.stringify(Object.values(response?.response)[0])
                          .replace(/"/g, "")
                          .replace(/,/g, ", ")
                      : response?.response;
                }
              })()}
            </Text>
          ) : (
            <Text c="dark.0" fz="xs">
              {translations("... not answered...")}
            </Text>
          )}
        </Stack>
      </>
    </>
  );
};

export default SurveyResponsesView;
