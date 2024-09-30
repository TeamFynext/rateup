import React, { useContext, useEffect } from "react";

import { Group, Image, Paper, Rating, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";

import useTranslations from "@/dictionaries/useTranslation";

import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionType as Q } from "../../../types/enums";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { OpinionScaleForm } from "../../Survey/TakeSurvey/TakeSurveyComponent/QuestionForms/OpinionScaleForm";
import { mapSmileyIcon } from "../../Survey/TakeSurvey/TakeSurveyComponent/SmileyRating";

const SurveyResponsesView = ({
  question,
  response,
  type,
  no,
}: {
  question: any;
  response: QuestionResponse;
  type: string;
  no: number;
}) => {
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const { translations } = useTranslations();
  return (
    <PaperLayout
      hoveractive
      maw={600}
      miw={400}
      p="md"
      shadow="lg"
      radius="lg"
      mt="md"
      m="xs"
    >
      <Group>
        <Title order={5} style={{ maxWidth: "400px" }}>
          {translations["Question"]} {no} :{" "}
        </Title>
        <Title order={5} style={{ maxWidth: "400px" }}>
          {question?.title}
        </Title>
      </Group>

      <Paper
        style={{ background: "#F3F3F3" }}
        mah={500}
        maw={600}
        miw={400}
        mt="sm"
        p="md"
        shadow="0"
        radius="lg"
      >
        <Stack ml="10px">
          {response ? (
            <Text>
              {(() => {
                switch (type) {
                  case Q.Rating:
                    return (
                      <Rating
                        value={Object.values(response?.response)[0]}
                        readOnly
                      />
                    );
                  case Q.Smiley:
                    return mapSmileyIcon(
                      Object.values(response?.response)[0],
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
                        {translations["... not answered..."]}
                      </Text>
                    );
                  case Q.MSQ:
                  case Q.DDMS:
                    const responseData = Object.values(response?.response)[0];
                    if (Array.isArray(responseData)) {
                      return responseData.map((item, index) => {
                        return (
                          <li key={index}>
                            {item?.value ||
                              `${question?.features?.[selectedLanguage || defaultLanguage].other?.title}: ${item?.other}`}
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
                          <Text fw="400">{translations["Name: "]}</Text>{" "}
                          <Text fw="300">{data.name}</Text>{" "}
                        </Group>
                        {data.jobTitle && (
                          <Group mt="-10px">
                            <Text fw={"400"}>
                              {translations["Job Title: "]}
                            </Text>
                            <Text fw="300">{data.jobTitle}</Text>
                          </Group>
                        )}
                        <Group mt="-10px">
                          <Text fw="400">{translations["Testimonial: "]}</Text>{" "}
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
                    let selectedValue = Object.values(response?.response)[0];
                    return (
                      <Text>
                        {selectedValue?.value ||
                          `${question?.features?.[selectedLanguage || defaultLanguage].other?.title}: ${selectedValue?.other}`}
                      </Text>
                    );
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
                            <Text fw="400">{translations["Name: "]}</Text>
                            <Text fw="300">{res?.name}</Text>
                          </Group>
                        )}
                        {res?.phone && (
                          <Group>
                            <Text fw="400">{translations["Phone: "]}</Text>
                            <Text fw="300">{res?.phone}</Text>
                          </Group>
                        )}
                        {res?.email && (
                          <Group>
                            <Text fw="400">{translations["Email: "]}</Text>
                            <Text fw="300">{res?.email}</Text>
                          </Group>
                        )}
                      </Stack>
                    );
                  case Q.Opinion:
                    return (
                      <OpinionScaleForm
                        initValue={Object.values(response?.response)[0]}
                      />
                    );
                  default:
                    return JSON.stringify(Object.values(response?.response)[0])
                      .replace(/"/g, "")
                      .replace(/,/g, ", ");
                }
              })()}
            </Text>
          ) : (
            <Text c="dark.0" fz="xs">
              {translations["... not answered..."]}
            </Text>
          )}
        </Stack>
      </Paper>
    </PaperLayout>
  );
};

export default SurveyResponsesView;
