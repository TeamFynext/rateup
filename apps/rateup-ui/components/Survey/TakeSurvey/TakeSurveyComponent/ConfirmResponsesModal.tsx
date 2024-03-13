// @ts-nocheck

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
import {
  RateupButtonBlackOutline,
  RateupButtonBlue,
} from "../../../Button/RateupButtons";
import { QuestionType as Q } from "../../../../types/enums";
import { IconChevronLeft } from "@tabler/icons-react";
import { IconCheck } from "@tabler/icons-react";
import styles from "./TakeSurvey.module.css";
import modalStyles from "./ModalStyles.module.css";
import { mapSmileyIcon } from "./SmileyRating";
import dayjs from "dayjs";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";

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

  return (
    <Modal
      className={styles["modal"]}
      opened={opened}
      title="Confirm your responses"
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
              const response = responses.find(
                (response) => response.questionId === question.id,
              );
              return (
                <Stack key={question.id}>
                  <Title pt="sm" order={5}>
                    {question.title[selectedLanguage]}
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
                                ... not answered...{" "}
                              </Text>
                            );
                          case Q.MSQ:
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
                                  <Text fw="400">Name: </Text>{" "}
                                  <Text fw="300">{data.name}</Text>{" "}
                                </Group>
                                {data.jobTitle && (
                                  <Group mt="-10px">
                                    <Text fw={"400"}>Job Title: </Text>
                                    <Text fw="300">{data.jobTitle}</Text>
                                  </Group>
                                )}
                                <Group mt="-10px">
                                  <Text fw="400">Testimonial: </Text>{" "}
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
                            let selectedValue = Object.values(
                              response?.response,
                            )[0];
                            return (
                              <Text>
                                {selectedValue?.value ||
                                  `Other: ${selectedValue?.other}`}
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
                                    <Text fw="400">Name: </Text>
                                    <Text fw="300">{res?.name}</Text>
                                  </Group>
                                )}
                                {res?.phone && (
                                  <Group>
                                    <Text fw="400">Phone: </Text>
                                    <Text fw="300">{res?.phone}</Text>
                                  </Group>
                                )}
                                {res?.email && (
                                  <Group>
                                    <Text fw="400">Email: </Text>
                                    <Text fw="300">{res?.email}</Text>
                                  </Group>
                                )}
                              </Stack>
                            );
                          case Q.Address:
                            const address = Object.values(
                              response?.response,
                            )[0];
                            return (
                              <Stack>
                                <Group>
                                  <Text fw="400">Adress 1: </Text>
                                  <Text fw="300">{address?.address1}</Text>
                                </Group>
                                <Group>
                                  <Text fw="400">Address 2: </Text>
                                  <Text fw="300">{address?.address2}</Text>
                                </Group>
                                <Group>
                                  <Text fw="400">City: </Text>
                                  <Text fw="300">{address?.city}</Text>
                                </Group>
                                <Group>
                                  <Text fw="400">Postal Code: </Text>
                                  <Text fw="300">{address?.postalCode}</Text>
                                </Group>
                                <Group>
                                  <Text fw="400">Country: </Text>
                                  <Text fw="300">{address?.country}</Text>
                                </Group>
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
                      ... not answered...{" "}
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
          title={"Confirm"}
          size={largeScreen ? "lg" : "xs"}
          leftIcon={<IconCheck />}
          onClick={finishSurvey}
        />
      </Flex>
    </Modal>
  );
}

export default ConfirmResponsesModal;
