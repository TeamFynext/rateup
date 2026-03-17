"use client";

import NextImage from "next/image";

import {
  Divider,
  Flex,
  Group,
  Image,
  Modal,
  Rating,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { IconCheck, IconChevronLeft } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useExtracted } from "next-intl";

import { QuestionType as Q } from "../../../../types/enums";
import { extractText, isHtml } from "../../../../utils";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";
import {
  RateupButtonBlackOutline,
  RateupButtonBlue,
} from "../../../Button/RateupButtons";
import { SmileyVariantStyle } from "../../Question/QuestionExtraProps/SmileyExtraProps";
import modalStyles from "./ModalStyles.module.css";
import {
  getCustomSmileyIcon,
  getNumericValue,
  mapSmileyIcon,
} from "./SmileyRating";
import { getDefaultSmileySrc } from "./SmileyRating/SmileyRatingStyling";
import styles from "./TakeSurvey.module.css";

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
}) {
  const theme = useMantineTheme();
  const translations = useExtracted();
  return (
    <Modal
      className={styles["modal"]}
      opened={opened}
      title={translations("Confirm your responses")}
      centered
      onClose={close}
      overlayProps={{
        color: theme.colors.gray[2],
        opacity: 0.55,
        blur: 3,
        className: styles["modal-overlay"],
      }}
      classNames={modalStyles}
      styles={{
        content: { background: "white" },
      }}
    >
      <Flex className={modalStyles["modal-body-content-container"]}>
        <Stack pb="xl">
          {survey.questions
            .filter((q) => questionsHistory.includes(q.id))
            .map((question) => {
              const response: QuestionResponse = responses.find(
                (response) => response.questionId === question.id,
              );
              return (
                <Stack key={question.id}>
                  <Title pt="sm" order={5}>
                    {getContent(question.title[selectedLanguage])}
                  </Title>
                  {response ? (
                    <Text pb="sm">
                      {(() => {
                        switch (question.type) {
                          case Q.Rating:
                            return (
                              <Rating
                                value={Object.values(response?.response)[0]}
                                readOnly
                              />
                            );
                          case Q.Smiley:
                            const variant =
                              question?.features?.iconStyle?.variant;
                            if (
                              variant &&
                              [
                                SmileyVariantStyle.Custom,
                                SmileyVariantStyle.Emojis,
                              ].includes(variant)
                            )
                              return getCustomSmileyIcon(
                                Object.values(response?.response)[0],
                                question,
                              );
                            if (!variant || SmileyVariantStyle.Default)
                              return (
                                <NextImage
                                  src={getDefaultSmileySrc(
                                    getNumericValue(
                                      Object.values(response?.response)[0],
                                    ),
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
                            const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${img}`;
                            return img ? (
                              <Image
                                radius="md"
                                maw={240}
                                mx="0px"
                                src={imgUrl}
                              />
                            ) : (
                              <Text pb="sm" c="dark.0" fz="xs">
                                {translations("... not answered...")}
                              </Text>
                            );
                          case Q.MSQ:
                            const responses = Object.values(
                              response?.response,
                            )[0];
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
                            const responseData = Object.values(
                              response?.response,
                            )[0];
                            if (Array.isArray(responseData)) {
                              return responseData.map((item, index) => {
                                return <li key={index}>{item?.value}</li>;
                              });
                            }
                            return <li>{responseData}</li>;

                          case Q.Date:
                            return dayjs(
                              Object.values(response?.response)[0],
                            ).format("DD, MMM , YYYY");

                          case Q.Testimonial:
                            const data = Object.values(response?.response)[0];
                            return (
                              <Stack>
                                <Group>
                                  <Text fw="400">{translations("Name: ")}</Text>
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
                                  <Text fw="400">
                                    {translations("Testimonial: ")}
                                  </Text>{" "}
                                  <Text fw="300">{data.testimonial}</Text>{" "}
                                </Group>
                                {data.rating && (
                                  <Rating value={data.rating} readOnly />
                                )}
                                {data.photo && (
                                  <Image
                                    src={getFileUrlFromKey(data?.photo)}
                                    radius="md"
                                    maw={240}
                                    mx="0px"
                                  />
                                )}
                              </Stack>
                            );

                          case Q.EmailPhone:
                            const contact = Object.values(
                              response?.response,
                            )[0];
                            return (
                              <Stack>
                                <Group>
                                  <Text fw="400">
                                    {translations("Email: ")}
                                  </Text>{" "}
                                  <Text fw="300">{contact.email}</Text>{" "}
                                </Group>
                                <Group mt="-10px">
                                  <Text fw="400">
                                    {translations("Phone: ")}
                                  </Text>{" "}
                                  <Text fw="300">{contact.phone}</Text>{" "}
                                </Group>
                              </Stack>
                            );

                          case Q.MCQ:
                            let selectedValue = Object.values(
                              response?.response,
                            )[0];
                            return (
                              <Text>
                                {selectedValue?.value ||
                                  `${question?.features?.[selectedLanguage]?.other?.title}: ${selectedValue?.other}`}
                              </Text>
                            );

                          case Q.CustomNPS:
                          case Q.DDSS:
                            let selectedChoice = Object.values(
                              response?.response,
                            )[0];
                            return <Text>{selectedChoice?.value}</Text>;
                          case Q.PCQ:
                            let selectedPictureChoice = Object.values(
                              response?.response,
                            )?.[0]?.value;
                            return (
                              <Stack gap={0} align="center">
                                <Image
                                  src={getFileUrlFromKey(
                                    selectedPictureChoice?.image,
                                  )}
                                  w={50}
                                  style={{ aspectRatio: 4 / 3 }}
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
                                    <Text fw="400">
                                      {translations("Name: ")}
                                    </Text>
                                    <Text fw="300">{res?.name}</Text>
                                  </Group>
                                )}
                                {res?.phone && (
                                  <Group>
                                    <Text fw="400">
                                      {translations("Phone: ")}
                                    </Text>
                                    <Text fw="300">{res?.phone}</Text>
                                  </Group>
                                )}
                                {res?.email && (
                                  <Group>
                                    <Text fw="400">
                                      {translations("Email: ")}
                                    </Text>
                                    <Text fw="300">{res?.email}</Text>
                                  </Group>
                                )}
                              </Stack>
                            );
                          case Q.MultiTextInput:
                            const answers = Object.values(
                              response?.response,
                            )[0];
                            if (!answers) return null;
                            return (
                              <Stack>
                                {Object.values(answers).map(
                                  (ad: any, index: number) => {
                                    return (
                                      <Text fw="300" key={index}>
                                        {ad}
                                      </Text>
                                    );
                                  },
                                )}
                              </Stack>
                            );
                          case Q.MCQGrid:
                            const results = Object.values(
                              response?.response,
                            )[0];
                            return (
                              <Stack>
                                {Object.entries(results).map(
                                  ([q, res]: any) => {
                                    return (
                                      <Text fw="300" key={q}>
                                        {q}: {res?.value}
                                      </Text>
                                    );
                                  },
                                )}
                              </Stack>
                            );
                          default:
                            return JSON.stringify(
                              Object.values(response?.response)[0],
                            );
                        }
                      })()}
                    </Text>
                  ) : (
                    <Text pb="sm" c="dark.0" fz="xs">
                      {translations("... not answered...")}
                    </Text>
                  )}
                  <Divider />
                </Stack>
              );
            })}
        </Stack>
      </Flex>
      <Flex className={modalStyles["modal-footer-container"]}>
        <RateupButtonBlackOutline
          radius={"xl"}
          title=""
          size={largeScreen ? "lg" : "xs"}
          onClick={close}
          leftIcon={<IconChevronLeft />}
        />

        <RateupButtonBlue
          loading={isSavingResponses}
          radius={"xl"}
          title={translations("Confirm")}
          size={largeScreen ? "lg" : "xs"}
          leftIcon={<IconCheck />}
          onClick={finishSurvey}
        />
      </Flex>
    </Modal>
  );
}

export default ConfirmResponsesModal;

const getContent = (title: string | boolean) => {
  if (typeof title === "boolean") return title?.toString();
  else if (isHtml(title)) return extractText(title);
  else return title;
};
